import os
import json

from string import Template
from functools import partial
from sqlalchemy import text

from rpy2 import robjects
from rpy2.rinterface_lib.embedded import RRuntimeError

from prefect import runtime
from prefect import flow, task
from prefect.variables import Variable
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .utils import *
from .types import DCOptionsType, AchillesParams

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.create_dataset_tasks import *
from _shared_flow_utils.types import UserType, SupportedDatabaseDialects
from _shared_flow_utils.rutils import set_trex_env_var, convert_to_int_vector


os.environ["plugin_name"] = "data_characterization_plugin"


@flow(log_prints=True)
def data_characterization_plugin(options: DCOptionsType):
    logger = get_run_logger()

    threads = int(Variable.get("achilles_thread_count", 1))

    exclude_analysis_ids = Variable.get(
        "exclude_analysis_ids", ""
    )  # comma separated values in a string

    flow_run_id = runtime.flow_run.id

    dbdao = DBDao(
        dialect=SupportedDatabaseDialects.TREX if options.use_trex_connection else None,
        use_cache_db=options.use_cache_db,
        database_code=options.databaseCode,
    )

    # Todo: Update implementation if Hana uses trex
    # If the actual dialect is HANA, force use_trex_connection to False
    use_trex_connection = (
        False
        if dbdao.dialect == SupportedDatabaseDialects.HANA
        else options.use_trex_connection
    )

    cdm_source = get_cdm_source(
        dbdao,
        schema=options.schemaName,
        use_trex_connection=use_trex_connection,
    )

    r_connection_string = dbdao.get_r_database_connector_connection_string(
        user_type=UserType.ADMIN_USER, release_date=options.releaseDate
    )

    db_driver_string = dbdao.set_db_driver_env()

    # Todo: Update implementation if Hana uses trex
    # Create Achilles parameters from DCOptions
    achilles_params = AchillesParams(
        **options.model_dump(),
        numThreads=threads,
        setDBDriverEnv=db_driver_string,
        connectionDetails=r_connection_string,
        excludeAnalysisIds=exclude_analysis_ids,
        use_trex_connection=use_trex_connection,
    )
    # For TREX connections, set vocabSchemaName to schemaName
    if dbdao.dialect != SupportedDatabaseDialects.HANA and use_trex_connection:
        achilles_params.vocabSchemaName = options.schemaName

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

        if options.executeConceptRecordCount:
            execute_concept_record_count_wo = execute_concept_record_count.with_options(
                on_failure=[
                    partial(
                        drop_schema_hook,
                        **dict(dbdao=dbdao, schema=achilles_params.resultsSchema),
                    )
                ]
            )
            execute_concept_record_count_wo(
                achilles_params.resultsSchema,
                achilles_params.vocabSchemaName,
                dbdao,
                logger,
            )

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
        existing_schema = dbdao.check_schema_exists(results_schema)

        if existing_schema:
            logger.warning(
                f"Results schema '{results_schema}' already exists. This will drop existing achilles tables."
            )
            drop_existing_achilles_tables(results_schema, dbdao)
        else:
            create_schema_task(dbdao, results_schema)

        # create result tables
        schema_params = {
            "DATA_CHARACTERIZATION_SCHEMA": results_schema,
            "VOCAB_SCHEMA": vocab_schema,
        }

        for k, v in schema_params.items():
            if not is_safe_schema_name(v):
                raise ValueError(f"Unsafe schema name: {v}")

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


def execute_sql_script(sql_script: str, dbdao):
    if dbdao.dialect == SupportedDatabaseDialects.TREX:
        dbdao.execute_sql(sql_script)
    else:
        with dbdao.engine.begin() as conn:
            try:
                for statement in sql_script.strip().split(";"):
                    if statement.strip():
                        conn.execute(text(statement))
            except Exception as e:
                raise
            else:
                conn.commit()
            finally:
                conn.close()


@task(log_prints=True)
def create_results_tables(sql_script: str, dbdao):
    execute_sql_script(sql_script, dbdao)


