import os
import duckdb
from psycopg2 import connect

from .utils import *
from .fts import create_fts_index
from .versioninfo import update_dataset_metadata

from .copy import copy_all_schemas, create_schema_tables, create_schema_if_not_exists
from .types import CreateCacheOptions, CreateCDWValidationConfig, CacheFlowAction, CopyParameters

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.dao.daobase import DaoBase
from _shared_flow_utils.types import SupportedDatabaseDialects

from prefect import flow, task
from prefect.variables import Variable
from prefect.blocks.system import Secret
from prefect.logging import get_run_logger

os.environ["plugin_name"] = "create_cachedb_file_plugin"


@flow(log_prints=True)
def create_cachedb_file_plugin(options: CreateCacheOptions):
    logger = get_run_logger()
    print(f"[create_cachedb_file_plugin] Starting flow with options: {options}")
    logger.info(f"[create_cachedb_file_plugin] Starting flow with flow_action_type: {options.flow_action_type}")
    logger.info(f"[create_cachedb_file_plugin] database_code: {options.database_code}")
    logger.info(f"[create_cachedb_file_plugin] schema_name: {options.schema_name}")
    logger.info(f"[create_cachedb_file_plugin] results_schema_name: {options.results_schema_name}")
    logger.info(f"[create_cachedb_file_plugin] target_schema_name: {options.target_schema_name}")
    logger.info(f"[create_cachedb_file_plugin] use_trex_connection: {options.use_trex_connection}")
    logger.info(f"[create_cachedb_file_plugin] use_cache_db: {options.use_cache_db}")
    
    match options.flow_action_type:
        case CacheFlowAction.CREATE_DATAMART_CACHE:
            logger.info("[create_cachedb_file_plugin] Executing CREATE_DATAMART_CACHE action")
            print("[create_cachedb_file_plugin] Executing CREATE_DATAMART_CACHE action")
            create_cache_flow(options)
            if options.results_schema_name and options.schema_name != options.results_schema_name:
                logger.info(f"[create_cachedb_file_plugin] Also creating cache for results schema: {options.results_schema_name}")
                print(f"[create_cachedb_file_plugin] Also creating cache for results schema: {options.results_schema_name}")
                create_results_cache_flow(options)

        case CacheFlowAction.GET_VERSION_INFO:
            logger.info("[create_cachedb_file_plugin] Executing GET_VERSION_INFO action")
            print("[create_cachedb_file_plugin] Executing GET_VERSION_INFO action")
            update_dataset_metadata(options)
    
    logger.info("[create_cachedb_file_plugin] Flow completed successfully")
    print("[create_cachedb_file_plugin] Flow completed successfully")


def update_parameters(options: CreateCacheOptions, 
                      field: str, new_value: str) -> CreateCacheOptions:
    # Create a copy of the model with the updated field
    return options.model_copy(update={field: new_value})


def create_results_cache_flow(options: CreateCacheOptions):
    logger = get_run_logger()
    logger.info(f"[create_results_cache_flow] Starting results cache flow for schema: {options.results_schema_name}")
    print(f"[create_results_cache_flow] Starting results cache flow for schema: {options.results_schema_name}")
    new_options = update_parameters(options, 'schema_name', options.results_schema_name)
    create_cache_flow(new_options)


