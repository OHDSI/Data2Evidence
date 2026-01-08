import traceback
from typing import Any

from prefect import task
from prefect.logging import get_run_logger

from .fts import create_fts_index
from .types import CopyParameters, QueryColumns, _COPY_STATUS_TABLE_NAME
from .utils import execute_statement, set_bigquery_global_settings, VOCAB_TABLES
from .filter import filter_tables, _CDM_COLUMN_FILTER_MAP, _CHUNK_COLUMN_MAP
from _shared_flow_utils.types import SupportedDatabaseDialects
import sqlalchemy as sql

@task(log_prints=True, task_run_name="create_cache_status_table")
def create_cache_status_table(con, copy_params):
    # Create status table
    execute_statement(con, f'''
        CREATE TABLE IF NOT EXISTS "{copy_params.target_database}"."{copy_params.target_schema}"."{_COPY_STATUS_TABLE_NAME}" (
          table_name TEXT PRIMARY KEY,
          status TEXT,
          started_at TIMESTAMP,
          completed_at TIMESTAMP
        );
    ''')

def mark_in_progress(con, table: str, copy_params):
    execute_statement(con, f"""
        INSERT INTO "{copy_params.target_database}"."{copy_params.target_schema}"."{_COPY_STATUS_TABLE_NAME}"
        (table_name, status, started_at)
        VALUES ('{table}', 'IN_PROGRESS', CAST(NOW() AS TIMESTAMP))
        ON CONFLICT(table_name) DO UPDATE
        SET status = 'IN_PROGRESS',
            started_at = CAST(NOW() AS TIMESTAMP),
            completed_at = NULL
        """
    )

def mark_complete(con, table: str, copy_params):
    execute_statement(con, f""" UPDATE "{copy_params.target_database}"."{copy_params.target_schema}"."{_COPY_STATUS_TABLE_NAME}"
        SET status = 'COMPLETE', completed_at = CAST(NOW() AS TIMESTAMP)
        WHERE table_name = '{table}'
        """
    )

def cleanup(con, table: str, copy_params):
    execute_statement(con, f"DROP TABLE IF EXISTS \"{copy_params.target_database}\".\"{copy_params.target_schema}\".\"{table}\"")
    execute_statement(con, f"""
        UPDATE "{copy_params.target_database}"."{copy_params.target_schema}"."{_COPY_STATUS_TABLE_NAME}"
        SET status = 'FAILED'
        WHERE table_name = '{table}'
        """
    )

@task(log_prints=True, task_run_name="drop_cache_status_table")
def drop_cache_status_table(con, copy_params):
    execute_statement(con, f'DROP TABLE "{copy_params.target_database}"."{copy_params.target_schema}"."{_COPY_STATUS_TABLE_NAME}";') 

@task(log_prints=True, task_run_name="copy_all_schemas_from_{read_conn.database_code}")
def copy_all_schemas(write_conn: Any, read_conn: Any, copy_params: CopyParameters):
    logger = get_run_logger()
    logger.info(f"Starting schema copy for database '{read_conn.database_code}'...")
    schemas_to_copy = sorted(read_conn.get_schema_names())
    logger.info(f"Found {len(schemas_to_copy)} schemas: {schemas_to_copy}")

    failed_schemas = []

    for idx, schema in enumerate(schemas_to_copy, start=1):
        logger.info(f"[{idx}/{len(schemas_to_copy)}] Copying schema '{schema}'...")
        try:
            create_schema_if_not_exists(write_conn, copy_params)
            create_schema_tables(write_conn, read_conn, copy_params)
        except Exception as e:
            logger.error(f"Failed to copy schema '{schema}': {e}")
            logger.error(traceback.format_exc())
            failed_schemas.append(schema)
            continue

        try:
            create_fts_index(write_conn, read_conn, copy_params)
        except Exception as e:
            logger.error(f"Failed to create FTS index for schema '{schema}': {e}")
            logger.error(traceback.format_exc())
            failed_schemas.append(schema)

    total = len(schemas_to_copy)
    success = total - len(failed_schemas)
    logger.info(f"Finished copying schemas: Total={total}, Successful={success}, Failed={len(failed_schemas)}")
    if failed_schemas:
        logger.error(f"Schemas failed: {', '.join(failed_schemas)}")

