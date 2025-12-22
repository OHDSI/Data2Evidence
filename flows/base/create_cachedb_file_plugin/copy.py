import traceback
from typing import Any

from prefect import task
from prefect.logging import get_run_logger

from .fts import create_fts_index
from .types import CopyParameters, QueryColumns
from .utils import execute_statement, set_bigquery_global_settings, VOCAB_TABLES
from .filter import filter_tables, filter_columns, _CDM_COLUMN_FILTER_MAP
from _shared_flow_utils.types import SupportedDatabaseDialects


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
    sql = f'CREATE SCHEMA IF NOT EXISTS "{copy_params.target_schema}";'
    execute_statement(write_conn, sql)
    logger.info(f"Schema '{copy_params.target_schema}' ensured.")

@task(log_prints=True, task_run_name="create_schema_tables_from_{copy_params.source_schema}")
def create_schema_tables(write_conn: Any, read_conn: Any, copy_params: CopyParameters):
    logger = get_run_logger()
    source_schema = copy_params.source_schema

    source_tables = copy_params.table_filter.keys() if copy_params.table_filter else read_conn.get_table_names(source_schema)
    tables_to_copy = sorted(filter_tables(source_tables))

    # Handle vocabulary tables
    if copy_params.vocab_schema:
        if copy_params.vocab_schema != source_schema:
            logger.info(f"Copy vocab tables from '{copy_params.vocab_schema}'")
            tables_to_copy = [t for t in tables_to_copy if t not in VOCAB_TABLES]
            vocab_tables = [t for t in VOCAB_TABLES if t in read_conn.get_table_names(copy_params.vocab_schema)]
            tables_to_copy.extend(vocab_tables)
    logger.info(f"Tables to copy: {tables_to_copy}")

    # BigQuery-specific global settings
    if read_conn.tenant_configs.dialect == SupportedDatabaseDialects.BIGQUERY.value:
        execute_statement(write_conn, set_bigquery_global_settings())

    # Prepare lists for mapping
    source_schema_list = []
    query_columns_list = []
    for table in tables_to_copy:
        source_schema_for_table = copy_params.vocab_schema if copy_params.vocab_schema and table in VOCAB_TABLES else source_schema
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
        source_schema_list.append(source_schema_for_table)
        query_columns_list.append(query_columns)

    # Map copy_table over tables
    table_tasks = copy_table.map(
        write_conn=[write_conn] * len(tables_to_copy),
        read_conn=[read_conn] * len(tables_to_copy),
        copy_params=[copy_params] * len(tables_to_copy),
        query_columns=query_columns_list,
        source_schema=source_schema_list,
        logger=[logger] * len(tables_to_copy)
    )

    # Wait for table copy tasks to complete
    for task in table_tasks:
        task.result()

    # Map copy_indexes over tables
    index_tasks = copy_indexes.map(
        write_conn=[write_conn] * len(tables_to_copy),
        read_conn=[read_conn] * len(tables_to_copy),
        copy_params=[copy_params] * len(tables_to_copy),
        query_columns=query_columns_list,
        source_schema=source_schema_list,
        logger=[logger] * len(tables_to_copy)
    )

    # Wait for index copy tasks to complete
    for task in index_tasks:
        task.result()


def create_empty_target_table(write_conn, copy_params, query_columns, source_schema):
    select_sql = create_select_query(copy_params, query_columns, source_schema, None)
    execute_statement(write_conn, f'DROP TABLE IF EXISTS "{copy_params.target_schema}"."{query_columns.table}";')
    sql = f"""
    CREATE TABLE "{copy_params.target_schema}"."{query_columns.table}" AS
    SELECT * FROM ({select_sql}) WHERE 1=0;
    """
    execute_statement(write_conn, sql)


def determine_chunk_size(dialect: str, estimated_rows: int | None):
    if dialect == SupportedDatabaseDialects.BIGQUERY.value:
        return 5_000_000
    if estimated_rows and estimated_rows > 100_000_000:
        return 1_000_000
    return 250_000