def create_cache_flow(options: CreateCacheOptions):
    logger = get_run_logger()
    
    print(f"[create_cache_flow] Starting cache flow for database_code: {options.database_code}, schema_name: {options.schema_name}")
    logger.info(f"[create_cache_flow] Starting cache flow")
    logger.info(f"[create_cache_flow] database_code: {options.database_code}")
    logger.info(f"[create_cache_flow] schema_name: {options.schema_name}")
    logger.info(f"[create_cache_flow] target_schema_name: {options.target_schema_name}")
    logger.info(f"[create_cache_flow] use_cache_db: {options.use_cache_db}")
    logger.info(f"[create_cache_flow] use_trex_connection: {options.use_trex_connection}")
    
    print(f"[create_cache_flow] Creating DBDao with use_cache_db={options.use_cache_db}, database_code={options.database_code}")
    logger.info(f"[create_cache_flow] Creating DBDao...")
    dbdao = DBDao(use_cache_db=options.use_cache_db, database_code=options.database_code)
    db_credentials = dbdao.tenant_configs
    logger.info(f"[create_cache_flow] DBDao created with dialect: {dbdao.dialect}")
    print(f"[create_cache_flow] DBDao created with dialect: {dbdao.dialect}")
    
    # Check if dialect is supported for cache/datamart creations
    logger.info(f"[create_cache_flow] Checking if dialect '{dbdao.dialect}' is supported...")
    check_supported_dialects(dbdao.dialect)
    logger.info(f"[create_cache_flow] Dialect check passed")

    # Load Google service account credentials for BigQuery access.
    if dbdao.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        logger.info("[create_cache_flow] Loading BigQuery credentials...")
        DaoBase.create_service_account_credentials_file(db_credentials)
        logger.info("[create_cache_flow] BigQuery credentials loaded")

    logger.info("[create_cache_flow] Creating CopyParameters...")
    copy_params = CopyParameters(
        source_database=f"{options.database_code}__srcdb",
        target_database=options.database_code,
        source_schema=options.schema_name,
        target_schema=options.target_schema_name,
        table_filter=options.snapshot_copy_config.table_config_to_dict() if options.snapshot_copy_config else None,
        timestamp_filter=options.snapshot_copy_config.timestamp if options.snapshot_copy_config else None,
        patient_filter=options.snapshot_copy_config.patients_to_be_copied if options.snapshot_copy_config else None,
        fts_tables=options.tables_to_create_duckdb_fts_index,
        limit_statement=""  # Limit 0 only applied to CDW config
    )
    logger.info(f"[create_cache_flow] CopyParameters created: source_database={copy_params.source_database}, target_database={copy_params.target_database}")
    print(f"[create_cache_flow] CopyParameters: source_schema={copy_params.source_schema}, target_schema={copy_params.target_schema}")


    if options.use_trex_connection:
        # -------------------- Trex connection to cache --------------------
        logger.info("[create_cache_flow] Using Trex connection mode")
        print("[create_cache_flow] Using Trex connection mode")
        
        # Todo: Unify with trexdao
        trex_sql_host = Variable.get("trex_sql_host")
        trex_sql_port = Variable.get("trex_sql_port")
        trex_sql_user = Variable.get("trex_sql_user")
        
        logger.info(f"[create_cache_flow] Connecting to Trex SQL at {trex_sql_host}:{trex_sql_port} as user {trex_sql_user}")
        print(f"[create_cache_flow] Connecting to Trex SQL at {trex_sql_host}:{trex_sql_port}")
        
        trex_conn = connect(
            host=trex_sql_host,
            port=trex_sql_port,
            user=trex_sql_user,
            password=Secret.load("trex-sql-password").get(),
            dbname=options.database_code,
        )
        logger.info("[create_cache_flow] Trex SQL connection established")
        print("[create_cache_flow] Trex SQL connection established")

        # Turn off transactions
        trex_conn.autocommit = True
        pg_cursor = None

        try:
            pg_cursor = trex_conn.cursor()
            logger.info("[create_cache_flow] Cursor created")

            # Extensions should already be loaded in trex
            # load_extensions(write_conn=pg_cursor, dialect=dbdao.dialect, trex_sql=True)

            logger.info(
                f"[create_cache_flow] Creating cache for '{options.schema_name}' schema in '{options.database_code}' through Trex SQL interface..."
            )
            print(f"[create_cache_flow] Creating cache for '{options.schema_name}' schema in '{options.database_code}'...")

            logger.info("[create_cache_flow] Creating schema if not exists...")
            print("[create_cache_flow] Creating schema if not exists...")
            create_schema_if_not_exists(pg_cursor, copy_params)
            logger.info("[create_cache_flow] Schema created/verified")

            logger.info("[create_cache_flow] Creating schema tables...")
            print("[create_cache_flow] Creating schema tables...")
            create_schema_tables(pg_cursor, dbdao, copy_params)
            logger.info("[create_cache_flow] Schema tables created")

            logger.info(
                f"[create_cache_flow] Creating FTS index for '{options.schema_name}' schema in '{options.database_code}' through Trex SQL interface..."
            )
            print(f"[create_cache_flow] Creating FTS index...")

            create_fts_index(pg_cursor, copy_params)
            logger.info("[create_cache_flow] FTS index created")

        except Exception as e:
            logger.error(
                f"[create_cache_flow] Error while creating cache for schema '{options.schema_name}' for '{options.database_code}': {e}"
            )
            print(f"[create_cache_flow] ERROR: {e}")
            # trex_conn.rollback()
            raise
        else:
            trex_conn.commit()
            logger.info(
                f"[create_cache_flow] Cached schema '{options.schema_name}' successfully created for '{options.database_code}'."
            )
            print(f"[create_cache_flow] Cache successfully created for '{options.schema_name}'")
        finally:
            if pg_cursor:
                pg_cursor.close()
            trex_conn.close()
            logger.info("[create_cache_flow] Trex connection closed")

    else:
        # -------------------- Direct file connection to cache --------------------
        logger.info("[create_cache_flow] Using direct file connection mode")
        print("[create_cache_flow] Using direct file connection mode")
        
        duckdb_data_folder = Variable.get("duckdb_data_folder")
        logger.info(f"[create_cache_flow] duckdb_data_folder: {duckdb_data_folder}")
        
        duckdb_file_path = resolve_duckdb_file_path(
            options.database_code, duckdb_data_folder
        )
        logger.info(f"[create_cache_flow] duckdb_file_path: {duckdb_file_path}")
        print(f"[create_cache_flow] duckdb_file_path: {duckdb_file_path}")

        duckdb_file_exists = check_if_file_exists(duckdb_file_path)
        logger.info(f"[create_cache_flow] duckdb_file_exists: {duckdb_file_exists}")
        print(f"[create_cache_flow] duckdb_file_exists: {duckdb_file_exists}")

        logger.info(f"[create_cache_flow] Connecting to Cache file directly at '{duckdb_file_path}'...")
        print(f"[create_cache_flow] Connecting to Cache file directly at '{duckdb_file_path}'...")

        # Creates file if it does not exist
        with duckdb.connect(duckdb_file_path) as file_conn:
            logger.info("[create_cache_flow] DuckDB connection established")
            print("[create_cache_flow] DuckDB connection established")
            
            logger.info("[create_cache_flow] Loading extensions...")
            load_extensions(write_conn=file_conn, dialect=dbdao.dialect, trex_sql=False)
            logger.info("[create_cache_flow] Extensions loaded")

            logger.info("[create_cache_flow] Attaching to source database...")
            attach_to_source_db(dbdao, file_conn, copy_params.source_database)
            logger.info("[create_cache_flow] Source database attached")

            if not duckdb_file_exists:
                # If the file doesn't exist do a one time copy of all schemas in database
                logger.info(
                    f"[create_cache_flow] Cache file does not exist. Copying all schemas from '{options.database_code}' to cache through direct file connection."
                )
                print(f"[create_cache_flow] Copying all schemas from '{options.database_code}'...")
                copy_all_schemas(file_conn, dbdao, copy_params)
                logger.info("[create_cache_flow] All schemas copied")

            else:
                # If the file exists, only update the schema passed into flow params
                logger.info(
                    f"[create_cache_flow] Cache file exists. Updating tables from '{options.database_code}'.'{options.schema_name}' schema to cache through direct file connection."
                )
                print(f"[create_cache_flow] Updating schema '{options.schema_name}'...")

                logger.info("[create_cache_flow] Creating schema if not exists...")
                create_schema_if_not_exists(file_conn, copy_params)

                logger.info("[create_cache_flow] Creating schema tables...")
                create_schema_tables(file_conn, dbdao, copy_params)
                logger.info("[create_cache_flow] Schema tables created")

                logger.info(
                    f"[create_cache_flow] Creating FTS index for '{options.schema_name}' schema in '{options.database_code}' through direct file connection.."
                )
                print(f"[create_cache_flow] Creating FTS index for '{options.schema_name}'...")

                create_fts_index(file_conn, copy_params)
                logger.info("[create_cache_flow] FTS index created")
        
        logger.info("[create_cache_flow] Direct file connection closed")
        print("[create_cache_flow] Cache creation completed successfully")


