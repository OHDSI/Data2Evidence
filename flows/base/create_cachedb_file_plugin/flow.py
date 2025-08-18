import os
import duckdb
from pathlib import Path
from psycopg2 import connect

from .fts import create_fts_index
from .bigquery_copy import copy_bigquery_schema_to_cache
from .copy import copy_all_schemas, create_schema_tables
from .config import CreateDuckdbDatabaseFileType, CreateCDWValidationConfig
from .utils import resolve_duckdb_file_path, DUCKDB_EXTENSIONS_FILEPATH, load_service_account_credentials, execute_statement, check_supported_dialects


from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.types import SupportedDatabaseDialects

from prefect import flow, task
from prefect.variables import Variable
from prefect.blocks.system import Secret
from prefect.logging import get_run_logger

os.environ['plugin_name'] = 'create_cachedb_file_plugin'


@flow(log_prints=True)
def create_cachedb_file_plugin(options: CreateDuckdbDatabaseFileType):
    logger = get_run_logger()

    duckdb_database_name = options.databaseCode
    schema_to_copy = options.schemaName
    use_cache_db = options.use_cache_db

    batch_size = options.batch_size

    # Todo: Edit back after testing
    tables_to_create_duckdb_fts_index = options.tablesToCreateDuckdbFtsIndex

    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=duckdb_database_name)
    
    # Check if dialect is supported by duckdb
    check_supported_dialects(dbdao.dialect)

    if dbdao.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        # Load Google service account credentials for BigQuery access.
        load_service_account_credentials()
     
    if options.create_duckdb_file:
        # Direct connection to cache
        duckdb_file_path = resolve_duckdb_file_path(duckdb_database_name, Variable.get("duckdb_data_folder"))
        
        duckdb_file_exists = Path(duckdb_file_path).exists()

        # Creates file at duckdb_file_path if the file does not exist
        with duckdb.connect(duckdb_file_path) as file_conn:

            load_extensions(write_conn=file_conn, 
                            dialect=dbdao.dialect,
                            trex_sql=False)

            if not duckdb_file_exists:
                # If the file doesn't exist do a one time copy of all schemas in database
                logger.info(f"DuckDB file does not exist. Copying all schemas from '{duckdb_database_name}' to file.")
                copy_all_schemas(file_conn, dbdao, tables_to_create_duckdb_fts_index)

            else:
                # If the file exists, only update the schema passed into flow params
                logger.info(f"DuckDB file exists. Updating tables from '{duckdb_database_name}.{schema_to_copy}' schema to file.")
                create_schema_tables(write_conn=file_conn, 
                                     read_conn=dbdao, 
                                     schema=schema_to_copy,
                                     create_cdw_config=False)
                
                create_fts_index(write_conn=file_conn, 
                                 read_conn=dbdao, 
                                 schema=schema_to_copy, 
                                 fts_tables_input=tables_to_create_duckdb_fts_index)



    else:
        # Connect to cache through Trex Sql Interface assuming duckdb file already exists
        trex_conn = connect(
            host= Variable.get("trex_sql_host"),
            port=Variable.get("trex_sql_port"),
            user=Variable.get("trex_sql_user"),
            password=Secret.load("trex-sql-password").get(),
            dbname=duckdb_database_name 
        )

        # Turn off transactions
        trex_conn.autocommit = True
        pg_cursor = None

        try:
            pg_cursor = trex_conn.cursor()

            load_extensions(write_conn=pg_cursor, 
                            dialect=dbdao.dialect,
                            trex_sql=True)
        
            logger.info(f"Creating schema tables for '{schema_to_copy}' schema in '{duckdb_database_name}' through Trex Sql Interface...")
            if dbdao.dialect == SupportedDatabaseDialects.BIGQUERY.value:
                # If the dialect is bigquery and through trex conn
                copy_bigquery_schema_to_cache(write_conn=pg_cursor,
                                              read_conn=dbdao, 
                                              schema=schema_to_copy,
                                              batch_size=batch_size)
            else:
                # For common implementation across all dialects and connections
                
                create_schema_tables(write_conn=pg_cursor,
                                     read_conn=dbdao, 
                                     schema=schema_to_copy,
                                     create_cdw_config=False)

            logger.info(f"Creating FTS index for '{schema_to_copy}' schema in '{duckdb_database_name}' through Trex Sql Interface...")
            create_fts_index(write_conn=pg_cursor,
                             read_conn=dbdao, 
                             schema=schema_to_copy, 
                             fts_tables_input=tables_to_create_duckdb_fts_index)

        except Exception as e:
            logger.error(f"Error while creating updating schema '{schema_to_copy}' from '{duckdb_database_name}': {e}")
            # trex_conn.rollback()
            raise e
        
        else:
            trex_conn.commit()
            logger.info(f"Cached schema '{schema_to_copy}' successfully updated from '{duckdb_database_name}'.")
        
        finally:
            if pg_cursor:
                pg_cursor.close()
            trex_conn.close()