def plan_chunks(write_conn, database, schema, table, chunk_col, chunk_size, estimated_rows, logger=None):
    if chunk_col:
        min_val = execute_statement(write_conn, f'SELECT MIN("{chunk_col}") FROM "{database}"."{schema}"."{table}"')[0][0]
        max_val = execute_statement(write_conn, f'SELECT MAX("{chunk_col}") FROM "{database}"."{schema}"."{table}"')[0][0]
        if min_val is None or max_val is None:
            return []

        chunks = []
        current = min_val
        while current <= max_val:
            end = min(current + chunk_size - 1, max_val)
            chunks.append(f'"{chunk_col}" BETWEEN {current} AND {end}')
            current = end + 1
        return chunks

    # No column → ROW_NUMBER() based chunks
    if not estimated_rows:
        estimated_rows = execute_statement(write_conn, f'SELECT COUNT(*) FROM "{database}"."{schema}"."{table}"')[0][0]
    num_chunks = (estimated_rows + chunk_size - 1) // chunk_size
    chunks = [(i * chunk_size + 1, min((i + 1) * chunk_size, estimated_rows)) for i in range(num_chunks)]
    logger.info(f"Planned {len(chunks)} chunks for table '{table}'.")
    return chunks


@task(log_prints=True, tags=["chunk-level-concurrency"], task_run_name="copy_table_chunk_{query_columns.table}_{chunk_id}")
def copy_table_chunk(write_conn, copy_params, query_columns, source_schema, where_sql: str | tuple, chunk_id: int, total_chunks: int, logger=None):
    logger.info(f"Copying chunk {chunk_id + 1}/{total_chunks} for table '{query_columns.table}'")
    select_sql = create_select_query(copy_params, query_columns, source_schema, where_sql)
    insert_sql = f"""
    INSERT INTO "{copy_params.target_schema}"."{query_columns.table}"
    {select_sql};
    """
    execute_statement(write_conn, insert_sql)


@task(log_prints=True, tags=["table-level-concurrency"], task_run_name="copy_table_{query_columns.table}")
def copy_table(write_conn, read_conn, copy_params, query_columns, source_schema, logger):
    table = query_columns.table
    dialect = read_conn.tenant_configs.dialect

    create_empty_target_table(write_conn, copy_params, query_columns, source_schema)
    estimated_rows = read_conn.get_table_row_count(source_schema, table)
    logger.info(f"Starting copy of table '{table}' with {estimated_rows} rows")
    
    if estimated_rows < 50000:
        logger.info(f"Copying table '{table}' (small, {estimated_rows} rows)")
        select_sql = create_select_query(copy_params, query_columns, source_schema)
        execute_statement(write_conn, f'INSERT INTO "{copy_params.target_database}"."{copy_params.target_schema}"."{table}" {select_sql}')
        return estimated_rows

    # If columns_to_copy is "*", replace with actual column names for proper chunking
    if query_columns.columns_to_copy == ["*"]:
        actual_columns = read_conn.get_columns(source_schema, table)
        query_columns = QueryColumns(
            table=query_columns.table,
            columns_to_copy=actual_columns,
            patient_filter_col=query_columns.patient_filter_col,
            timestamp_filter_col=query_columns.timestamp_filter_col
        )

    chunk_col = query_columns.timestamp_filter_col or query_columns.patient_filter_col
    # if not chunk_col:
    #     pk_index = read_conn.get_indexes_for_pk(source_schema, table)
    #     if pk_index and pk_index.get("constrained_columns"):
    #         chunk_col = pk_index["constrained_columns"][0]

    chunk_size = determine_chunk_size(dialect, estimated_rows)
    chunks = plan_chunks(write_conn, copy_params.source_database, source_schema, table, chunk_col, chunk_size, estimated_rows, logger)

    mapped_tasks = copy_table_chunk.map(
        write_conn=[write_conn] * len(chunks),
        copy_params=[copy_params] * len(chunks),
        query_columns=[query_columns] * len(chunks),
        source_schema=[source_schema] * len(chunks),
        where_sql=chunks,
        chunk_id=list(range(len(chunks))),
        total_chunks=[len(chunks)] * len(chunks),
        logger=[logger] * len(chunks)
    )
    # Wait for all chunks
    for t in mapped_tasks:
        t.result()

    return estimated_rows


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
            # Offset-based chunk: ROW_NUMBER() BETWEEN start AND end
            start, end = where_sql
            base_query = f"""
            SELECT {columns_sql} FROM (
                SELECT {columns_sql}, ROW_NUMBER() OVER () AS row_num
                FROM "{database}"."{schema}"."{table}"
            ) t
            WHERE row_num BETWEEN {start} AND {end}
            """

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

@task(log_prints=True, tags=["table-level-concurrency"], task_run_name="copy_indexes_{query_columns.table}")
def copy_indexes(write_conn, read_conn, copy_params, query_columns, source_schema, logger):
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
