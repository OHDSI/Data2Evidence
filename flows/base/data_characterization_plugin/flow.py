import os
import json

from rpy2 import robjects
from string import Template
from functools import partial
from sqlalchemy import text

from prefect import runtime
from prefect import flow, task
from prefect.variables import Variable
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .utils import *
from .types import DCOptionsType, AchillesParams

from _shared_flow_utils.dao.DBDao import DBDao, TrexDao
from _shared_flow_utils.create_dataset_tasks import *
from _shared_flow_utils.rutils import set_trex_env_var, py_bool_to_r, get_trex_env_var
from _shared_flow_utils.types import UserType, SupportedDatabaseDialects


os.environ["plugin_name"] = "data_characterization_plugin"


@flow(log_prints=True)
def data_characterization_plugin(options: DCOptionsType):
    logger = get_run_logger()

    threads = int(Variable.get("achilles_thread_count", 1))

    exclude_analysis_ids = Variable.get(
        "exclude_analysis_ids", ""
    )  # comma separated values in a string

    flow_run_id = runtime.flow_run.id
    output_folder = f"/output/{flow_run_id}"

    dbdao = DBDao(
        dialect=SupportedDatabaseDialects.TREX if options.use_trex_connection else None,
        use_cache_db=options.use_cache_db,
        database_code=options.databaseCode,
    )

    is_hana_jwt_auth = dbdao.tenant_configs.authMode == AuthMode.JWT and dbdao.dialect == SupportedDatabaseDialects.HANA

    # Todo: Update implementation if Hana JWT uses trex
    # If the actual dialect is HANA, force use_trex_connection to False
    use_trex_connection = False if is_hana_jwt_auth else options.use_trex_connection

    cdm_source = get_cdm_source(
        dbdao,
        schema=options.schemaName,
        use_trex_connection=use_trex_connection,
    )

    r_connection_string = dbdao.get_database_connector_connection_string(
        user_type=UserType.ADMIN_USER, release_date=options.releaseDate
    )

    db_driver_string = dbdao.set_db_driver_env()

    trex_env_var = get_trex_env_var(use_trex_connection, isinstance(dbdao, TrexDao) and dbdao.is_hana)

    # Todo: Update implementation if Hana JWT uses trex
    # Create Achilles parameters from DCOptions
    achilles_params = AchillesParams(
        **options.model_dump(),
        numThreads=threads,
        outputFolder=output_folder,
        setDBDriverEnv=db_driver_string,
        connectionDetails=r_connection_string,
        excludeAnalysisIds=exclude_analysis_ids,
        useTrexConnectionEnv=trex_env_var,
    )

    dc_schema = create_results_schema(
        achilles_params.resultsSchema, achilles_params.vocabSchemaName, dbdao, logger
    )

    if dc_schema:
        execute_achilles_wo = execute_achilles.with_options(
            on_failure=[
                partial(
                    drop_schema_hook,
                    **dict(dbdao=dbdao, schema=achilles_params.resultsSchema),
                )
            ]
        )

        execute_achilles_wo(achilles_params, flow_run_id)

        # Todo: Update implementation if Hana uses trex
        if not use_trex_connection:

            execute_export_to_ares_wo = execute_export_to_ares.with_options(
                on_failure=[
                    partial(
                        drop_schema_hook,
                        **dict(dbdao=dbdao, schema=achilles_params.resultsSchema),
                    )
                ]
            )

            execute_export_to_ares_wo(achilles_params, cdm_source)