@flow(log_prints=True)
def create_cdw_validation_config_plugin(options: CreateCDWValidationConfig):
    logger = get_run_logger()
    
    print(f"[create_cdw_validation_config_plugin] Starting CDW validation config flow")
    logger.info(f"[create_cdw_validation_config_plugin] Starting flow with options: {options}")

    database_code = options.database_code
    schema_to_copy = options.schema_name
    use_cache_db = options.use_cache_db
    
    logger.info(f"[create_cdw_validation_config_plugin] database_code: {database_code}")
    logger.info(f"[create_cdw_validation_config_plugin] schema_to_copy: {schema_to_copy}")
    logger.info(f"[create_cdw_validation_config_plugin] use_cache_db: {use_cache_db}")

    cdw_db = "cdw_config_svc_validation_schema"
    logger.info(f"[create_cdw_validation_config_plugin] cdw_db: {cdw_db}")

    logger.info("[create_cdw_validation_config_plugin] Creating DBDao...")
    dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)
    logger.info(f"[create_cdw_validation_config_plugin] DBDao created with dialect: {dbdao.dialect}")

    check_supported_dialects(dbdao.dialect)
    logger.info("[create_cdw_validation_config_plugin] Dialect check passed")

    if dbdao.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        # Load Google service account credentials for BigQuery access.
        logger.info("[create_cdw_validation_config_plugin] Loading BigQuery credentials...")
        load_service_account_credentials()

    logger.info("[create_cdw_validation_config_plugin] Creating CopyParameters...")
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
    logger.info(f"[create_cdw_validation_config_plugin] CopyParameters created")
    print(f"[create_cdw_validation_config_plugin] CopyParameters: source={copy_params.source_database}, target={copy_params.target_database}")

    if options.trex_connection:
        logger.info("[create_cdw_validation_config_plugin] Using Trex connection mode")
        print("[create_cdw_validation_config_plugin] Using Trex connection mode")
        
        # Connect to cache through Trex Sql Interface assuming duckdb file already exists
        trex_sql_host = Variable.get("trex_sql_host")
        trex_sql_port = Variable.get("trex_sql_port")
        trex_sql_user = Variable.get("trex_sql_user")
        logger.info(f"[create_cdw_validation_config_plugin] Connecting to Trex at {trex_sql_host}:{trex_sql_port}")
        
        trex_conn = connect(
            host=trex_sql_host,
            port=trex_sql_port,
            user=trex_sql_user,
            password=Secret.load("trex-sql-password").get(),
            dbname=cdw_db,
        )
        logger.info("[create_cdw_validation_config_plugin] Trex connection established")
        print("[create_cdw_validation_config_plugin] Trex connection established")

        # Turn off transactions
        trex_conn.autocommit = True
        pg_cursor = None

        try:
            pg_cursor = trex_conn.cursor()
            logger.info("[create_cdw_validation_config_plugin] Cursor created")

            # Extensions should already be loaded in trex
            # load_extensions(write_conn=pg_cursor, dialect=dbdao.dialect, trex_sql=True)

            logger.info(
                f"[create_cdw_validation_config_plugin] Creating cache for '{schema_to_copy}' schema in '{database_code}' through Trex SQL interface..."
            )
            print(f"[create_cdw_validation_config_plugin] Creating cache for '{schema_to_copy}'...")

            logger.info("[create_cdw_validation_config_plugin] Creating schema if not exists...")
            create_schema_if_not_exists(pg_cursor, copy_params)
            
            logger.info("[create_cdw_validation_config_plugin] Creating schema tables...")
            create_schema_tables(pg_cursor, dbdao, copy_params)
            logger.info("[create_cdw_validation_config_plugin] Schema tables created")
            
        except Exception as e:
            logger.error(
                f"[create_cdw_validation_config_plugin] Error while creating cache for schema '{schema_to_copy}' for '{database_code}': {e}"
            )
            print(f"[create_cdw_validation_config_plugin] ERROR: {e}")
            # trex_conn.rollback()
            raise
        else:
            trex_conn.commit()
            logger.info(
                f"[create_cdw_validation_config_plugin] Cached schema '{schema_to_copy}' successfully updated from '{cdw_db}'."
            )
            print(f"[create_cdw_validation_config_plugin] Cache successfully created")
        finally:
            if pg_cursor:
                pg_cursor.close()
            trex_conn.close()
            logger.info("[create_cdw_validation_config_plugin] Trex connection closed")

    else:
        # Direct connection to cache
        logger.info("[create_cdw_validation_config_plugin] Using direct file connection mode")
        print("[create_cdw_validation_config_plugin] Using direct file connection mode")
        
        duckdb_data_folder = Variable.get("duckdb_data_folder")
        duckdb_file_path = resolve_duckdb_file_path(cdw_db, duckdb_data_folder)
        logger.info(f"[create_cdw_validation_config_plugin] duckdb_file_path: {duckdb_file_path}")
        print(f"[create_cdw_validation_config_plugin] duckdb_file_path: {duckdb_file_path}")

        # Creates file at duckdb_file_path if the file does not exist
        with duckdb.connect(duckdb_file_path) as file_conn:
            logger.info("[create_cdw_validation_config_plugin] DuckDB connection established")
            
            logger.info("[create_cdw_validation_config_plugin] Loading extensions...")
            load_extensions(write_conn=file_conn, dialect=dbdao.dialect, trex_sql=False)

            logger.info("[create_cdw_validation_config_plugin] Attaching to source database...")
            attach_to_source_db(dbdao, file_conn, copy_params.source_database)

            logger.info("[create_cdw_validation_config_plugin] Creating schema if not exists...")
            create_schema_if_not_exists(file_conn, copy_params)

            logger.info("[create_cdw_validation_config_plugin] Creating schema tables...")
            create_schema_tables(file_conn, dbdao, copy_params)

            logger.info(
                f"[create_cdw_validation_config_plugin] Creating FTS index for '{schema_to_copy}' schema in '{cdw_db}' through direct file connection.."
            )
            print(f"[create_cdw_validation_config_plugin] Creating FTS index...")

            create_fts_index(file_conn, copy_params)
            logger.info("[create_cdw_validation_config_plugin] FTS index created")
        
        logger.info("[create_cdw_validation_config_plugin] Direct file connection closed")
    
    logger.info("[create_cdw_validation_config_plugin] Flow completed successfully")
    print("[create_cdw_validation_config_plugin] Flow completed successfully")


