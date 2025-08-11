from rpy2 import robjects
from rpy2.robjects import pandas2ri, numpy2ri
import logging
from rpy2.rinterface_lib.callbacks import logger as rpy2_logger
import os
from prefect import flow, task
from prefect.logging import get_run_logger

from .types import PhenotypeOptionsType

from _shared_flow_utils.types import UserType
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.PhenotypeAPI import PhenotypeAPI

os.environ['plugin_name'] = 'phenotype_plugin'

@task(log_prints=True)
def validate_integer_string(input_string: str) -> bool:
    """
    Validates that the input string contains only comma-separated integers.
    
    Args:
        input_string (str): A string containing comma-separated integers or 'default'. 
        Example: '3,4,25' or 'default'
        
    Returns:
        bool: True if validation passes
    """
    logger = get_run_logger()
    if input_string == 'default':
        logger.info("Cohorts ID is set to 'default', retrieving all cohorts from the Phenotype.")
        logger.warning("Cohort 921 is not supported currently, it will be skipped.")
        return True
    else:
        input_string = input_string.strip()
        logger = get_run_logger()
        numbers = input_string.split(',')
        for num in numbers:
            num = num.strip()  # Remove any surrounding whitespace
            if not num.isdigit():
                error_message = f"""Input CohortsId: {input_string} is not supported, use ',' as seperator, e.g.: '3,4,25' """
                logger.error(error_message)
                raise ValueError(error_message)
            if num.strip() == '921':
                logger.warning("Cohort 921 is not supported currently, it will be skipped.")
        return True
    
@task(log_prints=True)
def get_cohort_definitions(cohorts_id: str, vocabschema_name: str) -> dict:
    """
    Retrieve cohort definitions from the Phenotype Library.
    Args:
        cohorts_id (str): Comma-separated string of cohort IDs or 'default'.
        vocabschema_name (str): The name of the vocabulary schema.
    Returns:
        list: List of cohort definitions with cohortId, cohortName, json, and sql.
    """
    pandas2ri.activate()
    numpy2ri.activate()
    
    # Set cohorts_id string for R
    if cohorts_id == 'default':
        set_cohorts_id_str = "cohorts_id <- 'default'"
    else:
        set_cohorts_id_str = f'cohorts_id <- as.integer(c({cohorts_id}))'
    
    with robjects.conversion.localconverter(robjects.default_converter):
        robjects.r(f'''
            library('PhenotypeLibrary')
            library('CirceR')
            create_cohort_definitionsets <- function(cohorts_ID, vocabschema_name) {{
                # CirceR version 1.1.1 does not support cohort 344, and CirceR version 1.3.3 (currently used) does not support cohort 921
                if (is.character(cohorts_ID) && cohorts_ID == 'default') {{
                    cohorts <- PhenotypeLibrary::getPhenotypeLog()
                    cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(cohorts$cohortId[1:nrow(cohorts)])
                    cohortDefinitionSets <- cohortDefinitionSets[cohortDefinitionSets$cohortId!=921,]
                    for (i in 1:nrow(cohortDefinitionSets)) {{
                        cohortDefinitionSets$sql[i] <- CirceR::buildCohortQuery(cohortDefinitionSets$json[i], options = CirceR::createGenerateOptions(generateStats = TRUE, vocabularySchema = vocabschema_name))
                    }}
                }} else if (class(cohorts_ID) == "integer") {{
                    if (921 %in% cohorts_ID) {{
                        cohorts_ID <- cohorts_ID[cohorts_ID!=921]
                    }}
                    cohortDefinitionSets <- PhenotypeLibrary::getPlCohortDefinitionSet(cohorts_ID)
                    for (i in 1:nrow(cohortDefinitionSets)) {{
                        cohortDefinitionSets$sql[i] <- CirceR::buildCohortQuery(cohortDefinitionSets$json[i], options = CirceR::createGenerateOptions(generateStats = TRUE, vocabularySchema = vocabschema_name))
                    }}
                }}
                return(cohortDefinitionSets)
            }}
            
            vocabschema_name <- '{vocabschema_name}'
            {set_cohorts_id_str}
            
            cohortDefinitionSets <- create_cohort_definitionsets(cohorts_id, vocabschema_name)
            
            # Convert to list for Python consumption
            result_list <- list()
            for(i in 1:nrow(cohortDefinitionSets)) {{
                result_list[[i]] <- list(
                    cohortId = cohortDefinitionSets$cohortId[i],
                    cohortName = cohortDefinitionSets$cohortName[i],
                    json = cohortDefinitionSets$json[i],
                    sql = cohortDefinitionSets$sql[i]
                )
            }}
        ''')
        cohort_definitions_r = robjects.r['cohortDefinitionSets']
        r_result = robjects.r['result_list']
    
        # Convert R result to Python list
        cohort_definitions = []
        for i in range(0, len(r_result)):
            cohort_def = {
                'cohortId': int(r_result[i].rx2('cohortId')[0]),
                'cohortName': str(r_result[i].rx2('cohortName')[0]),
                'json': str(r_result[i].rx2('json')[0]),
                'sql': str(r_result[i].rx2('sql')[0])
            }
            cohort_definitions.append(cohort_def)
        return {"cohort_definitions": cohort_definitions, "cohort_definitions_r": cohort_definitions_r}

