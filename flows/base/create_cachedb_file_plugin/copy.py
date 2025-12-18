import traceback
from sqlglot import select, exp
from typing import Any

from prefect import task
from prefect.logging import get_run_logger

from .fts import create_fts_index
from .types import CopyParameters, QueryColumns

from .utils import execute_statement, set_bigquery_global_settings, VOCAB_TABLES
from .filter import filter_tables, filter_columns, _CDM_COLUMN_FILTER_MAP

from _shared_flow_utils.types import SupportedDatabaseDialects


@task(log_prints=True, task_run_name="copy_all_schemas_from_{read_conn.database_code}")
def copy_all_schemas(
    write_conn: Any,
    read_conn: Any,
    copy_params: CopyParameters,
):
    logger = get_run_logger()

    logger.info(
        f"Starting schema copy for all schemas in database '{read_conn.database_code}'..."
    )

    schemas_to_copy = sorted(read_conn.get_schema_names())

    logger.info(f"Found {len(schemas_to_copy)} schemas to copy: {schemas_to_copy}")

    failed_schemas = []

    for idx, schema in enumerate(schemas_to_copy, start=1):

        logger.info(f"[{idx}/{len(schemas_to_copy)}] Copying schema '{schema}'...")

        try:
            create_schema_if_not_exists(write_conn, copy_params)
            create_schema_tables(write_conn, read_conn, copy_params)
            logger.info(f"Schema '{schema}' tables copied successfully.")

        except Exception as e:
            logger.error(f"Failed to copy tables for schema '{schema}': {e}")
            logger.error(traceback.format_exc())
            failed_schemas.append(schema)
            continue

        try:
            create_fts_index(write_conn, read_conn, copy_params)
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


@task(log_prints=True, task_run_name="create_schema_if_not_exists_{copy_params.target_schema}")
def create_schema_if_not_exists(
    write_conn: any,
    copy_params: CopyParameters,
) -> None:
    logger = get_run_logger()

    logger.info(
        f"Starting creation of schema '{copy_params.target_schema}' in database '{copy_params.target_database}' if it doesn't exist..."
    )

    execute_statement(
        write_conn, create_schema_query(copy_params.target_database, copy_params.target_schema)
    )

    logger.info("Creation of schema completed successfully.")