@task(log_prints=True, task_run_name="create_schema_if_not_exists_{copy_params.target_schema}")
def create_schema_if_not_exists(write_conn: Any, copy_params: CopyParameters):
    logger = get_run_logger()
    sql = f'CREATE SCHEMA IF NOT EXISTS "{copy_params.target_database}"."{copy_params.target_schema}";'
    execute_statement(write_conn, sql)
    logger.info(f"Schema '{copy_params.target_schema}' ensured.")

@task(log_prints=True, task_run_name="create_schema_tables_from_{copy_params.source_schema}", tags=["flow-level-concurrency"])
def create_schema_tables(write_conn: Any, read_conn: Any, copy_params: CopyParameters):
    logger = get_run_logger()
    logger.info(f"Starting creation of schema '{copy_params.target_schema}' in database '{copy_params.target_database}' if it doesn't exist...")

    source_schema = copy_params.source_schema

    # Create status table
    create_cache_status_table(write_conn, copy_params)

    # Check for already completed tables
    completed_tables = set()
    try:
        write_conn.execute(f"""
            SELECT table_name
            FROM "{copy_params.target_database}"."{copy_params.target_schema}"."{_COPY_STATUS_TABLE_NAME}"
            WHERE status = 'COMPLETE'
        """)
        result = write_conn.fetchall()
        completed_tables = {row[0] for row in result}
        logger.info(f"Found {len(completed_tables)} already completed tables: {completed_tables}")
    except Exception:
        logger.error("Could not fetch completed tables from status tracking table.")
        raise Exception("Could not fetch completed tables from status tracking table.")

    # Determine tables to copy
    source_tables = copy_params.table_filter.keys() if copy_params.table_filter else read_conn.get_table_names(source_schema)
    tables_to_copy = sorted(filter_tables(source_tables))
    
    has_separate_vocab_schema = False

    # Handle vocabulary tables if vocab_schema is provided
    if copy_params.vocab_schema and copy_params.vocab_schema != copy_params.source_schema:
        has_separate_vocab_schema = True
        logger.info(f"Vocabulary schema '{copy_params.vocab_schema}' provided - will copy vocab tables from this schema instead of '{copy_params.source_schema}'")
        
        # Remove vocab tables from current schema copy
        tables_to_copy = [table for table in tables_to_copy if table not in VOCAB_TABLES]

        logger.info(
            f"Found {len(tables_to_copy)} tables/views to copy from schema '{copy_params.source_schema}': {tables_to_copy}"
        )
        
        # Add vocab tables to copy from vocab_schema
        vocab_tables_in_schema = read_conn.get_table_names(copy_params.vocab_schema)
        vocab_tables_to_copy = [table for table in VOCAB_TABLES if table in vocab_tables_in_schema]
        
        logger.info(
            f"Found {len(vocab_tables_to_copy)} vocab tables/views to copy from schema '{copy_params.vocab_schema}': {vocab_tables_to_copy}"
        )

        tables_to_copy.extend(vocab_tables_to_copy)
    else:
        if copy_params.vocab_schema:
            logger.info(f"Vocabulary schema '{copy_params.vocab_schema}' is the same as source schema - copying all tables including vocab tables")
        else:
            logger.info("No vocabulary schema provided - copying all tables from source schema")

        logger.info(
            f"Found {len(tables_to_copy)} tables/views to copy from schema '{copy_params.source_schema}': {tables_to_copy}"
        )

    # Filter out already completed tables
    original_count = len(tables_to_copy)
    tables_to_copy = [t for t in tables_to_copy if t not in completed_tables]
    skipped_count = original_count - len(tables_to_copy)
    logger.info(f"Found {len(tables_to_copy)} tables to copy in schema '{source_schema}'.")
    logger.info(f"Total tables in source schema: {original_count}")
    logger.info(f"Tables to copy: {tables_to_copy}")
    if skipped_count > 0:
        logger.info(f"Skipping {skipped_count} already completed tables.")

    # BigQuery-specific global settings
    if read_conn.tenant_configs.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        execute_statement(write_conn, set_bigquery_global_settings())

    msg = f"Beginning table copy for schema '{copy_params.source_schema}'"
    if has_separate_vocab_schema:
        msg += f" with separate vocab schema '{copy_params.vocab_schema}'"
    logger.info(msg)

    for idx, table in enumerate(tables_to_copy, start=1):
        # Determine which schema this table should be copied from
        source_schema_for_table = copy_params.vocab_schema if (has_separate_vocab_schema and table in VOCAB_TABLES) else copy_params.source_schema

        logger.info(
            f"[{idx}/{len(tables_to_copy)}] Copying table '{table}' from schema '{source_schema_for_table}'..."
        )

        # Determine columns to copy for the current table
        source_columns = copy_params.table_filter.get(table) if copy_params.table_filter else None
        columns_to_copy = source_columns if source_columns else ["*"]

        patient_col = _CDM_COLUMN_FILTER_MAP.get(table, {}).get("person_id_column")
        timestamp_col = _CDM_COLUMN_FILTER_MAP.get(table, {}).get("timestamp_column")

        query_columns = QueryColumns(
            table=table,
            columns_to_copy=columns_to_copy,
            patient_filter_col=patient_col if patient_col in columns_to_copy else None,
            timestamp_filter_col=timestamp_col if timestamp_col in columns_to_copy else None
        )

        # Call copy_table directly
        copy_table_task(write_conn, read_conn, copy_params, query_columns, source_schema_for_table)

        # Call copy_indexes directly
        copy_indexes(write_conn, read_conn, copy_params, query_columns, source_schema_for_table, logger)

    # All tables copied successfully, drop the status tracking table
    drop_cache_status_table(write_conn, copy_params)