@task(log_prints=True)
def create_cohort_definitions(cohort_definitions: list, dataset_id: str, user_name: str) -> list:
    """
    Create cohort definitions using the REST API.
    Args:
        cohort_definitions (list): List of cohort definition dictionaries containing
                                  cohortId, cohortName, json, and sql keys
        dataset_id (str): Unique identifier for the target dataset
        user_name (str): Username of the person creating the cohorts
    
    Returns:
        list: List of API response objects for successfully created cohorts
    
    """
    logger = get_run_logger()
    phenotype_api = PhenotypeAPI()
    created_cohorts = []
    
    for cohort_def in cohort_definitions:
        try:
            result = phenotype_api.create_single_cohort_definition(cohort_def, dataset_id, user_name)
            created_cohorts.append(result)
        except Exception as e:
            error_message = f"Failed to create cohort {cohort_def['cohortId']}: {str(e)}"
            logger.error(error_message)
            raise Exception(error_message) from e
    return created_cohorts

@task(log_prints=True)
def materialize_cohort_definitions(dbdao, cohort_definitions_r, cdmschema_name: str, cohortschema_name: str, cohorttable_name: str, user: UserType):
    """
    Materialize cohort definitions into the database.
    """
    # Setup database connection for R
    set_db_driver_env_string = dbdao.set_db_driver_env()
    set_connection_string = dbdao.get_database_connector_connection_string(user_type=user)
    
    with robjects.conversion.localconverter(robjects.default_converter):
        # Assign the R object to the current R environment
        robjects.r.assign('cohortDefinitionSets', cohort_definitions_r)
        
        robjects.r(f'''
            library('CohortGenerator')
            library('PhenotypeLibrary')
            library('DatabaseConnector')
            {set_db_driver_env_string}
            {set_connection_string}
            
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
            

                CohortGenerator::dropCohortStatsTables(
                connection = connection,
                cohortDatabaseSchema = cohortschema,
                cohortTableNames = cohortTableNames
                )
                return(list(cohortsGenerated=cohortsGenerated, cohortCounts=cohortCounts))
            }}

            create_result_tables <- function(connection, cohortschema, cohort_table_name, cohortDefinitionSets) {{
                cohorts_id <- cohortDefinitionSets$cohortId
                sql <- paste0("SELECT ROW_NUMBER() OVER (ORDER BY SUBJECT_ID, COHORT_DEFINITION_ID) AS phenotype_result_id, SUBJECT_ID as person_id, COHORT_DEFINITION_ID as phenotype_id, cohort_start_date, cohort_end_date FROM ", cohortschema,".", cohort_table_name, " ORDER BY SUBJECT_ID, COHORT_DEFINITION_ID")
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
                    tableName = paste0(cohort_table_name,"_result_all"),
                    data = result_df,
                    createTable = TRUE,
                    tempTable = FALSE
                )
                sql <- paste0("ALTER TABLE ", cohortschema, ".", cohort_table_name, "_result_all ADD PRIMARY KEY (phenotype_result_id);")
                DatabaseConnector::executeSql(connection=connection, sql=sql)

                # Save master table, showHidden=TRUE, display each required cohort in master table
                master_table <- data.frame(getPhenotypeLog(cohorts_id, showHidden=TRUE)) 
                DatabaseConnector::insertTable(
                    connection = connection,
                    databaseSchema = cohortschema,
                    tableName = paste0(cohort_table_name,"_result_master"),
                    data = master_table,
                    createTable = TRUE,
                    tempTable = FALSE
                )
            }}

            connection <- DatabaseConnector::connect(connectionDetails)
            cdmschema <- '{cdmschema_name}'
            cohortschema <- '{cohortschema_name}'
            cohort_table_name <- '{cohorttable_name}'
            cohorts <- create_cohorts(connection, cdmschema, cohortschema, cohort_table_name, cohortDefinitionSets)
            create_result_tables(connection, cohortschema, cohort_table_name, cohortDefinitionSets)
            
            DatabaseConnector::disconnect(connection)
        ''')

@flow(log_prints=True)
def phenotype_plugin(options: PhenotypeOptionsType):
    # Setup rpy2 logger
    logging.basicConfig()
    rpy2_logger.setLevel(logging.DEBUG)
    logger = get_run_logger()
    logger.info('******************* Running Phenotype Plugin *******************')

    database_code = options.database_code
    cdmschema_name = options.cdmschema_name
    cohortschema_name = options.cohortschema_name
    cohorttable_name = 'phenotypes'  # Fixed the prefix of the phenotype result tables
    vocabschema_name = options.vocabschema_name
    cohorts_id = options.cohorts_id
    materialize = options.materialize
    dataset_id = options.dataset_id
    user_name = options.user_name
    use_cache_db = options.use_cache_db
    user = UserType.ADMIN_USER
    
    # Validate cohorts_id if not default
    if not validate_integer_string(cohorts_id):
        error_message = f"Invalid cohorts_id: {cohorts_id}. It should be a comma-separated string of integers or 'default'."
        logger.error(error_message)
        
    coohort_definitions_rst = get_cohort_definitions(
        cohorts_id=cohorts_id,
        vocabschema_name=vocabschema_name
    )
    logger.info("******************* Complete Retrieving Cohort Definition Sets *******************")
    cohort_definitions = coohort_definitions_rst['cohort_definitions']
    cohort_definitions_r = coohort_definitions_rst['cohort_definitions_r']

    if materialize:
        logger.info("Materializing cohort definitions to database")
        # Setup database connection only when needed for materialization
        dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)
        
        materialize_cohort_definitions(
            cohort_definitions_r=cohort_definitions_r,
            dbdao=dbdao,
            cdmschema_name=cdmschema_name,
            cohortschema_name=cohortschema_name,
            cohorttable_name=cohorttable_name,
            user=user
        )
        logger.info("******************* Complete Materializing Cohort *******************")
    else:
        logger.info("Creating cohort definitions")
        created_cohorts = create_cohort_definitions(
            cohort_definitions=cohort_definitions,
            dataset_id=dataset_id,
            user_name = user_name
        )
        logger.info("******************* Complete Creating Cohort Definition Sets *******************")
        logger.info(f'{len(created_cohorts)} cohorts created successfully.')