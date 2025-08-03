import os
import psycopg2
from prefect import flow
from prefect.logging import get_run_logger

from .duckdb_postgres import copy_schema_to_cache
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
    dbdao = DBDao(use_cache_db=False,
                  database_code=duckdb_database_name)

    # Check if dialect is supported by duckdb
    check_supported_duckdb_dialects(dbdao.dialect, logger)
    #Connect to Trex Sql Interface
    trex_conn = psycopg2.connect(
            host= Variable.get("trex_sql_host"),
            port=Variable.get("trex_sql_ports"),
            user=Variable.get("trex_sql_user"),
            password=Secret.load("trex-sql-password").get(),
            dbname=Variable.get("trex_sql_dbname")
        )
    cur = trex_conn.cursor()
    logger.info(f"Handling schema {schema_name}...")
    copy_schema_to_cache(cur, dbdao, schema_name, False, True)
    cur.close()
    trex_conn.close()
    logger.info(
        f"""Duckdb database file: {duckdb_database_name} successfully created.""")

if __name__ == '__main__':
    database_code = "fhir"
    schema_name = "public"
    options = CreateDuckdbDatabaseFileType(databaseCode=database_code)
    create_cachedb_fhir_plugin(options)
