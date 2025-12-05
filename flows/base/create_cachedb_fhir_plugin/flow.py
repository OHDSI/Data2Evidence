import os
import psycopg2
from prefect import flow
from prefect.logging import get_run_logger

from .duckdb_postgres import copy_schema_to_cache, create_indexes_for_tables
from .config import CreateDuckdbDatabaseFileType

from .utils import check_supported_duckdb_dialects

from _shared_flow_utils.dao.DBDao import DBDao
from prefect.blocks.system import Secret
from prefect.variables import Variable

os.environ['plugin_name'] = 'create_cachedb_fhir_plugin'

@flow(log_prints=True)
def create_cachedb_fhir_plugin(options: CreateDuckdbDatabaseFileType):
    logger = get_run_logger()
    duckdb_database_name = options.databaseCode
    schema_name = options.schemaName
    cache_schema_name = options.cacheSchemaName
    dbdao = DBDao(use_cache_db=False,
                database_code=duckdb_database_name)

    # Check if dialect is supported by duckdb
    check_supported_duckdb_dialects(dbdao.dialect, logger)
    #Connect to Trex Sql Interface
    trex_conn = psycopg2.connect(
            host= Variable.get("trex_sql_host"),
            port=Variable.get("trex_sql_port"),
            user=Variable.get("trex_sql_user"),
            password=Secret.load("trex-sql-password").get(),
            dbname=Variable.get("trex_sql_dbname")
        )
    cur = None
    try:
        logger.info(f"Copying FHIR schema '{schema_name}' to cache as schema '{cache_schema_name}'...")
        cur = trex_conn.cursor()
        created_tables = copy_schema_to_cache(cur, dbdao, schema_name, cache_schema_name)
    except Exception as e:
        logger.error(f"Error creating cachedb fhir plugin: {e}")
        raise e
    else:
        trex_conn.commit()
        logger.info(
            f"""Duckdb database file: {duckdb_database_name} successfully created.""")
    finally:
        if cur:
            cur.close()
        trex_conn.close()