@task(log_prints=True, task_run_name="attach_to_source_db_{read_conn.database_code}")
def attach_to_source_db(read_conn: any, write_conn: any, database_name: str):
    logger = get_run_logger()
    print(f"[attach_to_source_db] Starting attachment for database: {read_conn.database_code}")
    logger.info(f"[attach_to_source_db] Attaching to source database '{read_conn.database_code}' as '{database_name}'...")

    read_credentials = read_conn.tenant_configs
    logger.info(f"[attach_to_source_db] Dialect: {read_conn.dialect}")

    match read_conn.dialect:
        case SupportedDatabaseDialects.POSTGRES.value:
            logger.info("[attach_to_source_db] Using PostgreSQL attachment")
            attach_query = f"ATTACH 'dbname={read_credentials.databaseName} user={read_credentials.readUser} password={read_credentials.readPassword.get_secret_value()} host={read_credentials.host} port={read_credentials.port}' AS {database_name} (TYPE postgres, READ_ONLY);"
        case SupportedDatabaseDialects.BIGQUERY.value:
            logger.info("[attach_to_source_db] Using BigQuery attachment")
            attach_query = f"ATTACH 'project={read_credentials.host}' AS {database_name} (TYPE bigquery, READ_ONLY);"
        case _:
            raise ValueError(f"Unsupported dialect: {read_conn.dialect}")

    logger.info("[attach_to_source_db] Executing attach query...")
    execute_statement(write_conn, attach_query)

    logger.info(f"[attach_to_source_db] Successfully attached to source database '{read_conn.database_code}' as '{database_name}'!")
    print(f"[attach_to_source_db] Successfully attached to source database '{read_conn.database_code}'")


