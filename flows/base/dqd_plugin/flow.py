import os
import sys
import json
from rpy2 import robjects
from pprint import pformat

from prefect import runtime
from prefect import flow, task
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .types import DqdOptionsType, DqdParams

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.AnalyticsSvcAPI import AnalyticsSvcAPI
from _shared_flow_utils.rutils import set_trex_env_var, py_bool_to_r
from _shared_flow_utils.types import UserType, SupportedDatabaseDialects, AuthMode

os.environ["plugin_name"] = "dqd_plugin"


@flow(log_prints=True)
def dqd_plugin(options: DqdOptionsType):
    logger = get_run_logger()

    flow_run_id = runtime.flow_run.id
    output_folder = f"/output/{flow_run_id}"

    dbdao = DBDao(
        dialect=SupportedDatabaseDialects.TREX if options.use_trex_connection else None,
        use_cache_db=options.use_cache_db,
        database_code=options.databaseCode,
    )

    r_connection_string = dbdao.get_database_connector_connection_string(
        user_type=UserType.READ_USER, release_date=options.releaseDate
    )

    db_driver_string = dbdao.set_db_driver_env()

    dqd_parameters = DqdParams(
        **options.model_dump(),
        outputFolder=output_folder,
        setDBDriverEnv=db_driver_string,
        connectionDetails=r_connection_string,
        use_trex_connection=options.use_trex_connection,
    )

    if (
        options.cohortDefinitionId
        and dbdao.dialect == SupportedDatabaseDialects.HANA
        and dbdao.tenant_configs.authMode == AuthMode.JWT
    ):
        # For Hana JWT mode, fetch the materialized cohort schema and assign to DQD parameters
        schema_from_api = get_cohort_database_schema(options.datasetId)
        if schema_from_api:
            dqd_parameters.materializedCohortDatabaseSchema = schema_from_api

    execute_dqd(dqd_parameters, flow_run_id)


@task(log_prints=True, task_run_name="execute_dqd_{dqd_params.schemaName}")
def execute_dqd(dqd_params: DqdParams, flow_run_id: str):
    logger = get_run_logger()

    logger.info("Running DQD with input parameters:")
    logger.info(pformat(dqd_params.to_json_dict(), indent=2))

    set_trex_env_string = set_trex_env_var(dqd_params.use_trex_connection)
    logger.debug(f"set_trex_env_string is {set_trex_env_string}")

    r_script = f"""
        library(DataQualityDashboard)

        {set_trex_env_string}
        {dqd_params.setDBDriverEnv}
        {dqd_params.connectionDetails}
        
        cdmDatabaseSchema <- '{dqd_params.schemaName}'
        vocabDatabaseSchema <- '${dqd_params.vocabSchemaName}'
        resultsDatabaseSchema <- '{dqd_params.schemaName}'
        cdmSourceName <- '{dqd_params.schemaName}'
        numThreads <- {dqd_params.numThreads}
        sqlOnly <- {py_bool_to_r(dqd_params.sqlOnly)}
        outputFolder <- '{dqd_params.outputFolder}'
        outputFile <- '{dqd_params.outputFile}'
        writeToTable <- {py_bool_to_r(dqd_params.writeToTable)}
        verboseMode <- {py_bool_to_r(dqd_params.verboseMode)}
        checkLevels <- {dqd_params.checkLevels}

        checkNames <- {dqd_params.checkNamesR}
        cohortDefinitionId <- {dqd_params.cohortDefinitionIdR}
        cdmVersion <- '{dqd_params.cdmVersionNumber}'
        cohortDatabaseSchema <- '{dqd_params.cohortDatabaseSchemaR}'
        cohortTableName <- '{dqd_params.cohortTableName}'

        # Run executeDqChecks
        DataQualityDashboard::executeDqChecks(
            connectionDetails = connectionDetails,
            cdmDatabaseSchema = cdmDatabaseSchema,
            resultsDatabaseSchema = resultsDatabaseSchema,
            cdmSourceName = cdmSourceName,
            numThreads = numThreads,
            sqlOnly = sqlOnly,
            outputFolder = outputFolder,
            outputFile = outputFile,
            verboseMode = verboseMode,
            writeToTable = writeToTable,
            checkLevels = checkLevels,
            checkNames = checkNames,
            cdmVersion = cdmVersion,
            cohortDefinitionId = cohortDefinitionId,
            cohortDatabaseSchema = cohortDatabaseSchema,
            cohortTableName = cohortTableName
        )
    """

    with robjects.conversion.localconverter(robjects.default_converter):
        robjects.r(r_script)

    # Read the result from the output file
    with open(f"{dqd_params.outputFolder}/{dqd_params.outputFile}", "rt") as f:
        result_data = json.loads(f.read())

    # Create a markdown artifact with the result data
    artifact_key = f"{flow_run_id}-dqd-output"
    create_markdown_artifact(
        key=artifact_key,
        markdown=json.dumps(result_data),
        description="DQD output stored as JSON",
    )

    return result_data


@task(log_prints=True, task_run_name="get_cohort_database_schema_{dataset_id}")
def get_cohort_database_schema(dataset_id: str) -> str:
    logger = get_run_logger()

    try:
        analytics_svc_api = AnalyticsSvcAPI()
        cohort_database_schema = analytics_svc_api.get_db_owner_schema(dataset_id)
        if not cohort_database_schema:
            error_message = "Unable to fetch cohort_database_schema from analytics api for Hana Jwt mode!"
            raise ValueError(error_message)
    except Exception as e:
        logger.error(f"Error fetching cohort_database_schema: {e}")
        raise
    else:
        logger.info(
            f"Successfully fetched cohort_database_schema: {cohort_database_schema}"
        )
        return cohort_database_schema


if __name__ == "__main__":
    try:
        execute_dqd(
            {"schemaName": "schemaName", "cdmVersionNumber": "5.4", "threads": 1}
        )
        sys.exit(0)
    except Exception as e:
        print(e)