def create_results_schema(results_schema: str, vocab_schema: str, dbdao, logger):
    try:
        # create results schema
        create_schema_task(dbdao, results_schema)

        # create result tables
        schema_params = {
            "DATA_CHARACTERIZATION_SCHEMA": results_schema,
            "VOCAB_SCHEMA": vocab_schema,
        }

        for k, v in schema_params.items():
            if not is_safe_schema_name(v):
                raise ValueError(f"Unsafe schema name: {v}")

        # Todo: migration_script_filepath = f"flows/{os.environ.get('plugin_name')}/db/migrations/trex_duckdb/concept_hierarchy.sql"
        migration_script_filepath = f"flows/{os.environ.get('plugin_name')}/db/migrations/{dbdao.dialect}/concept_hierarchy.sql"

        with open(migration_script_filepath, "r") as f:
            sql_template = Template(f.read())

        # Use safe_substitute because of 'US$' in sql script
        sql_script = sql_template.safe_substitute(schema_params)

        create_tables_wo = create_results_tables.with_options(
            on_failure=[
                partial(drop_schema_hook, **dict(dbdao=dbdao, schema=results_schema))
            ]
        )

        create_tables_wo(sql_script, dbdao)

        # task
        if dbdao.dialect == SupportedDatabaseDialects.HANA:
            enable_audit_policies_wo = (
                enable_and_create_audit_policies_task.with_options(
                    on_failure=[
                        partial(
                            drop_schema_hook, **dict(dbdao=dbdao, schema=results_schema)
                        )
                    ]
                )
            )

            enable_audit_policies_wo(dbdao, results_schema)

        create_and_assign_roles_wo = create_and_assign_roles_task.with_options(
            on_failure=[
                partial(drop_schema_hook, **dict(dbdao=dbdao, schema=results_schema))
            ]
        )

        create_and_assign_roles_wo(dbdao, results_schema)

        logger.info(
            f"Data Characterization results schema '{results_schema}' successfully created!"
        )

    except Exception as e:
        raise
    else:
        return True


@task(log_prints=True)
def create_results_tables(sql_script: str, dbdao):
    if dbdao.dialect == SupportedDatabaseDialects.TREX:
        dbdao.execute_sql(sql_script)
    else:
        with dbdao.engine.begin() as conn:
            try:
                for statement in sql_script.strip().split(";"):
                    if statement.strip():
                        conn.execute(text(statement))
            finally:
                conn.close()


@task(log_prints=True, task_run_name="execute_achilles_{achilles_params.schemaName}")
def execute_achilles(achilles_params: AchillesParams, flow_run_id: str):
    logger = get_run_logger()

    set_trex_env_string = set_trex_env_var(achilles_params.useTrexConnectionEnv)

    logger.debug(f"set_trex_env_string is {set_trex_env_string}")

    failed_analysis_ids = []

    try:
        logger.info(
            f"Running Achilles::achilles on thread count: {achilles_params.numThreads}"
        )

        r_script = f"""
            library('Achilles')
                
            {set_trex_env_string}
            {achilles_params.setDBDriverEnv}
            {achilles_params.connectionDetails}

            cdmVersion <- '{achilles_params.cdmVersionNumber}'
            cdmDatabaseSchema <- '{achilles_params.schemaName}'
            vocabDatabaseSchema <- '{achilles_params.vocabSchemaName}'
            resultsDatabaseSchema <- '{achilles_params.resultsSchema}'
            outputFolder <- '{achilles_params.outputFolder}'
            numThreads <- {achilles_params.numThreads}
            createTable <- {py_bool_to_r(achilles_params.createTable)}
            sqlOnly <- {py_bool_to_r(achilles_params.sqlOnly)}
            verboseMode <- {py_bool_to_r(achilles_params.verboseMode)}
            createIndices <- {py_bool_to_r(achilles_params.createIndices)}
            excludeAnalysisIds <- c({achilles_params.excludeAnalysisIds})

            Achilles::achilles(
                connectionDetail = connectionDetails, 
                cdmVersion = cdmVersion, 
                cdmDatabaseSchema = cdmDatabaseSchema, 
                createTable = createTable, 
                resultsDatabaseSchema = resultsDatabaseSchema, 
                outputFolder = outputFolder, 
                sqlOnly = sqlOnly, 
                numThreads = numThreads, 
                verboseMode = verboseMode, 
                excludeAnalysisIds = excludeAnalysisIds, 
                createIndices = createIndices
            )
            """

        with robjects.conversion.localconverter(robjects.default_converter):
            robjects.r(r_script)

        # Todo: Task will succeed so need to check for error report or analyses
        error_message = get_error_message(
            "errorReportR.txt", achilles_params.outputFolder
        )
        failed_analysis_ids = get_failed_analysis_ids(achilles_params.outputFolder)
        if error_message or failed_analysis_ids:
            raise RuntimeError(
                f"Achilles run failed: Error report or analysis ID exists for flow run {flow_run_id}"
            )

    except Exception as e:
        error_file_name = "errorReportR.txt"

        error_message = (
            get_error_message(error_file_name, achilles_params.outputFolder)
            or f"{error_file_name} does not exist at {achilles_params.outputFolder}."
        )

        logger.error(f"Error message from Achilles run: {error_message}")

        failed_analysis_ids = get_failed_analysis_ids(achilles_params.outputFolder)
        logger.error(f"The following analysis IDs failed: {failed_analysis_ids}")

        error_result = {
            "flow_run_id": flow_run_id,
            "result": {},
            "error": True,
            "error_message": error_message,
            "failed_analysis_ids": failed_analysis_ids,
        }

        # Create an artifact to store the error result
        create_markdown_artifact(
            key="data-characterization-error", markdown=json.dumps(error_result)
        )

        raise
    else:
        logger.info(
            f"Achilles run completed successfully for schema: {achilles_params.schemaName}"
        )


