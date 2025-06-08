import os
import json
from re import match
from rpy2 import robjects
from string import Template
from functools import partial
from sqlalchemy import text

from prefect import flow, task
from prefect.variables import Variable
from prefect.context import FlowRunContext
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from .hooks import *
from .types import *

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.create_dataset_tasks import *
from _shared_flow_utils.types import UserType

@flow(log_prints=True,
      timeout_seconds=3600
      )
def data_characterization_plugin(options: DCOptionsType):
    logger = get_run_logger()
    
    database_code = options.databaseCode
    use_cache_db = options.use_cache_db
    results_schema = options.resultsSchema
    schema_name = options.schemaName
    vocab_schema = options.vocabSchemaName

    cdm_version_number = options.cdmVersionNumber
    release_date = options.releaseDate
    # comma separated values in a string
    exclude_analysis_ids = options.excludeAnalysisIds

    flow_run_context = FlowRunContext.get().flow_run.dict()
    flow_run_id = str(flow_run_context.get("id"))
    output_folder = f"/output/{flow_run_id}"

    admin_user = UserType.ADMIN_USER
    read_user = UserType.READ_USER

    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code,
                  plugin_name="data_characterization_plugin")

    match dbdao.dialect:
        case SupportedDatabaseDialects.POSTGRES:
            results_schema = results_schema.lower()
            vocab_schema = vocab_schema.lower()
            schema_name = schema_name.lower()
        case SupportedDatabaseDialects.HANA:
            results_schema = results_schema.upper()
            vocab_schema = vocab_schema.upper()
            schema_name = schema_name.upper()

    dc_schema = create_data_characterization_schema(results_schema,
                                                    vocab_schema,
                                                    dbdao,
                                                    logger)

    if dc_schema:
        set_admin_connection_string = dbdao.get_database_connector_connection_string(
            user_type=admin_user,
            release_date=release_date,
            plugin_name="data_characterization_plugin"
        )

        set_read_connection_string = dbdao.get_database_connector_connection_string(
            user_type=read_user,
            release_date=release_date,
            plugin_name="data_characterization_plugin"
        )

        dc_status = execute_data_characterization(schema_name=schema_name,
                                                  results_schema=results_schema,
                                                  vocab_schema=vocab_schema,
                                                  cdm_version_number=cdm_version_number,
                                                  dbdao=dbdao,
                                                  exclude_analysis_ids=exclude_analysis_ids,
                                                  output_folder=output_folder,
                                                  set_connection_string=set_admin_connection_string,
                                                  flow_run_id=flow_run_id
                                                  )

        if dc_status:
            msg = dc_status.get("error_message")
            raise Exception(
                f"An error occurred while executing data characterization: {msg}")

        execute_export_to_ares(schema_name=schema_name,
                               vocab_schema=vocab_schema,
                               results_schema=results_schema,
                               dbdao=dbdao,
                               output_folder=output_folder,
                               set_connection_string=set_read_connection_string)


def create_data_characterization_schema(results_schema: str,
                                        vocab_schema: str,
                                        dbdao,
                                        logger):
    try:
        # create results schema
        create_schema_task(dbdao, results_schema)

        # create result tables
        schema_params = {
            "DATA_CHARACTERIZATION_SCHEMA": results_schema,
            "VOCAB_SCHEMA": vocab_schema
        }

        for k, v in schema_params.items():
            if not is_safe_schema_name(v):
                raise ValueError(f"Unsafe schema name: {v}")

        plugin_name = "data_characterization_plugin"
        migration_script_filepath = f"flows/{plugin_name}/db/migrations/{dbdao.dialect}/concept_hierarchy.sql"

        with open(migration_script_filepath, 'r') as f:
            sql_template = Template(f.read())
        
        # Use safe_substitute because of 'US$' in sql script
        sql_script = sql_template.safe_substitute(schema_params)
        
        create_tables_wo = create_results_tables.with_options(
            on_failure=[partial(drop_schema_hook, **dict(dbdao=dbdao, schema=results_schema))]
        )

        create_tables_wo(sql_script, dbdao)

        # task
        enable_audit_policies_wo = enable_and_create_audit_policies_task.with_options(
            on_failure=[partial(drop_schema_hook, **dict(dbdao=dbdao, schema=results_schema))])

        enable_audit_policies_wo(dbdao, results_schema)

        # task
        create_and_assign_roles_wo = create_and_assign_roles_task.with_options(
            on_failure=[partial(drop_schema_hook, **dict(dbdao=dbdao, schema=results_schema))])

        create_and_assign_roles_wo(dbdao, results_schema)

        logger.info(
            f"Data Characterization results schema '{results_schema}' successfully created and privileges assigned!")

    except Exception as e:
        logger.error(e)
        raise e
    else:
        return True

