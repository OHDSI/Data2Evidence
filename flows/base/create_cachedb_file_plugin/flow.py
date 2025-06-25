import os
import duckdb
import psycopg2
from prefect import flow
from prefect.logging import get_run_logger

from .duckdb_fts import create_duckdb_fts_index
from .duckdb_postgres import copy_schema_to_cache
from .config import CreateDuckdbDatabaseFileType, CreateCDWValidationConfig

from .utils import resolve_duckdb_file_path, DUCKDB_EXTENSIONS_FILEPATH
from .utils import remove_existing_file_if_exists, check_supported_duckdb_dialects

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.dao.daobase import SYSTEM_SCHEMAS
from prefect.blocks.system import Secret
from prefect.variables import Variable

os.environ['plugin_name'] = 'create_cachedb_file_plugin'

@flow(log_prints=True)
def create_cachedb_file_plugin(options: CreateDuckdbDatabaseFileType):
    logger = get_run_logger()

    duckdb_database_name = options.databaseCode
    use_cache_db = options.use_cache_db
    tables_to_create_duckdb_fts_index = options.tablesToCreateDuckdbFtsIndex

    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=duckdb_database_name)

    # Check if dialect is supported by duckdb
    check_supported_duckdb_dialects(dbdao.dialect, logger)

    remove_existing_file_if_exists(duckdb_database_name, False, logger)
    duckdb_file_path = resolve_duckdb_file_path(duckdb_database_name, False)
    
    # Filter out system schemas
    schemas_to_copy = list(set(dbdao.get_schema_names()) -
                           set(SYSTEM_SCHEMAS[dbdao.dialect]))

    postgres_scan_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/postgres_scanner.duckdb_extension'
    fts_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/fts.duckdb_extension'

    # Connect to DuckDB file 
    with duckdb.connect(duckdb_file_path) as con:
        con.load_extension(postgres_scan_extension_path)
        con.load_extension(fts_extension_path)

        #Copy into duckdb file
        for schema in schemas_to_copy:
            logger.info(f"Handling schema {schema}...")
            copy_schema_to_cache(con, dbdao, schema, False)
            create_duckdb_fts_index(
                con, dbdao, schema, tables_to_create_duckdb_fts_index)        
            
    #Connect to Trex Sql Interface
    trex_conn = psycopg2.connect(
            host= Variable.get("trex_sql_host"),
            port=Variable.get("trex_sql_ports"),
            user=Variable.get("trex_sql_user"),
            password=Secret.load("trex-sql-password").get(),
            dbname=Variable.get("trex_sql_dbname")
        )
    cur = trex_conn.cursor()
    for schema in schemas_to_copy:
        logger.info(f"Handling schema {schema}...")
        copy_schema_to_cache(cur, dbdao, schema, False, True)
        create_duckdb_fts_index(
            cur, dbdao, schema, tables_to_create_duckdb_fts_index)
    cur.close()
    trex_conn.close()
    logger.info(
        f"""Duckdb database file: {duckdb_database_name} successfully created.""")


@flow(log_prints=True)
def create_cdw_validation_config_plugin(options: CreateCDWValidationConfig):

    logger = get_run_logger()
    database_code = options.databaseCode
    schema_name = options.schemaName
    use_cache_db = options.use_cache_db

    duckdb_database_name = "cdw_config_svc_validation_schema"
    dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)
    duckdb_file_path = resolve_duckdb_file_path(duckdb_database_name, True)

    # Check if dialect is supported by duckdb
    check_supported_duckdb_dialects(dbdao.dialect, logger)

    remove_existing_file_if_exists(duckdb_database_name, True, logger)

    postgres_scan_extension_path = f'{DUCKDB_EXTENSIONS_FILEPATH}/postgres_scanner.duckdb_extension'

    with duckdb.connect(duckdb_file_path) as con:
        con.load_extension(postgres_scan_extension_path)
        copy_schema_to_cache(con, dbdao, schema_name, True)
    con.close()
    
    #Connect to Trex Sql Interface
    trex_conn = psycopg2.connect(
        host=Variable.get("trex_sql_host"),
        port=Variable.get("trex_sql_ports"),
        user=Variable.get("trex_sql_user"),
        password=Secret.load("trex-sql-password").get(),
        dbname=Variable.get("trex_sql_dbname")
    )
    # Copy schema to cache
    cur = trex_conn.cursor()
    copy_schema_to_cache(cur, dbdao, schema_name, False, True)
    cur.close()
    trex_conn.close()
    logger.info(
        f"""Duckdb database file: {duckdb_database_name} successfully created.""")

if __name__ == '__main__':
    database_code = "alpdev_pg"
    schema_name = "cdmdefault"
    options = CreateDuckdbDatabaseFileType(databaseCode=database_code)
    create_cachedb_file_plugin(options)