@task(log_prints=True, task_run_name="load_extensions_{dialect}")
def load_extensions(write_conn: any, dialect: str, trex_sql: bool = True):
    """
    Loads the necessary extensions based on the dialect and whether Trex SQL is used.
    """
    logger = get_run_logger()

    print(f"[load_extensions] Loading extensions for dialect: {dialect}, trex_sql: {trex_sql}")
    logger.info(f"[load_extensions] Loading extensions for dialect: {dialect}, trex_sql: {trex_sql}")

    if trex_sql:
        match dialect:
            case SupportedDatabaseDialects.POSTGRES.value:
                logger.info("[load_extensions] Loading Postgres extensions for Trex SQL.")
                execute_statement(write_conn, "LOAD postgres;")
                logger.info("[load_extensions] Postgres extensions loaded successfully.")

            case SupportedDatabaseDialects.BIGQUERY.value:
                logger.info("[load_extensions] Installing and loading BigQuery extensions for Trex SQL.")
                execute_statement(write_conn, "INSTALL bigquery FROM community;")
                execute_statement(write_conn, "LOAD bigquery;")
                logger.info("[load_extensions] BigQuery extensions loaded successfully.")
            case _:
                raise ValueError(f"Scan extension not supported for dialect: {dialect}")
    else:
        match dialect:
            case SupportedDatabaseDialects.POSTGRES.value:
                # Load postgres scan extensions offline
                logger.info("[load_extensions] Loading Postgres scan extension.")
                postgres_scan_extension_path = (
                    f"{DUCKDB_EXTENSIONS_FILEPATH}/postgres_scanner.duckdb_extension"
                )
                write_conn.load_extension(postgres_scan_extension_path)
                logger.info("[load_extensions] Postgres scan extension loaded successfully.")

            case SupportedDatabaseDialects.BIGQUERY.value:
                logger.info("[load_extensions] Installing and loading BigQuery scan extension.")
                # Todo: Requires internet connection
                write_conn.install_extension("bigquery", repository="community")
                write_conn.load_extension("bigquery")
                logger.info("[load_extensions] BigQuery scan extension loaded successfully.")
            case _:
                raise ValueError(f"Scan extension not supported for dialect: {dialect}")

    # Load FTS extension
    logger.info(f"[load_extensions] Loading FTS extension {'for Trex SQL' if trex_sql else 'for direct file connection'}...")
    if trex_sql:
        execute_statement(write_conn, "INSTALL fts;")
        execute_statement(write_conn, "LOAD fts;")
    else:
        fts_extension_path = f"{DUCKDB_EXTENSIONS_FILEPATH}/fts.duckdb_extension"
        write_conn.load_extension(fts_extension_path)
    logger.info("[load_extensions] FTS extension loaded successfully.")

    logger.info("[load_extensions] All extensions loaded successfully.")
    print("[load_extensions] All extensions loaded successfully.")
