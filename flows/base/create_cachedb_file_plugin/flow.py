import os
import duckdb
import traceback
from typing import Any

from prefect import flow, task
from prefect.variables import Variable
from prefect.logging import get_run_logger

from .utils import *
from .fts import create_fts_index_task
from .versioninfo import update_dataset_metadata
from .copy import create_schema_tables_task, create_schema_if_not_exists_task
from .types import CreateCacheOptions, CreateCDWValidationConfig, CacheFlowAction, CopyParameters

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.dao.daobase import DaoBase
from _shared_flow_utils.types import SupportedDatabaseDialects


os.environ["plugin_name"] = "create_cachedb_file_plugin"


@flow(log_prints=True)
def create_cachedb_file_plugin(options: CreateCacheOptions):
    match options.flow_action_type:
        case CacheFlowAction.CREATE_DATAMART_CACHE:
            create_cache_flow(options)
            if options.results_schema_name and options.schema_name != options.results_schema_name:
                create_results_cache_flow(options)

        case CacheFlowAction.GET_VERSION_INFO:
            update_dataset_metadata(options)


def update_parameters(options: CreateCacheOptions, 
                      field: str, new_value: str) -> CreateCacheOptions:
    # Create a copy of the model with the updated field
    return options.model_copy(update={field: new_value})


def create_results_cache_flow(options: CreateCacheOptions):
    new_options = update_parameters(options, 'schema_name', options.results_schema_name)
    create_cache_flow(new_options)


def create_cache_flow(options: CreateCacheOptions):
    logger = get_run_logger()

    dbdao = DBDao(use_cache_db=options.use_cache_db, database_code=options.database_code)
    db_credentials = dbdao.tenant_configs
    # Check if dialect is supported for cache/datamart creations
    check_supported_dialects(dbdao.dialect)

    # Load Google service account credentials for BigQuery access.
    if dbdao.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        DaoBase.create_service_account_credentials_file(db_credentials)

    copy_params = CopyParameters(
        source_database=f"{options.database_code}__srcdb",
        target_database=options.database_code,
        source_schema=options.schema_name,
        target_schema=options.target_schema_name,
        table_filter=options.snapshot_copy_config.table_config_to_dict() if options.snapshot_copy_config else None,
        timestamp_filter=options.snapshot_copy_config.timestamp if options.snapshot_copy_config else None,
        patient_filter=options.snapshot_copy_config.patients_to_be_copied if options.snapshot_copy_config else None,
        fts_tables=options.tables_to_create_duckdb_fts_index,
        limit_statement="",  # Limit 0 only applied to CDW config
        vocab_schema=options.vocab_schema_name,
        chunk_size=options.chunk_size
    )

    duckdb_file_path = resolve_duckdb_file_path(
        options.database_code, Variable.get("duckdb_data_folder")
    )
    
    if not options.use_trex_connection:
        logger.info(f"Connecting to Cache file directly at '{duckdb_file_path}'...")

        # Creates file if it does not exist
        with duckdb.connect(duckdb_file_path) as file_conn:
            load_extensions(write_conn=file_conn, dialect=dbdao.dialect, trex_sql=False)

            attach_to_source_db(dbdao, file_conn, copy_params.source_database)

            duckdb_file_exists = check_if_file_exists(duckdb_file_path)
    
            if not duckdb_file_exists:
                # If the file doesn't exist do a one time copy of all schemas in database
                logger.info(
                    f"Cache file does not exist. Copying all schemas from '{options.database_code}' to cache through direct file connection."
                )
                copy_all_schemas(duckdb_file_path, dbdao, copy_params)


    logger.info(
        f"Creating cache for '{options.schema_name}' schema in '{options.database_code}'"
    )


    create_schema_if_not_exists_task(options.use_trex_connection, copy_params, duckdb_file_path)

    create_schema_tables_task(options.use_trex_connection, dbdao, copy_params, duckdb_file_path)

    create_fts_index_task(options.use_trex_connection, copy_params, duckdb_file_path)


@task(log_prints=True, task_run_name="copy_all_schemas_from_{read_conn.database_code}")
def copy_all_schemas(duckdb_file_path: str, read_conn: Any, copy_params: CopyParameters):
    logger = get_run_logger()
    logger.info(f"Starting schema copy for database '{read_conn.database_code}'...")
    schemas_to_copy = sorted(read_conn.get_schema_names())
    logger.info(f"Found {len(schemas_to_copy)} schemas: {schemas_to_copy}")

    failed_schemas = []

    for idx, schema in enumerate(schemas_to_copy, start=1):
        logger.info(f"[{idx}/{len(schemas_to_copy)}] Copying schema '{schema}'...")
        try:
            create_schema_if_not_exists_task(False, copy_params, duckdb_file_path)
            create_schema_tables_task(False, read_conn, copy_params, duckdb_file_path)
        except Exception as e:
            logger.error(f"Failed to copy schema '{schema}': {e}")
            logger.error(traceback.format_exc())
            failed_schemas.append(schema)
            continue

        try:
            create_fts_index_task(False, copy_params, duckdb_file_path)
        except Exception as e:
            logger.error(f"Failed to create FTS index for schema '{schema}': {e}")
            logger.error(traceback.format_exc())
            failed_schemas.append(schema)

    total = len(schemas_to_copy)
    success = total - len(failed_schemas)
    logger.info(f"Finished copying schemas: Total={total}, Successful={success}, Failed={len(failed_schemas)}")
    if failed_schemas:
        logger.error(f"Schemas failed: {', '.join(failed_schemas)}")


