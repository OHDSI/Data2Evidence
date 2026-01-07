import sqlalchemy as sql

from typing import Any
from _shared_flow_utils.types import SupportedDatabaseDialects

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


def find_column_case_insensitive(columns: list[str], target: str) -> str | None:
    if not target:
        return None
    for col in columns:
        if col.lower() == target.lower():
            return col
    return None