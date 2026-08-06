"""Source-side statistics for chunk planning: dialect SQL and adapters.

This module must never import prefect: the pure planner test suite imports it
from a bare virtualenv. ``sqlalchemy`` and ``_shared_flow_utils.types`` are
imported lazily, inside the adapter code that needs them, for the same reason --
the SQL builders and candidate pickers below stay importable with neither
installed.

BigQuery identifiers follow the plugin's existing convention: ``schema`` is the
dataset and the connection supplies the project, so a table is written
```dataset.table``` with no project prefix. This mirrors the behaviour of the
pre-rewrite ``chunk_utils.plan_chunks`` (see ``git show 2a48cbb96``), so
switching to these builders does not change which table a query resolves to.
"""

import re

from .errors import PlannerError

# Identifiers reach the SQL text by interpolation, because neither dataset,
# table nor column can be a bind parameter in any of these statements. So the
# only defence is to refuse anything that is not a plain unquoted identifier.
_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_$]*$")


def _check_identifier(value: str, what: str) -> str:
    if not isinstance(value, str) or not _IDENTIFIER_RE.match(value):
        raise PlannerError(
            f"Refusing to build SQL for {what} {value!r}: only plain identifiers "
            "matching [A-Za-z_][A-Za-z0-9_$]* are accepted."
        )
    return value


# --------------------------------------------------------------------------
# BigQuery
# --------------------------------------------------------------------------


def bq_row_count_sql(dataset: str, table: str) -> str:
    """Row count from dataset metadata.

    ``__TABLES__`` is free and instant, where ``COUNT(*)`` is a full scan that
    is billed. See decision D4 on ``BigQuerySourceAdapter.count_rows_exact``
    for when that trade-off stops being safe.
    """
    _check_identifier(dataset, "dataset")
    _check_identifier(table, "table")
    return (
        f"SELECT SUM(row_count) AS row_count FROM `{dataset}.__TABLES__` "
        f"WHERE table_id = '{table}'"
    )


def bq_exact_count_sql(dataset: str, table: str) -> str:
    _check_identifier(dataset, "dataset")
    _check_identifier(table, "table")
    return f"SELECT COUNT(*) FROM `{dataset}.{table}`"


def bq_candidates_sql(dataset: str, table: str) -> str:
    """Columns of one table, with the partition and cluster metadata."""
    _check_identifier(dataset, "dataset")
    _check_identifier(table, "table")
    return (
        "SELECT column_name, data_type, is_nullable, is_partitioning_column, "
        "clustering_ordinal_position "
        f"FROM `{dataset}.INFORMATION_SCHEMA.COLUMNS` "
        f"WHERE table_name = '{table}' "
        "ORDER BY ordinal_position"
    )


def bq_boundaries_sql(dataset: str, table: str, column: str, chunk_count: int) -> str:
    """Approximate quantile cuts for a chunk column.

    ``APPROX_QUANTILES`` is a sketch, so this costs one pass over a single
    column rather than a sort. It returns a single array cell of
    ``chunk_count + 1`` values, the minimum and maximum included.
    """
    _check_identifier(dataset, "dataset")
    _check_identifier(table, "table")
    _check_identifier(column, "column")
    return (
        f"SELECT APPROX_QUANTILES(`{column}`, {int(chunk_count)}) AS bounds "
        f"FROM `{dataset}.{table}`"
    )


# --------------------------------------------------------------------------
# Postgres
# --------------------------------------------------------------------------


def pg_row_count_estimate_sql(schema: str, table: str) -> str:
    """Planner estimate of the row count, from ``pg_class.reltuples``.

    Cheap but approximate, and stale between autovacuum runs. Callers that
    need to be right about a threshold must confirm with
    :func:`pg_exact_count_sql`.
    """
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    return (
        "SELECT reltuples::bigint AS row_count FROM pg_class "
        f"WHERE oid = to_regclass('\"{schema}\".\"{table}\"')"
    )


def pg_exact_count_sql(schema: str, table: str) -> str:
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    return f'SELECT COUNT(*) FROM "{schema}"."{table}"'


def pg_candidates_sql(schema: str, table: str) -> str:
    """Single-column primary keys of one table.

    A composite primary key is skipped deliberately: chunking on its leading
    column alone gives no guarantee the chunks are even.
    """
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    return (
        "SELECT a.attname AS column_name, "
        "format_type(a.atttypid, a.atttypmod) AS data_type, "
        "NOT a.attnotnull AS nullable "
        "FROM pg_index i "
        "JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0] "
        f"WHERE i.indrelid = to_regclass('\"{schema}\".\"{table}\"') "
        "AND i.indisprimary "
        "AND array_length(i.indkey, 1) = 1"
    )


def pg_column_meta_sql(schema: str, table: str, column: str) -> str:
    """Data type and nullability of one named column."""
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    _check_identifier(column, "column")
    return (
        "SELECT format_type(a.atttypid, a.atttypmod) AS data_type, "
        "NOT a.attnotnull AS nullable "
        "FROM pg_attribute a "
        f"WHERE a.attrelid = to_regclass('\"{schema}\".\"{table}\"') "
        f"AND a.attname = '{column}' "
        "AND a.attnum > 0 AND NOT a.attisdropped"
    )


def pg_boundaries_sql(schema: str, table: str, column: str, chunk_count: int) -> str:
    """Exact quantile cuts for a chunk column.

    Postgres has no approximate quantile, so this is an ordered-set aggregate
    over the column. ``percentile_disc`` (not ``_cont``) is what keeps the
    boundaries to values that actually occur, so an integer key stays an
    integer instead of becoming a float the predicate builder would reject.
    """
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    _check_identifier(column, "column")
    n = int(chunk_count)
    fractions = ", ".join(f"{i / n:.6f}" for i in range(n + 1))
    return (
        f"SELECT unnest(percentile_disc(ARRAY[{fractions}]) "
        f'WITHIN GROUP (ORDER BY "{column}")) '
        f'FROM "{schema}"."{table}"'
    )