@flow(log_prints=True)
def create_cdw_validation_config_plugin(options: CreateCDWValidationConfig):
    logger = get_run_logger()

    database_code = options.database_code
    schema_to_copy = options.schema_name
    use_cache_db = options.use_cache_db

    cdw_db = "cdw_config_svc_validation_schema"

    dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)

    check_supported_dialects(dbdao.dialect)

    if dbdao.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        # Load Google service account credentials for BigQuery access.
        load_service_account_credentials()

    copy_params = CopyParameters(
        source_database=f"{database_code}__srcdb",
        target_database=cdw_db,
        source_schema=schema_to_copy,
        target_schema=schema_to_copy,
        table_filter=None,
        timestamp_filter=None,
        patient_filter=None,
        fts_tables=[],
        limit_statement="LIMIT 0"  # Limit 0 only applied to CDW config
    )

    duckdb_file_path = resolve_duckdb_file_path(
        options.database_code, Variable.get("duckdb_data_folder")
    )

    if not options.use_trex_connection:
         # Creates file if it does not exist
        with duckdb.connect(duckdb_file_path) as file_conn:
            load_extensions(write_conn=file_conn, dialect=dbdao.dialect, trex_sql=False)

            attach_to_source_db(dbdao, file_conn, copy_params.source_database)

    logger.info(
        f"Creating cdw cache for '{schema_to_copy}' schema in '{database_code}'"
    )

    create_schema_if_not_exists_task(options.use_trex_connection, copy_params, duckdb_file_path)

    create_schema_tables_task(options.use_trex_connection, dbdao, copy_params, duckdb_file_path)

    create_fts_index_task(options.use_trex_connection, copy_params, duckdb_file_path)


@task(log_prints=True, task_run_name="attach_to_source_db_{read_conn.database_code}")
def attach_to_source_db(read_conn: any, write_conn: any, database_name: str):
    logger = get_run_logger()
    logger.info(f"Attaching to source database '{read_conn.database_code}' as '{database_name}'...")

    read_credentials = read_conn.tenant_configs

    match read_conn.dialect:
        case SupportedDatabaseDialects.POSTGRES.value:
            attach_query = f"ATTACH 'dbname={read_credentials.databaseName} user={read_credentials.readUser} password={read_credentials.readPassword.get_secret_value()} host={read_credentials.host} port={read_credentials.port}' AS {database_name} (TYPE postgres, READ_ONLY);"
        case SupportedDatabaseDialects.BIGQUERY.value:
            attach_query = f"ATTACH 'project={read_credentials.host}' AS {database_name} (TYPE bigquery, READ_ONLY);"
        case _:
            raise ValueError(f"Unsupported dialect: {read_conn.dialect}")

    execute_statement(write_conn, attach_query)

    logger.info(f"Successfully attached to source database '{read_conn.database_code}' as '{database_name}'!")


@task(log_prints=True, task_run_name="load_extensions_{dialect}")
def load_extensions(write_conn: any, dialect: str, trex_sql: bool = True):
    """
    Loads the necessary extensions based on the dialect and whether Trex SQL is used.
    """
    logger = get_run_logger()

    logger.info(f"Loading extensions for dialect: {dialect}")

    if trex_sql:
        match dialect:
            case SupportedDatabaseDialects.POSTGRES.value:
                logger.debug("Loading Postgres extensions for Trex SQL.")
                execute_statement(write_conn, "LOAD postgres;")
                logger.debug("Postgres extensions loaded successfully.")

            case SupportedDatabaseDialects.BIGQUERY.value:
                logger.debug("Installing and loading BigQuery extensions for Trex SQL.")
                execute_statement(write_conn, "INSTALL bigquery FROM community;")
                execute_statement(write_conn, "LOAD bigquery;")
                logger.debug("BigQuery extensions loaded successfully.")
            case _:
                raise ValueError(f"Scan extension not supported for dialect: {dialect}")
    else:
        match dialect:
            case SupportedDatabaseDialects.POSTGRES.value:
                # Load postgres scan extensions offline
                logger.debug("Loading Postgres scan extension.")
                postgres_scan_extension_path = (
                    f"{DUCKDB_EXTENSIONS_FILEPATH}/postgres_scanner.duckdb_extension"
                )
                write_conn.load_extension(postgres_scan_extension_path)
                logger.debug("Postgres scan extension loaded successfully.")

            case SupportedDatabaseDialects.BIGQUERY.value:
                logger.debug("Installing and loading BigQuery scan extension.")
                # Todo: Requires internet connection
                write_conn.install_extension("bigquery", repository="community")
                write_conn.load_extension("bigquery")
                logger.debug("BigQuery scan extension loaded successfully.")
            case _:
                raise ValueError(f"Scan extension not supported for dialect: {dialect}")

    # Load FTS extension
    logger.debug(f"Loading FTS extension {'for Trex SQL' if trex_sql else ''}.")
    if trex_sql:
        execute_statement(write_conn, "INSTALL fts;")
        execute_statement(write_conn, "LOAD fts;")
    else:
        fts_extension_path = f"{DUCKDB_EXTENSIONS_FILEPATH}/fts.duckdb_extension"
        write_conn.load_extension(fts_extension_path)
        logger.debug("FTS extension loaded successfully.")

    logger.info("All extensions loaded successfully.")
