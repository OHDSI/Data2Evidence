import traceback
from prefect import task
from prefect.logging import get_run_logger

from .fts import create_fts_index
from .utils import execute_statement

from _shared_flow_utils.types import SupportedDatabaseDialects


@task(log_prints=True, task_run_name="copy_all_schemas_{read_conn.database_code}")
def copy_all_schemas(write_conn: any, read_conn: any, tables_to_create_duckdb_fts_index: list[str]):
    logger = get_run_logger()
    
    logger.info(f"Starting schema copy for all schemas in database '{read_conn.database_code}'...")
    schemas_to_copy = sorted(read_conn.get_schema_names())
    logger.info(f"Found {len(schemas_to_copy)} schemas to copy: {schemas_to_copy}")

    failed_schemas = []

    for idx, schema in enumerate(schemas_to_copy, start=1):
        logger.info(f"[{idx}/{len(schemas_to_copy)}] Copying schema '{schema}'...")
        try:
            create_schema_tables(write_conn, read_conn, schema)
            logger.info(f"Schema '{schema}' tables copied successfully.")
        except Exception as e:
            logger.error(f"Failed to copy tables for schema '{schema}': {e}")
            logger.error(traceback.format_exc())
            failed_schemas.append(schema)
            continue

        try:
            create_fts_index(write_conn, read_conn, schema, tables_to_create_duckdb_fts_index)
            logger.info(f"FTS index created for schema '{schema}'.")
        except Exception as e:
            logger.error(f"Failed to create FTS index for schema '{schema}': {e}")
            logger.error(traceback.format_exc())
            failed_schemas.append(schema)
            continue

        logger.info(f"Schema '{schema}' processed successfully.")

    total_schemas = len(schemas_to_copy)
    successful_schemas = total_schemas - len(failed_schemas)
    logger.info(
        f"Finished processing all schemas for database '{read_conn.database_code}'. "
        f"Total: {total_schemas}, Successful: {successful_schemas}, Failed: {len(failed_schemas)}."
    )

    if failed_schemas:
        logger.error(
            f"Schema copy failed for the following schemas: {', '.join(failed_schemas)}"
        )
    else:
        logger.info("All schemas copied and indexed successfully.")