@task(log_prints=True, task_run_name="execute_achilles_{achilles_params.schemaName}")
def execute_export_to_ares(achilles_params: AchillesParams, cdm_source: str):
    logger = get_run_logger()
    logger.info("Running Achilles::exportToAres")

    set_trex_env_string = set_trex_env_var(achilles_params.use_trex_connection)

    r_script = f"""
        library('Achilles')

        {set_trex_env_string}
        {achilles_params.setDBDriverEnv}
        {achilles_params.connectionDetails}

        cdmVersion <- '{achilles_params.cdmVersionNumber}'
        cdmDatabaseSchema <- '{achilles_params.schemaName}'
        vocabDatabaseSchema <- '{achilles_params.vocabSchemaName}'
        resultsDatabaseSchema <- '{achilles_params.resultsSchema}'
        outputPath <- '{achilles_params.outputFolder}'

        Achilles::exportToAres(
            connectionDetails = connectionDetails,
            cdmDatabaseSchema = cdmDatabaseSchema,
            resultsDatabaseSchema = resultsDatabaseSchema,
            vocabDatabaseSchema = vocabDatabaseSchema,
            outputPath = outputPath,
            reports = c()
        )
    """

    try:
        with robjects.conversion.localconverter(robjects.default_converter):
            robjects.r(r_script)

    except Exception as e:
        logger.error("execute_export_to_ares task failed")
        error_file_name = "errorReportSql.txt"

        # Get name of folder created by at {output_folder/cdm_source_abbreviation}
        ares_output_path = get_export_to_ares_output_path(
           achilles_params.outputFolder, cdm_source
        )

        error_message = (
            get_error_message(error_file_name, ares_output_path)
            or get_error_message(error_file_name)
            or f"{error_file_name} does not exist at {ares_output_path} or current working directory."
        )
        logger.error(error_message)
    else:
        ares_output_path = get_export_to_ares_output_path(
           achilles_params.outputFolder, cdm_source
        )

        # Create an artifact to store the export result
        create_markdown_artifact(
            key="export-to-ares-result",
            markdown=json.dumps(get_export_to_ares_results_from_file(ares_output_path)),
            description=f"Export to Ares completed successfully for schema: {achilles_params.schemaName}",
        )
        logger.info(
            f"Export to Ares completed successfully for schema: {achilles_params.schemaName}"
        )