@task(log_prints=True, task_run_name="create_schema_tables_from_{copy_params.source_schema}")
def create_schema_tables(
    write_conn: any,
    read_conn: any,
    copy_params: CopyParameters
) -> None:
    
    logger = get_run_logger()

    logger.info(
        f"Starting creation of tables from '{copy_params.source_database}'.'{copy_params.source_schema}' schema to '{copy_params.target_database}'.'{copy_params.target_schema}'..."
    )

    if copy_params.table_filter:
        source_tables = copy_params.table_filter.keys()
    else:
        source_tables = read_conn.get_table_names(copy_params.source_schema)

    # Filter out system tables that may appear in some databases
    tables_to_copy = sorted(filter_tables(source_tables))

    # Handle vocabulary tables if vocab_schema is provided
    if copy_params.vocab_schema:
        # If vocab_schema is different from source_schema, copy vocab tables from vocab_schema
        if copy_params.vocab_schema != copy_params.source_schema:
            logger.info(f"Vocabulary schema '{copy_params.vocab_schema}' provided - will copy vocab tables from this schema instead of '{copy_params.source_schema}'")
            # Remove vocab tables from current schema copy
            tables_to_copy = [table for table in tables_to_copy if table not in VOCAB_TABLES]
            # Add vocab tables to copy from vocab_schema
            vocab_tables_in_schema = read_conn.get_table_names(copy_params.vocab_schema)
            vocab_tables_to_copy = [table for table in VOCAB_TABLES if table in vocab_tables_in_schema]
            tables_to_copy.extend(vocab_tables_to_copy)
        else:
            logger.info(f"Vocabulary schema '{copy_params.vocab_schema}' is the same as source schema - copying all tables including vocab tables")
    else:
        logger.info("No vocabulary schema provided - copying all tables from source schema")

    logger.info(
        f"Found {len(tables_to_copy)} tables/views to copy in schema '{copy_params.source_schema}': {tables_to_copy}"
    )

    if read_conn.tenant_configs.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        logger.debug("Setting BigQuery-specific DuckDB connection settings.")
        execute_statement(write_conn, set_bigquery_global_settings())

    logger.info(f"Beginning table copy for schema '{copy_params.source_schema}'.")

    for idx, table in enumerate(tables_to_copy, start=1):
        # Determine which schema this table should be copied from
        source_schema_for_table = copy_params.vocab_schema if (copy_params.vocab_schema and table in VOCAB_TABLES) else copy_params.source_schema

        logger.info(
            f"[{idx}/{len(tables_to_copy)}] Copying table '{table}' from schema '{source_schema_for_table}'..."
        )

        # Determine columns to copy for the current table
        source_columns = copy_params.table_filter.get(table) if copy_params.table_filter else None
        if not source_columns:
            source_columns = ["*"]

        columns_to_copy = source_columns

        patient_filter_col, timestamp_filter_col = (lambda x: (
            x.get(table, {}).get("person_id_column"),
            x.get(table, {}).get("timestamp_column")
        ))(_CDM_COLUMN_FILTER_MAP)

        query_columns = QueryColumns(
            table=table,
            columns_to_copy=columns_to_copy,
            patient_filter_col=None if patient_filter_col not in columns_to_copy else patient_filter_col,
            timestamp_filter_col=None if timestamp_filter_col not in columns_to_copy else timestamp_filter_col
        )

        try:
            rows_copied = copy_table(write_conn, copy_params, query_columns, source_schema_for_table, logger)

            copy_indexes(write_conn, read_conn, copy_params, query_columns, source_schema_for_table, logger)

            logger.info(
                f"Table '{table}' in '{copy_params.target_database}'.'{copy_params.target_schema}' schema created with {rows_copied} rows."
            )
        except Exception as e:
            logger.error(
                f"[{table}] Error copying table and indexes from '{copy_params.source_database}'.'{copy_params.source_schema}' schema to '{copy_params.target_database}'.'{copy_params.target_schema}' schema: {e}"
            )
            logger.error(traceback.format_exc())
            
            raise
        else:
            logger.info(
                f"[{table}] Successfully copied table and indexes from schema '{copy_params.source_database}'.'{copy_params.source_schema}' schema to '{copy_params.target_database}'.'{copy_params.target_schema}' schema."
            )

@task(log_prints=True, tags=["create_cachedb_fhir_plugin-concurrency"], task_run_name="copy_table_{query_columns.table}")
def copy_table(write_conn: Any, copy_params: CopyParameters, query_columns: QueryColumns, source_schema: str, logger) -> int:    
    select_source_statement = create_select_query(copy_params, query_columns, source_schema)
    
    create_table_statement = create_or_replace_table_query(copy_params, query_columns.table, select_source_statement)
    
    execute_statement(write_conn, create_table_statement)
    
    row_count_query = get_row_count_query(copy_params.target_database, copy_params.target_schema, query_columns.table)
    
    write_conn.execute(row_count_query)
    
    rows_copied = write_conn.fetchall()[0][0]

    return rows_copied