@task(log_prints=True, task_run_name="execute_achilles_{achilles_params.schemaName}")
def execute_achilles(achilles_params: AchillesParams, flow_run_id: str):
    logger = get_run_logger()

    set_trex_env_string = set_trex_env_var(achilles_params.use_trex_connection)

    logger.debug(f"set_trex_env_string is {set_trex_env_string}")

    failed_analysis_ids = []

    try:
        logger.info(
            f"Running Achilles::achilles on thread count: {achilles_params.numThreads}"
        )

        r_script_path = os.path.join(os.path.dirname(__file__), "execute_achilles.R")

        with robjects.conversion.localconverter(robjects.default_converter):
            robjects.r(f"source('{r_script_path}')")
            r_execute_achilles = robjects.r["execute_achilles"]
            r_execute_achilles(
                set_trex_env_string=set_trex_env_string,
                setDBDriverEnv=achilles_params.setDBDriverEnv,
                connectionDetailsString=achilles_params.connectionDetails,
                cdmVersion=achilles_params.cdmVersionNumber,
                cdmDatabaseSchema=achilles_params.schemaName,
                vocabDatabaseSchema=achilles_params.vocabSchemaName,
                createTable=achilles_params.createTable,
                resultsDatabaseSchema=achilles_params.resultsSchema,
                outputFolder=achilles_params.outputFolder,
                sqlOnly=achilles_params.sqlOnly,
                numThreads=achilles_params.numThreads,
                verboseMode=achilles_params.verboseMode,
                excludeAnalysisIds=convert_to_int_vector(achilles_params.excludeAnalysisIds),
                createIndices=achilles_params.createIndices,
            )

        # Task might succeed if there are failed analyses so need to check for error report or failed analyses inside output folder
        error_message = get_error_message(
            "errorReportR.txt", achilles_params.outputFolder
        )
        
        failed_analysis_ids = get_failed_analysis_ids(achilles_params.outputFolder)

        if error_message or failed_analysis_ids:
            raise RuntimeError(
                f"Achilles run failed: Error report or analysis ID exists for flow run {flow_run_id}"
            )
        

    except RRuntimeError:
        error_file_name = "errorReportR.txt"

        error_message = (
            get_error_message(error_file_name, achilles_params.outputFolder)
            or f"{error_file_name} does not exist at {achilles_params.outputFolder}."
        )

        logger.error(f"Error message from Achilles run: {error_message}")

        failed_analysis_ids = get_failed_analysis_ids(achilles_params.outputFolder)

        if failed_analysis_ids:
            failed_analysis_ids_str = ",".join(map(str, failed_analysis_ids))
            logger.error(f"The following analysis IDs failed: \"{failed_analysis_ids_str}\"")

        error_result = {
            "flow_run_id": flow_run_id,
            "result": {},
            "error": True,
            "error_message": error_message,
            "failed_analysis_ids": failed_analysis_ids_str,
        }

        create_markdown_artifact(
            key="data-characterization-error", markdown=json.dumps(error_result)
        )

        raise
    except Exception as e:
        logger.error(f"Unexpected error in Achilles run: {e}")

        error_result = {
            "flow_run_id": flow_run_id,
            "result": {},
            "error": True,
            "error_message": e.__str__(),
            "failed_analysis_ids": "",
        }

        create_markdown_artifact(
            key="data-characterization-error", markdown=json.dumps(error_result)
        )

        raise
    else:
        logger.info(
            f"Achilles run completed successfully for schema: {achilles_params.schemaName}"
        )


@task(log_prints=True, task_run_name="drop_existing_achilles_tables_{results_schema}")
def drop_existing_achilles_tables(results_schema: str, dbdao):
    logger = get_run_logger()
    tables = [
        "cohort",
        "cohort_censor_stats",
        "cohort_inclusion",
        "cohort_inclusion_result",
        "cohort_inclusion_stats",
        "cohort_summary_stats",
        "cohort_cache",
        "cohort_censor_stats_cache",
        "cohort_inclusion_result_cache",
        "cohort_inclusion_stats_cache",
        "cohort_summary_stats_cache",
        "feas_study_inclusion_stats",
        "feas_study_index_stats",
        "feas_study_result",
        "heracles_analysis",
        "heracles_heel_results",
        "heracles_results",
        "heracles_results_dist",
        "heracles_periods",
        "cohort_sample_element",
        "ir_analysis_dist",
        "ir_analysis_result",
        "ir_analysis_strata_stats",
        "ir_strata",
        "cc_results",
        "pathway_analysis_codes",
        "pathway_analysis_events",
        "pathway_analysis_paths",
        "pathway_analysis_stats",
        "concept_hierarchy",
        "achilles_result_concept_count"
    ]

    logger.info(f"Dropping existing Achilles tables in schema '{results_schema}': {tables}")

    for table in tables:
        # Check if table exists
        if dbdao.check_table_exists(results_schema, table):
            logger.debug(
                f"Dropping existing Achilles table '{results_schema}.{table}'.."
            )
            dbdao.drop_table(results_schema, table, cascade=True)
            logger.info(
                f"Successfully dropped existing Achilles table '{results_schema}.{table}'"
            )


@task(log_prints=True, task_run_name="execute_achilles_{achilles_params.schemaName}")
def execute_export_to_ares(achilles_params: AchillesParams, cdm_source: str):
    logger = get_run_logger()
    logger.info("Running Achilles::exportToAres")

    set_trex_env_string = set_trex_env_var(achilles_params.use_trex_connection)

    r_script_path = os.path.join(os.path.dirname(__file__), "export_to_ares.R")
    try:
        with robjects.conversion.localconverter(robjects.default_converter):
            robjects.r(f"source('{r_script_path}')")

            r_export_to_ares = robjects.r["export_to_ares"]
            r_export_to_ares(
                set_trex_env_string=set_trex_env_string,
                setDBDriverEnv=achilles_params.setDBDriverEnv,
                connectionDetailsString=achilles_params.connectionDetails,
                cdmVersion=achilles_params.cdmVersionNumber,
                cdmDatabaseSchema=achilles_params.schemaName,
                vocabDatabaseSchema=achilles_params.vocabSchemaName,
                resultsDatabaseSchema=achilles_params.resultsSchema,
                outputPath=achilles_params.outputFolder,
            )

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


@task(log_prints=True)
def execute_concept_record_count(results_schema: str, vocab_schema: str, dbdao, logger):
    try:
        # concept count tables
        schema_params = {
            "DATA_CHARACTERIZATION_SCHEMA": results_schema,
            "VOCAB_SCHEMA": vocab_schema,
        }

        for k, v in schema_params.items():
            if not is_safe_schema_name(v):
                raise ValueError(f"Unsafe schema name: {v}")

        migration_script_filepath = f"flows/{os.environ.get('plugin_name')}/db/migrations/{dbdao.dialect}/concept_record_count.sql"

        with open(migration_script_filepath, "r") as f:
            sql_template = Template(f.read())

        # Use safe_substitute because of 'US$' in sql script
        sql_script = sql_template.safe_substitute(schema_params)

        execute_sql_script(sql_script, dbdao)

        logger.info(f"Concept record counts successfully created!")

    except Exception as e:
        raise
    else:
        return True