@task(log_prints=True, task_run_name="create_schema_tables_{schema}")
def create_schema_tables(write_conn: any, 
                         read_conn: any, 
                         schema: str, 
                         create_cdw_config: bool = False):
    """
    Create or replace the schema tables from the source database to the DuckDB file.
    """
    logger = get_run_logger()
    logger.info(f"Starting creation of tables for schema '{schema}' in database '{read_conn.database_code}'.")

    limit_statement = "LIMIT 0" if create_cdw_config else ""

    logger.debug(f"Executing schema creation query for '{schema}'.")
    execute_statement(write_conn, create_schema_query(schema))

    tables_to_copy = sorted(read_conn.get_table_names(
        schema, include_views=create_cdw_config
    ))
    logger.info(f"Found {len(tables_to_copy)} tables/views to copy in schema '{schema}': {tables_to_copy}")

    if read_conn.tenant_configs.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        logger.debug("Setting BigQuery-specific DuckDB connection settings.")
        # Todo: For duckdb upgrade >= 1.3.2
        # execute_statement(write_conn, set_bigquery_global_settings())

    logger.info(f"Beginning table copy for schema '{schema}'.")

    for idx, table in enumerate(tables_to_copy, start=1):
        logger.info(f"[{idx}/{len(tables_to_copy)}] Copying table '{table}' in schema '{schema}'...")
        try: 
            query = create_or_replace_table_query(
                source_schema=schema,
                source_table=table,
                source_credentials=read_conn.tenant_configs,
                limit_statement=limit_statement
            )
            
            logger.debug(f"Create/replace table query for '{table}': {query}")

            table_creation_time = execute_statement(write_conn, query)

            row_count_query = f"SELECT COUNT(*) FROM {schema}.{table};"
            logger.debug(f"Row count query for '{table}': {row_count_query}")
            write_conn.execute(row_count_query)
            rows_copied = write_conn.fetchall()[0][0]

            logger.info(
                f"Table '{table}' in schema '{schema}' created with {rows_copied} rows. Execution took {table_creation_time} seconds."
            )

            # Sync indexes
            indexes = read_conn.get_indexes_for_table(schema, table)
            logger.info(f"Found {len(indexes)} indexes for table '{table}'.")

            for index in indexes:
                logger.debug(f"Creating index '{index.get('name')}' on columns {index.get('column_names')} (unique={index.get('unique')}) for table '{table}'.")
                execute_statement(write_conn, create_index_query(
                    schema,
                    table,
                    index.get("name"),
                    index.get("column_names"),
                    index.get("unique")
                ))
                logger.info(
                    f"{'Unique' if index.get('unique') else 'Non-unique'} index '{index.get('name')}' created for table '{table}' on columns {index.get('column_names')}."
                )

            pk_index = read_conn.get_indexes_for_pk(schema, table)
            pk_index_name = pk_index.get("name")
            pk_index_columns = pk_index.get("constrained_columns")

            if pk_index_name is not None and pk_index_columns != []:
                logger.debug(f"Creating primary key index '{pk_index_name}' on columns {pk_index_columns} for table '{table}'.")
                execute_statement(write_conn, create_index_query(
                    schema,
                    table,
                    pk_index_name,
                    pk_index_columns,
                    unique=True
                ))
                logger.info(
                    f"Primary Key Index '{pk_index_name}' recreated for table '{table}' in schema '{schema}'."
                )

        except Exception as e:
            logger.error(f"Error copying table '{table}' from schema '{schema}': {e}")
            logger.error(traceback.format_exc())
            logger.error(f"Failed to copy table '{table}' from schema '{schema}'. See above for details.")
            raise
        else:
            logger.info(
                f"[{table}] Table and indexes from schema '{read_conn.database_code}.{schema}' copied successfully."
            )


def create_schema_query(schema_name: str) -> str:
    return f'CREATE SCHEMA IF NOT EXISTS "{schema_name}";'


def create_or_replace_table_query(source_schema: str,
                                  source_table: str,
                                  source_credentials: dict,
                                  limit_statement: str) -> str:    
    project_name = source_credentials.host
    select_statement = None
    match source_credentials.dialect:
        case SupportedDatabaseDialects.POSTGRES.value:
            select_statement = f'SELECT * FROM postgres_scan("host={source_credentials.host} port={source_credentials.port} dbname={source_credentials.databaseCode} user={source_credentials.readUser} password={source_credentials.readPassword.get_secret_value()}", "{source_schema}", "{source_table}")'
        case SupportedDatabaseDialects.BIGQUERY.value:
            # Todo: Change to use `bigquery_arrow_scan` when duckdb upgrade >= 1.3.2
            select_statement = f"SELECT * FROM bigquery_scan('{project_name}.{source_schema}.{source_table}')"
        case _:
            raise ValueError(f"Unsupported dialect: {source_credentials.dialect}")

    return f'CREATE OR REPLACE TABLE "{source_schema}"."{source_table}" AS FROM ({select_statement}) {limit_statement};'


def create_index_query(schema_name: str,
                       table_name: str,
                       index_name: str,
                       column_names: list[str],
                       unique: bool = False) -> str:  
    # by default indexes created on columns in asc order
    columns_str = ", ".join(column_names)
    return f'''CREATE {"UNIQUE" if unique else ""} INDEX {index_name} ON "{schema_name}"."{table_name}" ({columns_str});'''


def set_bigquery_global_settings():
    """
    Set BigQuery specific settings for the DuckDB connection.
    """
    return """
    SET bq_arrow_compression='ZSTD'; 
    SET bq_experimental_use_incubating_scan=TRUE;
    """