@task(log_prints=True)
def create_results_tables(sql_script, dbdao):
    with dbdao.engine.begin() as conn:
        for statement in sql_script.strip().split(";"):
            if statement.strip():
                conn.execute(text(statement))


  
@task(log_prints=True)
def execute_data_characterization(schema_name: str,
                                  results_schema: str,
                                  vocab_schema: str,
                                  cdm_version_number: str,
                                  exclude_analysis_ids: str,
                                  output_folder: str,
                                  dbdao,
                                  set_connection_string: str,
                                  flow_run_id: str):
    try:
        logger = get_run_logger()
        threads = int(Variable.get("achilles_thread_count"))
        logger.info(f'Running achilles on thread count: {threads}')
        with robjects.conversion.localconverter(robjects.default_converter):
            robjects.r(f'''
                    library('Achilles')
                    {dbdao.set_db_driver_env()}
                    {set_connection_string}
                    cdmVersion <- '{cdm_version_number}'
                    cdmDatabaseSchema <- '{schema_name}'
                    vocabDatabaseSchema <- '{vocab_schema}'
                    resultsDatabaseSchema <- '{results_schema}'
                    outputFolder <- '{output_folder}'
                    numThreads <- {threads}
                    createTable <- TRUE
                    sqlOnly <- FALSE
                    excludeAnalysisIds <- c({exclude_analysis_ids})
                    Achilles::achilles( connectionDetails = connectionDetails, cdmVersion = cdmVersion, cdmDatabaseSchema = cdmDatabaseSchema, createTable = createTable, resultsDatabaseSchema = resultsDatabaseSchema, outputFolder = outputFolder, sqlOnly=sqlOnly, numThreads=numThreads, excludeAnalysisIds=excludeAnalysisIds)''')
    except Exception as e:
        logger.error(f"execute_data_characterization task failed")
        result_json = {}
        with open(f'{output_folder}/errorReportR.txt', 'rt') as f:
            error_message = f.read()
        logger.error(error_message)

        # drop schema
        logger.info(f"Dropping schema")
        dbdao.drop_schema(schema_name, cascade=True)

        error_result = {
            "flow_run_id": flow_run_id,
            "result": result_json,
            "error": True,
            "error_message": error_message
        }

        # Create an artifact to store the error result
        create_markdown_artifact(
            key="data-characterization-error",
            markdown=json.dumps(error_result)
        )

        return error_result


@task()
def execute_export_to_ares(schema_name: str,
                           vocab_schema: str,
                           results_schema: str,
                           dbdao,
                           output_folder: str,
                           set_connection_string: str):
    try:
        logger = get_run_logger()
        logger.info('Running exportToAres')

        cdm_source_abbreviation = dbdao.get_value(schema=schema_name,
                                                  table="cdm_source",
                                                  column="cdm_source_abbreviation")

        # Get name of folder created by at {outputFolder/cdm_source_abbreviation}
        ares_path = os.path.join(output_folder, cdm_source_abbreviation[:25] if len(cdm_source_abbreviation) > 25
                                 else cdm_source_abbreviation)

        with robjects.conversion.localconverter(robjects.default_converter):
            robjects.r(f'''
                    library('Achilles')
                    {dbdao.set_db_driver_env()}
                    {set_connection_string}
                    cdmDatabaseSchema <- '{schema_name}'
                    vocabDatabaseSchema <- '{vocab_schema}'
                    resultsDatabaseSchema <- '{results_schema}'
                    outputPath <- '{output_folder}'
                    Achilles::exportToAres(
                        connectionDetails = connectionDetails,
                        cdmDatabaseSchema = cdmDatabaseSchema,
                        resultsDatabaseSchema = resultsDatabaseSchema,
                        vocabDatabaseSchema = vocabDatabaseSchema,
                        outputPath,
                        reports = c()
                    )
            ''')
    except Exception as e:
        logger.error(f"execute_export_to_ares task failed")
        error_message = get_export_to_ares_execute_error_message_from_file(
            ares_path)
        logger.error(error_message)

        logger.info(
            f"Dropping Data Characterization results schema '{results_schema}'")
        dbdao.drop_schema(schema_name, cascade=True)

        raise Exception(
            f"An error occurred while executing export to ares: {error_message}")
    else:
        # Create an artifact to store the export result
        create_markdown_artifact(
            key="export-to-ares-result",
            markdown=json.dumps(
                get_export_to_ares_results_from_file(ares_path)),
            description=f"Export to Ares completed successfully for schema: {schema_name}"
        )


def is_safe_schema_name(schema: str) -> bool:
    return match(r'^[a-zA-Z][a-zA-Z0-9_]*$', schema) is not None