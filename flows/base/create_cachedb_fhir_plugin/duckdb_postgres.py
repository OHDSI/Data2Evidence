from prefect import task
from prefect.logging import get_run_logger
from prefect.context import TaskRunContext
from prefect.tasks import exponential_backoff
from prefect.variables import Variable
from prefect.blocks.system import Secret

from typing import Any
from psycopg2 import connect
import duckdb

from .config import CreateDuckdbDatabaseFileType

@task(retries=3, 
      retry_delay_seconds=exponential_backoff(backoff_factor=2),
      log_prints=True, 
      task_run_name="create_schema_if_not_exists_{options.cacheSchemaName}",
      timeout_seconds=int(Variable.get("cache_task_timeout")))
def create_schema_if_not_exists_task(use_trex_conn: bool, options: CreateDuckdbDatabaseFileType, duckdb_file_path: str):
    logger = get_run_logger()

    task_run_ctx = TaskRunContext.get()
    logger.info(f"This is task run attempt: {task_run_ctx.task_run.run_count} for task '{task_run_ctx.task.name}'.")

    if use_trex_conn:
        trex_conn = None
        pg_cursor = None

        try:
            trex_conn = connect(
                host=Variable.get("trex_sql_host"),
                port=Variable.get("trex_sql_port"),
                user=Variable.get("trex_sql_user"),
                password=Secret.load("trex-sql-password").get(),
                dbname=options.databaseCode,
            )
            trex_conn.autocommit = True
            pg_cursor = trex_conn.cursor()
            pg_cursor.execute("CALL pg_clear_cache();")

            # Create target schema if it doesn't exist
            pg_cursor.execute(
                f'CREATE SCHEMA IF NOT EXISTS "{options.databaseCode}"."{options.cacheSchemaName}";'
            )

        except Exception as e:
            logger.error(f"Failed to create schema through Trex SQL interface: {e}")
            raise
        finally:
            if pg_cursor:
                pg_cursor.close()
            if trex_conn:
                trex_conn.close()

    else:
        with duckdb.connect(duckdb_file_path) as file_conn:
            duckdb_file_exists = Path(duckdb_file_path).exists()

            if not duckdb_file_exists:
                file_conn.execute(f'CREATE SCHEMA IF NOT EXISTS "{options.databaseCode}"."{options.cacheSchemaName}";')

@task(log_prints=True)
def copy_schema_to_cache(con, dbdao: any, options: CreateDuckdbDatabaseFileType):
    logger = get_run_logger()
    logger.info(
        f"Copying FHIR tables from source schema '{options.schemaName}' to cache schema '{options.cacheSchemaName}'..."
    )
    created_tables = []
    try:
        con.execute(f'''CREATE SCHEMA IF NOT EXISTS "{options.databaseCode}"."{options.cacheSchemaName}";''')
        table_names = dbdao.get_table_names(options.schemaName)
        logger.info(f"Found {len(table_names)} tables to create in cache schema.")

        # Helper to safely quote identifiers and escape embedded quotes
        def qi(name: str) -> str:
            if name is None:
                return '""'
            return '"' + name.replace('"', '""') + '"'

        for table in table_names:
            try:
                logger.info(f"Creating empty cache table for: {table}")
                columns = dbdao.get_columns(options.schemaName, table)

                casted_columns = []
                for col in columns:
                    if col.lower() == 'content':
                        casted_columns.append(f"CAST({qi(col)} AS JSON) AS {qi(col)}")
                    else:
                        casted_columns.append(qi(col))

                select_columns = ', '.join(casted_columns)
                # Drop table if exists to ensure fresh create
                con.execute(f'DROP TABLE IF EXISTS "{options.databaseCode}"."{options.cacheSchemaName}"."{table}"')
                create_sql = f'CREATE TABLE "{options.databaseCode}"."{options.cacheSchemaName}"."{table}" AS FROM (SELECT {select_columns} FROM "{options.sourceDatabase}"."{options.schemaName}"."{table}" LIMIT 0)'
                con.execute(create_sql)
                created_tables.append(table)
            except Exception as e:
                logger.error(f"Table creation for '{options.schemaName}'.'{table}' failed with error: {e}")
                raise e

        return created_tables
    except Exception as err:
        logger.error(f"Table creation failed with error: {err}")
        raise (err)

