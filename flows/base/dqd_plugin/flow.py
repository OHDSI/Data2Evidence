import sys
import json
from rpy2 import robjects
import os
from prefect import flow, task
from prefect_shell import ShellOperation
from prefect.context import FlowRunContext
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .types import DqdOptionsType, DQD_THREAD_COUNT

from _shared_flow_utils.types import UserType, SupportedDatabaseDialects, AuthMode
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.AnalyticsSvcAPI import AnalyticsSvcAPI


os.environ['plugin_name'] = 'dqd_plugin'

@flow(log_prints=True, timeout_seconds=3600)
def dqd_plugin(options: DqdOptionsType):
    logger = get_run_logger()
    schema_name = options.schemaName
    database_code = options.databaseCode
    cdm_version_number = options.cdmVersionNumber
    vocab_schema_name = options.vocabSchemaName
    release_date = options.releaseDate
    use_cache_db = options.use_cache_db
    dataset_id = options.datasetId
    cohort_database_schema = None

    if options.cohortDefinitionId:
        cohort_definition_id = f"c({options.cohortDefinitionId})"
    else:
        cohort_definition_id = "c()"

    if options.checkNames:
        # Wrap each value in checkNames in single quotes
        check_names = [
            f"'{check_name}'" for check_name in options.checkNames]
        # convert to comma separated string
        check_names = f"c({','.join(check_names)})"
    else:
        check_names = "c()"

    if options.cohortDatabaseSchema:
        cohort_database_schema = options.cohortDatabaseSchema
    else:
        # If cohortDefinitionId exists, DQD is run on materialized cohorts (CQD)
        # check hana and dialect
        dbdao = DBDao(use_cache_db=use_cache_db,
                database_code=database_code)
        database_credentials = dbdao.tenant_configs
        # If Hana and Jwt Mode, get db owner schema name where materialized cohorts are stored
        if options.cohortDefinitionId and database_credentials.dialect == SupportedDatabaseDialects.HANA and database_credentials.authMode == AuthMode.JWT:
            analytics_svc_api = AnalyticsSvcAPI()
            cohort_database_schema = analytics_svc_api.get_db_owner_schema(dataset_id)
            if not cohort_database_schema:
                error_message = "Unable to fetch cohort_database_schema from analytics api for Hana Jwt mode!"
                logger.error(error_message)
                raise ValueError(error_message)
        else: # If still none, fallback to default schema
            cohort_database_schema = schema_name

    if options.cohortTableName:
        cohort_table_name = options.cohortTableName
    else:
        cohort_table_name = "cohort"

    flow_run_context = FlowRunContext.get().flow_run.dict()
    flow_run_id = str(flow_run_context.get("id"))
    output_folder = f'/output/{flow_run_id}'
    execute_dqd(schema_name,
                database_code,
                cdm_version_number,
                vocab_schema_name,
                release_date,
                cohort_definition_id,
                output_folder,
                check_names,
                cohort_database_schema,
                cohort_table_name,
                use_cache_db)


@task()
def execute_dqd(
    schema_name: str,
    database_code: str,
    cdm_version_number: str,
    vocab_schema_name: str,
    release_date: str,
    cohort_definition_id: str,
    output_folder: str,
    check_names: str,
    cohort_database_schema: str,
    cohort_table_name: str,
    use_cache_db: bool
):
    logger = get_run_logger()

    threads = DQD_THREAD_COUNT

    read_user = UserType.READ_USER

    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code)

    set_db_driver_env = dbdao.set_db_driver_env()
    set_read_user_connection = dbdao.get_database_connector_connection_string(user_type=read_user,
                                                                              release_date=release_date)

    logger.info(f'''Running DQD with input parameters:
                    schemaName: {schema_name},
                    databaseCode: {database_code},
                    cdmVersionNumber: {cdm_version_number},
                    vocabSchemaName: {vocab_schema_name},
                    releaseDate: {release_date},
                    cohortDefinitionId: {cohort_definition_id},
                    outputFolder: {output_folder},
                    checkNames: {check_names},
                    cohortDatabaseSchema: {cohort_database_schema},
                    cohortTableName: {cohort_table_name},
                '''
                )

    with robjects.conversion.localconverter(robjects.default_converter):
        robjects.r(f'''
                {set_db_driver_env}
                {set_read_user_connection}
                cdmDatabaseSchema <- '{schema_name}'
                vocabDatabaseSchema <- '${vocab_schema_name}'
                resultsDatabaseSchema <- '{schema_name}'
                cdmSourceName <- '{schema_name}'
                numThreads <- {threads}
                sqlOnly <- FALSE
                outputFolder <- '{output_folder}'
                outputFile <- '{schema_name}.json'
                writeToTable <- FALSE
                verboseMode <- TRUE
                checkLevels <- c('TABLE','FIELD','CONCEPT')
                checkNames <- {check_names}
                cohortDefinitionId <- {cohort_definition_id}
                cdmVersion <- '{cdm_version_number}'
                cohortDatabaseSchema <- '{cohort_database_schema}'
                cohortTableName <- '{cohort_table_name}'

                # Run executeDqChecks
                DataQualityDashboard::executeDqChecks(connectionDetails = connectionDetails,cdmDatabaseSchema = cdmDatabaseSchema,resultsDatabaseSchema = resultsDatabaseSchema,cdmSourceName = cdmSourceName,numThreads = numThreads,sqlOnly = sqlOnly,outputFolder = outputFolder,outputFile = outputFile,verboseMode = verboseMode,writeToTable = writeToTable,checkLevels = checkLevels,checkNames = checkNames,cdmVersion = cdmVersion, cohortDefinitionId = cohortDefinitionId, cohortDatabaseSchema = cohortDatabaseSchema, cohortTableName = cohortTableName)
        ''')

    # Read the result from the output file
    with open(f'{output_folder}/{schema_name}.json', 'rt') as f:
        result_data = json.loads(f.read())

    # Create a markdown artifact with the result data
    artifact_key = f"{FlowRunContext.get().flow_run.id}-dqd-output"
    create_markdown_artifact(
        key=artifact_key,
        markdown=json.dumps(result_data),
        description="DQD output stored as JSON"
    )

    return result_data


if __name__ == "__main__":
    try:
        execute_dqd({
            "schemaName": "schemaName",
            "cdmVersionNumber": '5.4',
            "threads": 1
        })
        sys.exit(0)
    except Exception as e:
        print(e)