@task(log_prints=True, tags=["create_cachedb_file_plugin_concurrency"], task_run_name="copy_indexes_{query_columns.table}")
def copy_indexes(write_conn: Any, read_conn: Any, copy_params: CopyParameters, query_columns: QueryColumns, source_schema: str, logger):
    table = query_columns.table
    columns_to_copy = query_columns.columns_to_copy

    target_database = copy_params.target_database
    target_schema = copy_params.target_schema   


    indexes = read_conn.get_indexes_for_table(source_schema, table)
    
    if not indexes:
        logger.info(
            f"No indexes found for table '{table}'. Skipping index copy."
        )
    else:
        logger.info(f"Found {len(indexes)} indexes for table '{table}'.")
        
        for index in indexes:
            if not set(index.get('column_names')).issubset(set(columns_to_copy)):
                logger.info(
                    f"Skipping index '{index.get('name')}' on columns {index.get('column_names')} as these columns were not copied."
                )
                continue
            else:
                logger.debug(
                    f"Creating index '{index.get('name')}' on columns {index.get('column_names')} (unique={index.get('unique')}) for table '{table}'."
                )

                execute_statement(
                    write_conn,
                    create_index_query(
                        target_database,
                        target_schema,
                        table,
                        index.get("name"),
                        index.get("column_names"),
                        index.get("unique"),
                    ),
                )

                logger.info(
                    f"{'Unique' if index.get('unique') else 'Non-unique'} index '{index.get('name')}' created for table '{table}' on columns {index.get('column_names')}."
                )

    pk_index = read_conn.get_indexes_for_pk(source_schema, table)
    pk_index_name = pk_index.get("name")
    pk_index_columns = pk_index.get("constrained_columns")
    
    if not pk_index_name and not pk_index_columns:
        logger.info(
            f"No primary key index found for table '{table}'. Skipping primary index copy"
        )

    elif not set(pk_index_columns).issubset(set(columns_to_copy)):
        logger.info(
            f"Skipping primary key index '{pk_index_name}' on columns {pk_index_columns} as these columns were not copied."
        )
    else:
        if pk_index_name is not None and pk_index_columns != []:
            logger.debug(
                f"Creating primary key index '{pk_index_name}' on columns {pk_index_columns} for table '{table}'."
            )
            execute_statement(
                write_conn,
                create_index_query(
                    target_database,
                    target_schema,
                    table,
                    pk_index_name,
                    pk_index_columns,
                    unique=True,
                ),
            )
            logger.info(
                f"Primary Key Index '{pk_index_name}' copied for table '{table}' in schema '{target_database}'.'{target_schema}'."
            )


def create_schema_query(database_name: str, schema_name: str) -> str:
    return f'CREATE SCHEMA IF NOT EXISTS "{database_name}"."{schema_name}";'


def get_row_count_query(database_name: str, schema_name: str, table_name: str) -> str:
    return f'SELECT COUNT(*) FROM "{database_name}"."{schema_name}"."{table_name}";'


def create_or_replace_table_query(
    copy_params: CopyParameters,
    table: str,
    select_statement: str,
) -> str:
    return f'''
        CREATE OR REPLACE TABLE "{copy_params.target_database}"."{copy_params.target_schema}"."{table}" 
        AS FROM ({select_statement}){copy_params.limit_statement};
        '''

def create_select_query(copy_params: CopyParameters, query_columns: QueryColumns, source_schema: str) -> str:
    where_condition = None

    columns_to_copy = query_columns.columns_to_copy
    timestamp_filter_col = query_columns.timestamp_filter_col
    patient_filter_col = query_columns.patient_filter_col
    patient_filter_values = copy_params.patient_filter
    timestamp_filter_value = copy_params.timestamp_filter

    database = copy_params.source_database
    schema = source_schema
    table = query_columns.table

    if patient_filter_col is not None and patient_filter_values is not None:
        where_condition = exp.Column(this=patient_filter_col).isin(
            *patient_filter_values
        )

    if timestamp_filter_col is not None and timestamp_filter_value is not None:
        where_condition = (
            (
                where_condition & exp.Column(this=timestamp_filter_col)
                == timestamp_filter_value
            )
            if where_condition
            else exp.Column(this=timestamp_filter_col) == timestamp_filter_value
        )

    if where_condition is not None:
        sql_expression = (
            select(*columns_to_copy)
            .from_(f"{database}.{schema}.{table}")
            .where(where_condition)
        )
    else:
        sql_expression = select(*columns_to_copy).from_(
            f"{database}.{schema}.{table}"
        )
    return sql_expression.sql(dialect="duckdb")


def create_index_query(
    database_name: str,
    schema_name: str,
    table_name: str,
    index_name: str,
    column_names: list[str],
    unique: bool = False,
) -> str:
    # by default indexes created on columns in asc order
    columns_str = ", ".join(column_names)
    return f'''
        CREATE OR REPLACE {"UNIQUE" if unique else ""} INDEX {index_name} 
        ON "{database_name}"."{schema_name}"."{table_name}" ({columns_str});
        '''