def create_empty_target_table(write_conn: Any, copy_params: CopyParameters, query_columns: QueryColumns, source_schema: str):
    select_sql = create_select_query(copy_params, query_columns, source_schema, None)
    execute_statement(write_conn, f'DROP TABLE IF EXISTS "{copy_params.target_database}"."{copy_params.target_schema}"."{query_columns.table}";')
    sql = f"""
    CREATE TABLE "{copy_params.target_database}"."{copy_params.target_schema}"."{query_columns.table}" AS
    SELECT * FROM ({select_sql}) WHERE 1=0;
    """
    execute_statement(write_conn, sql)

def determine_chunk_size(dialect: str, row_count: int | None, chunk_size: int | None = None) -> int:
    if chunk_size is not None:
        return chunk_size
    if dialect == SupportedDatabaseDialects.BIGQUERY.value:
        return 5_000_000
    if row_count and row_count > 100_000_000:
        return 1_000_000
    return 1_000_000

def plan_chunks(read_conn: Any, database: str, schema: str, table: str, chunk_col: str, chunk_size: int, row_count: int | None, logger=None):
    min_val = None
    max_val = None

    try:
        # Determine table path and column quoting based on dialect
        dialect = read_conn.tenant_configs.dialect
        if dialect == SupportedDatabaseDialects.BIGQUERY.value:
            table_path = f'`{schema}.{table}`'
            col_quote = ''
        else:
            table_path = f'"{schema}"."{table}"'
            col_quote = '"'
        with read_conn.engine.connect() as connection:
            query = sql.text(f'SELECT MIN({col_quote}{chunk_col}{col_quote}), MAX({col_quote}{chunk_col}{col_quote}) FROM {table_path}')
            result = connection.execute(query).fetchone()
            if result:
                min_val, max_val = result
        
    except Exception as e:
        logger.warning(f"Failed to get min/max for '{table}' from source: {e}")
        min_val = None

    if min_val is None or max_val is None:
        logger.info(f"Chunk column '{chunk_col}' has no valid values. Cannot chunk.")
        return None

    # Try to convert to int; if fails (e.g., for dates), don't chunk
    try:
        min_val = int(min_val)
        max_val = int(max_val)
    except (ValueError, TypeError):
        logger.info(f"Chunk column '{chunk_col}' is not numeric. Cannot chunk.")
        return None

    chunks = []
    current = min_val
    while current <= max_val:
        end = min(current + chunk_size - 1, max_val)
        chunks.append(f'"{chunk_col}" BETWEEN {current} AND {end}')
        current = end + 1
    
    if row_count and len(chunks) > 0:
        avg_rows_per_chunk = row_count / len(chunks)
        if avg_rows_per_chunk > (chunk_size * 2):
            logger.info(f"Data is too dense for range chunking (avg {int(avg_rows_per_chunk)} rows/chunk vs target {chunk_size}). Cannot chunk efficiently.")
            return None
        else:
            logger.info(f"Planned {len(chunks)} chunks for table '{table}': chunk_size={chunk_size}")
            return chunks
    else:
         logger.info(f"Planned {len(chunks)} chunks for table '{table}': chunk_size={chunk_size}")
         return chunks

