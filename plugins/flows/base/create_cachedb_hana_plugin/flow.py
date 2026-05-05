import os
from pathlib import Path
import time

from psycopg2 import connect
from prefect import flow, task
from prefect.variables import Variable
from prefect.blocks.system import Secret
from prefect.logging import get_run_logger

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.types import SupportedDatabaseDialects

from .types import CreateHanaCacheOptions, HanaCacheFlowAction


os.environ["plugin_name"] = "create_cachedb_hana_plugin"


@flow(log_prints=True)
def create_cachedb_hana_plugin(options: CreateHanaCacheOptions):
    time.sleep(60)  # Sleep to ensure logs are not interleaved when multiple cache creation flows are triggered at the same time
    match options.flow_action_type:
        case HanaCacheFlowAction.CREATE_HANA_CACHE:
            create_hana_cache_flow(options)


def create_hana_cache_flow(options: CreateHanaCacheOptions):
    logger = get_run_logger()

    database_code = options.database_code
    schema_name = options.schema_name.upper()

    src_dao = DBDao(use_cache_db=False, database_code=database_code)
    if src_dao.dialect != SupportedDatabaseDialects.HANA.value:
        raise ValueError(
            f"create_cachedb_hana_plugin requires a HANA dataset, "
            f"got dialect '{src_dao.dialect}' for database_code '{database_code}'"
        )

    logger.info(
        f"Creating DuckDB cache for HANA dataset '{database_code}', schema '{schema_name}'"
    )

    create_schema_via_trex(database_code, schema_name)


@task(log_prints=True, task_run_name="create_hana_cache_schema_{schema_name}")
def create_schema_via_trex(database_code: str, schema_name: str):
    logger = get_run_logger()

    # Trex's pgwire layer does not auto-attach a DuckDB cache catalog for
    # HANA-dialect datasets, so we ATTACH the cache file ourselves before
    # CREATE SCHEMA. Trex's pgwire ATTACH won't create the .db file (likely
    # due to a read-only restriction), but a direct duckdb.connect() from this
    # process does — and the Prefect runner shares the same volume as Trex.
    # duckdb_data_folder = Variable.get("duckdb_data_folder")
    # duckdb_file_path = str(Path(duckdb_data_folder) / f"{database_code}.db")

    trex_conn = connect(
        host=Variable.get("trex_sql_host"),
        port=Variable.get("trex_sql_port"),
        user=Variable.get("trex_sql_user"),
        password=Secret.load("trex-sql-password").get(),
        dbname=database_code,
    )

    trex_cur = trex_conn.cursor()
    trex_cur.execute("CALL pg_clear_cache();")

    # attach_sql = (
    #     f"ATTACH IF NOT EXISTS '{duckdb_file_path}' AS \"{database_code}\";"
    # )
    # logger.info(f"Executing: {attach_sql}")
    # trex_cur.execute(attach_sql)

    sql = f'CREATE SCHEMA IF NOT EXISTS "{database_code}"."{schema_name}";'
    trex_cur.execute(sql)
    logger.info(f"Schema '{schema_name}' in database '{database_code}' created.")
