import os
from psycopg2 import connect

from prefect import flow
from prefect.variables import Variable
from prefect.blocks.system import Secret
from prefect.logging import get_run_logger

from .duckdb_postgres import copy_schema_to_cache
from .config import CreateDuckdbDatabaseFileType
from .utils import check_supported_duckdb_dialects

from _shared_flow_utils.dao.DBDao import DBDao



os.environ['plugin_name'] = 'create_cachedb_fhir_plugin'

@flow(log_prints=True)
def create_cachedb_fhir_plugin(options: CreateDuckdbDatabaseFileType):
    logger = get_run_logger()

    dbdao = DBDao(use_cache_db=False,
                  database_code=options.databaseCode)

    # Check if dialect is supported by duckdb
    check_supported_duckdb_dialects(dbdao.dialect, logger)
    
    # Connect to Trex Sql Interface
    trex_conn = connect(
        host=Variable.get("trex_sql_host"),
        port=Variable.get("trex_sql_port"),
        user=Variable.get("trex_sql_user"),
        password=Secret.load("trex-sql-password").get(),
        dbname=options.databaseCode
    )

    # Turn off transactions
    trex_conn.autocommit = True
    pg_cursor = None
    
    try:
        logger.info(f"Copying source FHIR schema '{options.schemaName}' to cache as schema '{options.cacheSchemaName}'...")
        pg_cursor = trex_conn.cursor()

        # Update cache information
        pg_cursor.execute("CALL pg_clear_cache();")

        copy_schema_to_cache(pg_cursor, dbdao, options)
    except Exception as e:
        logger.error(
                f"Error while creating cache for source FHIR schema '{options.schemaName}' for '{options.databaseCode}': {e}"
            )
        # trex_conn.rollback()
        raise
    else:
        trex_conn.commit()
        logger.info(
                f"Cached schema '{options.schemaName}' successfully created for '{options.databaseCode}'."
            )
    finally:
        if pg_cursor:
            pg_cursor.close()
        trex_conn.close()