def copy_table_chunk(write_conn: Any, copy_params: CopyParameters, query_columns: QueryColumns, source_schema: str, where_sql: str | tuple, chunk_id: int, total_chunks: int, logger=None):
    logger.info(f"Copying chunk {chunk_id + 1}/{total_chunks} for table '{query_columns.table}'")
    select_sql = create_select_query(copy_params, query_columns, source_schema, where_sql)
    insert_sql = f"""INSERT INTO "{copy_params.target_database}"."{copy_params.target_schema}"."{query_columns.table}"{select_sql};"""
    execute_statement(write_conn, insert_sql)

@task(log_prints=True, task_run_name="copy_table_{query_columns.table}", tags=["table-level-concurrency"])
def copy_table_task(write_conn: Any, read_conn: Any, copy_params: CopyParameters, query_columns: QueryColumns, source_schema: str):
    logger = get_run_logger()
    copy_table(write_conn, read_conn, copy_params, query_columns, source_schema, logger)

def copy_table(write_conn: Any, read_conn: Any, copy_params: CopyParameters, query_columns: QueryColumns, source_schema: str, logger=None):
    table = query_columns.table
    dialect = read_conn.tenant_configs.dialect
    try:
        mark_in_progress(write_conn, table, copy_params)
        row_count = read_conn.get_table_row_count(source_schema, table)
        logger.info(f"Starting copy of table '{table}' with {row_count} rows")
        chunks = None
        if row_count < 500000:
            logger.info(f"Copying table '{table}' (small, {row_count} rows)")
            select_sql = create_select_query(copy_params, query_columns, source_schema)
            execute_statement(write_conn, f'CREATE OR REPLACE TABLE "{copy_params.target_database}"."{copy_params.target_schema}"."{table}" AS {select_sql}')
            mark_complete(write_conn, table, copy_params)
            return row_count
        else:
            create_empty_target_table(write_conn, copy_params, query_columns, source_schema)
            # If columns_to_copy is "*", replace with actual column names for proper chunking
            if query_columns.columns_to_copy == ["*"]:
                actual_columns = read_conn.get_columns(source_schema, table)
                # Update filter columns based on actual columns (case-insensitive match)
                patient_col = _CDM_COLUMN_FILTER_MAP.get(table, {}).get("person_id_column")
                timestamp_col = _CDM_COLUMN_FILTER_MAP.get(table, {}).get("timestamp_column")
                
                updated_patient_filter_col = find_column_case_insensitive(actual_columns, patient_col) or query_columns.patient_filter_col
                updated_timestamp_filter_col = find_column_case_insensitive(actual_columns, timestamp_col) or query_columns.timestamp_filter_col
                
                query_columns = QueryColumns(
                    table=query_columns.table,
                    columns_to_copy=actual_columns,
                    patient_filter_col=updated_patient_filter_col,
                    timestamp_filter_col=updated_timestamp_filter_col
                )

            # Determine chunk column from _CHUNK_COLUMN_MAP
            chunk_col_name = _CHUNK_COLUMN_MAP.get(table)
            if chunk_col_name:
                chunk_col = find_column_case_insensitive(query_columns.columns_to_copy, chunk_col_name)
            else:
                chunk_col = None
                logger.info(f"Table '{table}': no chunk_col_name in map")

            if chunk_col:
                chunk_size = determine_chunk_size(dialect, row_count, chunk_size=copy_params.chunk_size)
                logger.info(f"Table '{table}': using chunk column '{chunk_col}' with chunk size {chunk_size}")
                chunks = plan_chunks(read_conn, copy_params.source_database, source_schema, table, chunk_col, chunk_size, row_count, logger)

                if chunks is None:
                    # Chunking failed or inefficient - fallback to one-go copy
                    logger.warning(f"Cannot chunk table '{table}' ({row_count} rows) efficiently. Falling back to one-go copy.")
                    select_sql = create_select_query(copy_params, query_columns, source_schema)
                    execute_statement(write_conn, f'CREATE OR REPLACE TABLE "{copy_params.target_database}"."{copy_params.target_schema}"."{table}" AS {select_sql}')
                else:
                    # Loop over chunks sequentially
                    for i, chunk_where in enumerate(chunks):
                        copy_table_chunk(write_conn, copy_params, query_columns, source_schema, chunk_where, i, len(chunks), logger)
            else:
                # No suitable chunk column, copy the whole table in one go
                logger.info(f"Copying table '{table}' in one go (no chunk column)")
                select_sql = create_select_query(copy_params, query_columns, source_schema)
                execute_statement(write_conn, f'CREATE OR REPLACE TABLE "{copy_params.target_database}"."{copy_params.target_schema}"."{table}" AS {select_sql}')

            mark_complete(write_conn, table, copy_params)
            return row_count
    except Exception as e:
        logger.error(f"Table copy for table '{table}' failed with error: {e}")
        cleanup(write_conn, table, copy_params)
        raise e

