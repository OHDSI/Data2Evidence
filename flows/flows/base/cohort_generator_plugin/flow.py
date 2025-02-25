import json
from rpy2 import robjects

from prefect import flow, task
from prefect.variables import Variable
from prefect_shell import ShellOperation
from prefect.logging import get_run_logger

from flows.cohort_generator_plugin.types import CohortGeneratorOptionsType

from shared_utils.types import UserType
from shared_utils.dao.DBDao import DBDao
from shared_utils.api.AnalyticsSvcAPI import AnalyticsSvcAPI

@task
def setup_plugin():
    r_libs_user_directory = Variable.get("r_libs_user")
    # force=TRUE for fresh install everytime flow is run
    if (r_libs_user_directory):
        ShellOperation(
            commands=[
                f"Rscript -e \"remotes::install_github('OHDSI/CohortGenerator@v0.8.1',quiet=FALSE,upgrade='never',force=TRUE, dependencies=FALSE, lib='{r_libs_user_directory}')\""
            ]).run()
    else:
        raise ValueError("Environment variable: 'R_LIBS_USER' is empty.")



@flow(log_prints=True, persist_result=True)
def cohort_generator_plugin(options: CohortGeneratorOptionsType):
    setup_plugin()
    logger = get_run_logger()
    logger.info('Running Cohort Generator')
        
    database_code = options.databaseCode
    schema_name = options.schemaName
    vocab_schema_name = options.vocabSchemaName
    cohort_json = options.cohortJson
    dataset_id = options.datasetId
    description = options.description
    use_cache_db = options.use_cache_db
    cohort_definition_id = options.cohortDefinitionId

    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code, 
                  schema_name=schema_name)
    
    analytics_svc_api = AnalyticsSvcAPI()
    
    cohort_json_expression = json.dumps(cohort_json.expression)
    cohort_name = cohort_json.name

    # Only create cohort definition if cohort_definition_id is not provided in flow options
    if cohort_definition_id == None:
        cohort_definition_id = create_cohort_definition(
            analytics_svc_api,
            dataset_id,
            description,
            cohort_json_expression,
            cohort_name,
        )

    create_cohort(dbdao,
                  UserType.ADMIN_USER,
                  schema_name,
                  cohort_definition_id,
                  cohort_json_expression,
                  cohort_name, 
                  vocab_schema_name)
    
@task(log_prints=True)
def create_cohort_definition(analytics_svc_api, dataset_id: str, description: str, 
                             cohort_json_expression: str, cohort_name: str):

    result = analytics_svc_api.create_cohort_definition(
        datasetId=dataset_id,
        description=description,
        syntax=cohort_json_expression,
        name=cohort_name
    )
    return result


@task(log_prints=True)
def create_cohort(dbdao, admin_user, schema_name: str, cohort_definition_id: int, 
                  cohort_json_expression: str, cohort_name: str, vocab_schema_name: str):
    
    set_db_driver_env_string = dbdao.set_db_driver_env()
    
    set_connection_string = dbdao.get_database_connector_connection_string(
        user_type=admin_user
    )
   
    r_libs_user_directory = Variable.get("r_libs_user")
    
    with robjects.conversion.localconverter(robjects.default_converter):
        robjects.r(f'''
                .libPaths(c('{r_libs_user_directory}',.libPaths()))
                library('CohortGenerator', lib.loc = '{r_libs_user_directory}')
                {set_db_driver_env_string}
                {set_connection_string}
                cohortJson <- '{cohort_json_expression}'
                schemaName <- '{schema_name}'
                vocabSchemaName <- '{vocab_schema_name}'
                cohortName <- '{cohort_name}'
                cohortId <- '{cohort_definition_id}'
                
                cat("Generating cohort sql from cohort expression from json")
                cohortExpression <- CirceR::cohortExpressionFromJson(cohortJson)
                options <- CirceR::createGenerateOptions(generateStats = FALSE, vocabularySchema = vocabSchemaName);
                cohortSql <- CirceR::buildCohortQuery(cohortExpression, options = options)
                
                cat("Creating tempoary cohort stats table names")
                cohortTableNames <- list()
                cohortTableNames[["cohortTable"]] <- "cohort"
                cohortTableNames[["cohortInclusionTable"]] <- sprintf("cohort_inclusion_%s", cohortId)
                cohortTableNames[["cohortInclusionResultTable"]] <- sprintf("cohort_inclusion_result_%s", cohortId)
                cohortTableNames[["cohortInclusionStatsTable"]] <- sprintf("cohort_inclusion_stats_%s", cohortId)
                cohortTableNames[["cohortSummaryStatsTable"]] <- sprintf("cohort_summary_stats_%s", cohortId)
                cohortTableNames[["cohortCensorStatsTable"]] <- sprintf("cohort_censor_stats_%s", cohortId)
                
                cat("Creating tempoary cohort stats tables")
                CohortGenerator::createCohortTables(connectionDetails = connectionDetails,
                                        cohortDatabaseSchema = schemaName,
                                        cohortTableNames = cohortTableNames,
                                        incremental=TRUE)
                                        

                cat("Creating cohorts")
                cohortsToCreate <- CohortGenerator::createEmptyCohortDefinitionSet()
                cohortsToCreate <- rbind(cohortsToCreate, data.frame(cohortId = cohortId,
                                                    cohortName = cohortName, 
                                                    sql = cohortSql,
                                                    stringsAsFactors = FALSE))       
                cohortsGenerated <- CohortGenerator::generateCohortSet(connectionDetails = connectionDetails,
                                                    cdmDatabaseSchema = schemaName,
                                                    cohortDatabaseSchema = schemaName,
                                                    cohortTableNames = cohortTableNames,
                                                    cohortDefinitionSet = cohortsToCreate)


                cat("Dropping tempoary cohort stats tables")
                CohortGenerator::dropCohortStatsTables(
                connectionDetails = connectionDetails,
                cohortDatabaseSchema = schemaName,
                cohortTableNames = cohortTableNames
                )
        ''')