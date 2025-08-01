import os
import psycopg2
from prefect import flow
from prefect.logging import get_run_logger

from .duckdb_postgres import copy_schema_to_cache
from .config import CreateDuckdbDatabaseFileType

from _shared_flow_utils.dao.DBDao import DBDao
from prefect.blocks.system import Secret
from prefect.variables import Variable

os.environ['plugin_name'] = 'create_cache_big_query_plugin'

@flow(log_prints=True)
def create_cache_big_query_plugin(options: CreateDuckdbDatabaseFileType):
    logger = get_run_logger()

    database_code = options.databaseCode

    dbdao = DBDao(use_cache_db=False,
                  database_code=database_code)
    #Connect to Trex Sql Interface
    trex_conn = psycopg2.connect(
            host= Variable.get("trex_sql_host"),
            port=Variable.get("trex_sql_ports"),
            user=Variable.get("trex_sql_user"),
            password=Secret.load("trex-sql-password").get(),
            dbname=Variable.get("trex_sql_dbname")
        )
    #set the google service account credentials to connect to BigQuery
    google_service_account_json_path = Secret.load("google-service-account-json").get()
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = google_service_account_json_path
    # Create cache schema
    cur = trex_conn.cursor()
    copy_schema_to_cache(cur, dbdao)
    cur.close()
    trex_conn.close()
    logger.info(
        f"""Cache for {database_code} successfully created.""")