def create_select_query(copy_params: CopyParameters, query_columns: QueryColumns, source_schema: str, where_sql: str | tuple = None) -> str:
    columns_to_copy = query_columns.columns_to_copy
    table = query_columns.table
    database = copy_params.source_database
    schema = source_schema

    if not columns_to_copy or columns_to_copy == ["*"]:
        columns_sql = "*"
    else:
        columns_sql = ", ".join(f'"{col}"' for col in columns_to_copy)

    base_query = f'SELECT {columns_sql} FROM "{database}"."{schema}"."{table}"'

    has_where = False

    # Handle where_sql for chunking
    if where_sql:
        has_where = True
        if isinstance(where_sql, str):
            # Column-based chunk: e.g., "person_id BETWEEN 1 AND 1000"
            base_query += f" WHERE {where_sql}"
        elif isinstance(where_sql, tuple) and len(where_sql) == 2:
            # Offset-based chunk: Use LIMIT/OFFSET for better pushdown
            start, end = where_sql
            limit = end - start + 1
            offset = start - 1
            base_query = f"""
            SELECT {columns_sql} FROM (
                SELECT {columns_sql} FROM "{database}"."{schema}"."{table}"
                LIMIT {limit} OFFSET {offset}
            ) t
            """
            has_where = False

    # Add patient and timestamp filters
    filters = []
    if query_columns.patient_filter_col and copy_params.patient_filter:
        ids = ", ".join(str(int(pid)) for pid in copy_params.patient_filter)
        filters.append(f"{query_columns.patient_filter_col} IN ({ids})")
    if query_columns.timestamp_filter_col and copy_params.timestamp_filter:
        ts_value = str(copy_params.timestamp_filter).replace("'", "''")
        filters.append(f"{query_columns.timestamp_filter_col} = '{ts_value}'")

    if filters:
        base_query += (" AND " if has_where else " WHERE ") + " AND ".join(filters)
    
    return base_query

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
        CREATE {"UNIQUE" if unique else ""} INDEX IF NOT EXISTS {index_name} 
        ON "{database_name}"."{schema_name}"."{table_name}" ({columns_str});
        '''

def copy_indexes(write_conn: Any, read_conn: Any, copy_params: CopyParameters, query_columns: QueryColumns, source_schema : str, logger = None):
    table = query_columns.table
    columns_to_copy = query_columns.columns_to_copy

    if columns_to_copy == ["*"]:
        columns_to_copy = read_conn.get_columns(source_schema, table)

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

def find_column_case_insensitive(columns: list[str], target: str) -> str | None:
    if not target:
        return None
    for col in columns:
        if col.lower() == target.lower():
            return col
    return None