@task(log_prints=True)
def create_indexes_for_tables(con, dbdao, schema_name, created_tables):
    logger = get_run_logger()
    try:
        for table in created_tables:
            try:
                indexes = dbdao.get_indexes_for_table(schema_name, table)
                for index in indexes:
                    index_name = index.get("name")
                    column_names = index.get("column_names")
                    columns_str = ', '.join(column_names)
                    unique = index.get("unique")
                    if unique:
                        index_query = f"CREATE UNIQUE INDEX {index_name} ON {schema_name}.{table} ({columns_str})"
                    else:
                        index_query = f"CREATE INDEX {index_name} ON {schema_name}.{table} ({columns_str})"
                    logger.info(f"Running query: {index_query}")
                    try:
                        con.execute(index_query)
                    except Exception as idx_err:
                        logger.warning(f"Index creation failed for {schema_name}.{table}: {idx_err}")
                pk_index = dbdao.get_indexes_for_pk(schema_name, table)
                pk_index_name = pk_index.get("name")
                pk_index_columns = pk_index.get("constrained_columns")
                if pk_index_name is not None and pk_index_columns != []:
                    pk_index_query = f"CREATE UNIQUE INDEX {pk_index_name} ON {schema_name}.{table} ({', '.join(pk_index_columns)})"
                    logger.info(f"Running query: {pk_index_query}")
                    try:
                        con.execute(pk_index_query)
                    except Exception as pk_idx_err:
                        logger.warning(f"PK index creation failed for {schema_name}.{table}: {pk_idx_err}")
            except Exception as e:
                logger.error(f"Index creation for table '{schema_name}.{table}' failed with error: {e}")
    except Exception as err:
        logger.error(f"Index creation failed with error: {err}")
        raise (err)



@task(retries=3, 
    retry_delay_seconds=exponential_backoff(backoff_factor=2),
    tags=["flow-level-concurrency"],
    log_prints=True, 
    task_run_name="create_schema_tables_from_{options.schemaName}",
    timeout_seconds=int(Variable.get("cache_task_timeout")))
def create_schema_tables_task(use_trex_conn: bool, read_conn: any, options: CreateDuckdbDatabaseFileType, duckdb_file_path: str):
    logger = get_run_logger()

    task_run_ctx = TaskRunContext.get()
    logger.info(f"This is task run attempt: {task_run_ctx.task_run.run_count} for task '{task_run_ctx.task.name}'.")

    if use_trex_conn:
        trex_conn = None
        pg_cursor = None
    
        try:
            trex_conn = connect(
                host=Variable.get("trex_sql_host"),
                port=Variable.get("trex_sql_port"),
                user=Variable.get("trex_sql_user"),
                password=Secret.load("trex-sql-password").get(),
                dbname=options.databaseCode,
            )
            trex_conn.autocommit = True
            pg_cursor = trex_conn.cursor()

            create_schema_tables(pg_cursor, read_conn, options, logger)

        except Exception as e:
            logger.error(f"Failed to copy schema tables through Trex SQL interface: {e}")
            raise
        finally:
            if pg_cursor:
                pg_cursor.close()
            if trex_conn:
                trex_conn.close()

    else:
        with duckdb.connect(duckdb_file_path) as file_conn:
            create_schema_tables(file_conn, read_conn, options, logger)


def create_schema_tables(write_conn: any, read_conn: any, options: CreateDuckdbDatabaseFileType, logger):
    source_schema = options.schemaName

    # Determine tables to copy
    source_tables = read_conn.get_table_names(source_schema)
    tables_to_copy = sorted(source_tables)

    for idx, table in enumerate(tables_to_copy, start=1):
        logger.info(f"[{idx}/{len(tables_to_copy)}] Creating table '{table}' from schema '{source_schema}'...")

        try:
            # Get column names from the source
            columns = read_conn.get_columns(source_schema, table)

            # Safely quote identifiers
            def qi(name: str) -> str:
                if name is None:
                    return '""'
                return '"' + name.replace('"', '""') + '"'

            casted_columns = []
            for col in columns:
                if col.lower() == 'content':
                    casted_columns.append(f"CAST({qi(col)} AS JSON) AS {qi(col)}")
                else:
                    casted_columns.append(qi(col))

            select_columns = ', '.join(casted_columns) if casted_columns else '*'

            target_table_q = f'"{options.databaseCode}"."{options.cacheSchemaName}"."{table}"'
            source_table_q = f'"{options.sourceDatabase}"."{options.schemaName}"."{table}"'

            # Drop any existing target table and create an empty table with the same columns
            write_conn.execute(f'DROP TABLE IF EXISTS {target_table_q}')
            create_sql = f'CREATE TABLE {target_table_q} AS SELECT {select_columns} FROM {source_table_q} LIMIT 0'
            logger.info(f"Running create SQL for table '{table}': {create_sql}")
            write_conn.execute(create_sql)

            # Do NOT copy rows here — create an empty target table with the
            # same columns. Row-level copying should be performed later using
            # project-scoped WHERE clauses so only project-specific rows are
            # selected.
            logger.info(f"Table '{table}' created empty (rows not copied).")
        except Exception as e:
            logger.error(f"Failed to create or copy table '{table}': {e}")
            raise