@flow(log_prints=True)
def create_cdw_validation_config_plugin(options: CreateCDWValidationConfig):
    logger = get_run_logger()

    database_code = options.databaseCode
    schema_to_copy = options.schemaName
    use_cache_db = options.use_cache_db

    duckdb_database_name = "cdw_config_svc_validation_schema"

    dbdao = DBDao(use_cache_db=use_cache_db, 
                  database_code=database_code)

    check_supported_dialects(dbdao.dialect)

    if dbdao.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        # Load Google service account credentials for BigQuery access.
        load_service_account_credentials()

    if options.create_duckdb_file:
        # Direct connection to cache
        duckdb_file_path = resolve_duckdb_file_path(duckdb_database_name, Variable.get("duckdb_data_folder"))

        # Creates file at duckdb_file_path if the file does not exist
        with duckdb.connect(duckdb_file_path) as file_conn:

            load_extensions(write_conn=file_conn, 
                            dialect=dbdao.dialect,
                            trex_sql=False)
            
            create_schema_tables(write_conn=file_conn,
                                 read_conn=dbdao, 
                                 schema=schema_to_copy,
                                 create_cdw_config=True)

    else:
        # Connect to cache through Trex Sql Interface assuming duckdb file already exists
        trex_conn = connect(
            host= Variable.get("trex_sql_host"),
            port=Variable.get("trex_sql_port"),
            user=Variable.get("trex_sql_user"),
            password=Secret.load("trex-sql-password").get(),
            dbname=duckdb_database_name 
        )

        # Turn off transactions
        trex_conn.autocommit = True
        pg_cursor = None

        try:
            pg_cursor = trex_conn.cursor()

            load_extensions(write_conn=pg_cursor, 
                            dialect=dbdao.dialect,
                            trex_sql=False)

            logger.info(f"Updating schema '{schema_to_copy}' from '{duckdb_database_name}' through Trex Sql Interface...")
            create_schema_tables(write_conn=pg_cursor,
                                 read_conn=dbdao, 
                                 schema=schema_to_copy,
                                 create_cdw_config=True)

        except Exception as e:
            logger.error(f"Error while updating cached schema '{schema_to_copy}' from '{duckdb_database_name}': {e}")
            # trex_conn.rollback()
            raise
        
        else:
            trex_conn.commit()
            logger.info(f"Cached schema '{schema_to_copy}' successfully updated from '{duckdb_database_name}'.")
        
        finally:
            if pg_cursor:
                pg_cursor.close()
            trex_conn.close()




@task(log_prints=True)
def load_extensions(write_conn: any, dialect: str, trex_sql: bool = True):
    '''
    Loads the necessary extensions based on the dialect and whether Trex SQL is used.
    '''
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
                execute_statement(write_conn, "INSTALL bigquery FROM community; LOAD bigquery;")
                logger.debug("BigQuery extensions loaded successfully.")
            case _:
                raise ValueError(f"Scan extension not supported for dialect: {dialect}")
    else:
        match dialect:
            case SupportedDatabaseDialects.POSTGRES.value:
                # Load postgres scan extensions offline
                logger.debug("Loading Postgres scan extension.")
                postgres_scan_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/postgres_scanner.duckdb_extension'
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
        execute_statement(write_conn, "INSTALL fts; LOAD fts;")
    else:
        fts_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/fts.duckdb_extension'
        write_conn.load_extension(fts_extension_path)
        logger.debug("FTS extension loaded successfully.")

    logger.info("All extensions loaded successfully.")
    
    
    


