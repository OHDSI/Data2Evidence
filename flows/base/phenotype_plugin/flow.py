from rpy2 import robjects

from prefect import flow, task
from prefect.variables import Variable
from prefect_shell import ShellOperation
from prefect.logging import get_run_logger

from .types import PhenotypeOptionsType

from _shared_flow_utils.types import UserType
from _shared_flow_utils.dao.DBDao import DBDao
import logging
from rpy2.rinterface_lib.callbacks import logger as rpy2_logger


@task
def validate_integer_string(input_string):
    input_string = input_string.strip()
    logger = get_run_logger()
    numbers = input_string.split(',')
    for num in numbers:
        num = num.strip()  # Remove any surrounding whitespace
        if not num.isdigit():
            error_message = f"""Input CohortsId: {input_string} is not supported, use ',' as seperator, e.g.: '3,4,25' """
            logger.error(error_message)
            raise ValueError(error_message)
    return True

@flow(log_prints=True)
def phenotype_plugin(options: PhenotypeOptionsType):
    # Setup rpy2 logger
    logging.basicConfig()
    rpy2_logger.setLevel(logging.DEBUG)

    logger = get_run_logger()
    logger.info('Running Phenotype')

    database_code = options.databaseCode
    cdmschema_name = options.cdmschemaName
    cohortschema_name = options.cohortschemaName
    cohorttable_name = 'phenotypes' # Fix the prefix of the phenotype result tables
    cohorts_id = options.cohortsId
    vocabschema_name = options.vocabschemaName
    
    if cohorts_id == 'default':
        set_cohorts_id_str = "cohorts_id <- 'default'"
    elif validate_integer_string(cohorts_id):
        set_cohorts_id_str = f'cohorts_id <- as.integer(c({cohorts_id}))'
   
    use_cache_db = options.use_cache_db
    user = UserType.ADMIN_USER

    dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)
    set_db_driver_env_string = dbdao.set_db_driver_env()
    set_connection_string = dbdao.get_database_connector_connection_string(
        user_type=user
    )
   

    with robjects.conversion.localconverter(robjects.default_converter):
        robjects.r(f'''
                print('Start loading library')
                library('CohortGenerator')
                library('PhenotypeLibrary')
                library('DatabaseConnector')
                library('CirceR')
                {set_db_driver_env_string}
                {set_connection_string}

                create_cohort_definitionsets <- function(cohorts_ID, vocabschema_name) {{
                    # For multiple cohorts
                    # CirceR version 1.1.1 does not support cohort 344, and CirceR version 1.3.3 (currently used) does not support cohort 921
                    if (is.character(cohorts_ID) && cohorts_ID == 'default') {{
                        cohorts <- PhenotypeLibrary::getPhenotypeLog()  # showHidden=FALSE
                        cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(cohorts$cohortId[1:nrow(cohorts)])
                        cohortDefinitionSets <- cohortDefinitionSets[cohortDefinitionSets$cohortId!=921,]
                        for (i in 1:nrow(cohortDefinitionSets)) {{
                            cohortDefinitionSets$sql[i] <- CirceR::buildCohortQuery(cohortDefinitionSets$json[i], options = CirceR::createGenerateOptions(generateStats = TRUE, vocabularySchema = vocabschema_name))
                        }}
                        print('Complete creating cohortDefinitionSets')
                    }} else if (class(cohorts_ID) == "integer") {{
                        if (921 %in% cohorts_ID) {{
                            print(paste0(c("Phenotype 921 is not supported currrently, only the following phenotype id will run through:", cohorts_ID), collapse=" "))
                            cohorts_ID <- cohorts_ID[cohorts_ID!=921]
                        }}
                        cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(cohorts_ID)
                        for (i in 1:nrow(cohortDefinitionSets)) {{
                            cohortDefinitionSets$sql[i] <- CirceR::buildCohortQuery(cohortDefinitionSets$json[i], options = CirceR::createGenerateOptions(generateStats = TRUE, vocabularySchema = vocabschema_name))
                        }}
                        print('Complete creating cohortDefinitionSets')
                    }} else {{
                        print('Invalid cohorts_ID, should be either "default" or integer string')
                    }}
                    return(cohortDefinitionSets)
                }}

                create_replica <- function(connection, cohortschema, cohort_table_name) {{
                    # Get table names first
                    getTablesSQL <- paste0("SELECT tablename FROM pg_tables WHERE schemaname = '", cohortschema, "' AND tablename LIKE '", cohort_table_name, "%'")
                    tables <- DatabaseConnector::querySql(connection, getTablesSQL)

                    # Set replica identity for each table individually
                    for(i in 1:nrow(tables)) {{
                        tableName <- tables$TABLENAME[i]
                        replicaSql <- paste0("ALTER TABLE ", cohortschema, ".", tableName, " REPLICA IDENTITY FULL")
                        DatabaseConnector::executeSql(connection, replicaSql)
                    }}
                    print('Complete setting replica identity for phenotype tables')
                }}

                create_cohorts <- function(connection, cdmschema, cohortschema, cohort_table_name, cohortDefinitionSets) {{
                    # Create the cohort tables to hold the cohort generation results
                    cohortTableNames <- CohortGenerator::getCohortTableNames(cohortTable = cohort_table_name)
                    CohortGenerator::createCohortTables(connection = connection,
                                                        cohortDatabaseSchema = cohortschema,
                                                        cohortTableNames = cohortTableNames)
                                        
                    create_replica(connection, cohortschema, cohort_table_name)

                    # Generate the cohorts
                    cohortsGenerated <- CohortGenerator::generateCohortSet(connection = connection,
                                                                        cdmDatabaseSchema = cdmschema,
                                                                        cohortDatabaseSchema = cohortschema,
                                                                        cohortTableNames = cohortTableNames,
                                                                        cohortDefinitionSet = cohortDefinitionSets)

                    # Get the cohort counts
                    cohortCounts <- CohortGenerator::getCohortCounts(connection = connection,
                                                                    cohortDatabaseSchema = cohortschema,
                                                                    cohortTable = cohortTableNames$cohortTable)
                
                    print(cohortCounts)
                    print('Complete generating the cohort tables')

                    print("Dropping tempoary cohort stats tables")
                    CohortGenerator::dropCohortStatsTables(
                    connection = connection,
                    cohortDatabaseSchema = cohortschema,
                    cohortTableNames = cohortTableNames
                    )

                    # Save cohortgenerator result
                    DatabaseConnector::insertTable(
                        connection = connection,
                        databaseSchema = cohortschema,
                        tableName = paste0({{cohort_table_name}}, "_cohortgenerated"),
                        data = cohortsGenerated,
                        createTable = TRUE,
                        tempTable = FALSE
                    )
                    print(paste0("Complete saving cohort table to ", {{cohortschema}}))

                    return(list(cohortsGenerated=cohortsGenerated, cohortCounts=cohortCounts))
                }}

                create_result_tables <- function(connection, cdmschema, cohortschema, cohort_table_name, cohortDefinitionSets) {{
                    cohorts_id <- cohortDefinitionSets$cohortId
                    sql <- paste0("SELECT ROW_NUMBER() OVER (ORDER BY SUBJECT_ID, COHORT_DEFINITION_ID) AS phenotype_result_id, SUBJECT_ID as person_id, COHORT_DEFINITION_ID as phenotype_id, cohort_start_date, cohort_end_date FROM ", {{cohortschema}},".", {{cohort_table_name}}, " ORDER BY SUBJECT_ID, COHORT_DEFINITION_ID")
                    result_df <- DatabaseConnector::querySql(connection=connection, sql=sql)
                    
                    # remove raw cohort tables
                    DatabaseConnector::dbRemoveTable(
                        conn = connection,
                        name = cohort_table_name,
                        databaseSchema = cohortschema
                        )

                    # save result_df
                    DatabaseConnector::insertTable(
                        connection = connection,
                        databaseSchema = cohortschema,
                        tableName = paste0({{cohort_table_name}},"_result_all"),
                        data = result_df,
                        createTable = TRUE,
                        tempTable = FALSE
                    )
                    sql <- paste0("ALTER TABLE ", {{cohortschema}}, ".", {{cohort_table_name}}, "_result_all ADD PRIMARY KEY (phenotype_result_id);")
                    DatabaseConnector::executeSql(connection=connection, sql=sql)

                    # Save master table, showHidden=TRUE, display each required cohort in master table
                    master_table <- data.frame(getPhenotypeLog(cohorts_id, showHidden=TRUE)) 
                    DatabaseConnector::insertTable(
                        connection = connection,
                        databaseSchema = cohortschema,
                        tableName = paste0({{cohort_table_name}},"_result_master"),
                        data = master_table,
                        createTable = TRUE,
                        tempTable = FALSE
                    )
                    print(paste0("Complete saving result table to ", {{cdmschema}}))
                }}

                # Connect to Postgres database using hostname
                connection <- DatabaseConnector::connect(connectionDetails)
                                
                cdmschema <- '{cdmschema_name}'
                cohortschema <- '{cohortschema_name}'
                cohort_table_name <- '{cohorttable_name}'
                vocabschema_name <- '{vocabschema_name}'
                {set_cohorts_id_str}

                cohortDefinitionSets <- create_cohort_definitionsets(cohorts_id, vocabschema_name)
                cohorts <- create_cohorts(connection, cdmschema, cohortschema, cohort_table_name, cohortDefinitionSets)
                create_result_tables(connection, cdmschema, cohortschema, cohort_table_name, cohortDefinitionSets)
                
        ''')

    logger.info('Phenotype done!')