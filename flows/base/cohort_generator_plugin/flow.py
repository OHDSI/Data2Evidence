import json
from rpy2 import robjects

from prefect import flow, task
from prefect.logging import get_run_logger

from .types import CohortGeneratorOptionsType

from _shared_flow_utils.types import UserType
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.AnalyticsSvcAPI import AnalyticsSvcAPI


@flow(log_prints=True, persist_result=True)
def cohort_generator_plugin(options: CohortGeneratorOptionsType):
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
                  database_code=database_code)

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

    with robjects.conversion.localconverter(robjects.default_converter):
        robjects.r(f'''
                library('CohortGenerator')
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
