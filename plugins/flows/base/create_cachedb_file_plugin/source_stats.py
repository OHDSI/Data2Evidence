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
from collections.abc import Iterable, Sequence

from .chunk_utils import resolve_chunk_count
from .errors import PlannerError
from .filter import CHUNK_COLUMN_MAP
from .planner_types import ChunkColumnCandidate, ChunkConfig, ChunkStats, ColumnKind

# Identifiers reach the SQL text by interpolation, because neither dataset,
# table nor column can be a bind parameter in any of these statements. So the
# only defence is to refuse anything that is not a plain unquoted identifier.
_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_$]*$")

#: An inexact row count below ``small_table_threshold * this`` is confirmed
#: with a real ``COUNT(*)`` before the planner is allowed to act on it.
#:
#: Only Postgres produces an inexact count, and its ``reltuples`` is a planner
#: estimate that is stale between autovacuum runs: it reads 0 for a table
#: analysed while empty and then bulk-loaded, and for any never-analysed table
#: on PG <= 13. Believing such an estimate drops the table below the threshold,
#: which makes ``plan_chunks`` choose SINGLE_STATEMENT and ``copy_table`` run
#: ``DROP TABLE`` + ``CREATE TABLE ... AS SELECT *`` over the whole table --
#: the unbounded copy issue 3033 exists to eliminate, with the target dropped
#: on the way in. A COUNT(*) on a genuinely small table costs nothing next to
#: that, so the band is deliberately wider than the threshold itself.
SMALL_TABLE_CONFIRM_FACTOR = 1.2


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


def bq_null_count_sql(dataset: str, table: str, column: str) -> str:
    """How many rows land in the unsplittable NULL chunk.

    One pass over a single column. Only worth issuing when the catalog says
    the column is nullable, which on BigQuery is nearly always -- so the answer
    is what actually decides whether the plan is usable.
    """
    _check_identifier(dataset, "dataset")
    _check_identifier(table, "table")
    _check_identifier(column, "column")
    return f"SELECT COUNT(*) FROM `{dataset}.{table}` WHERE `{column}` IS NULL"


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


def pg_null_count_sql(schema: str, table: str, column: str) -> str:
    """How many rows land in the unsplittable NULL chunk. See the BigQuery twin."""
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    _check_identifier(column, "column")
    return f'SELECT COUNT(*) FROM "{schema}"."{table}" WHERE "{column}" IS NULL'


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


# --------------------------------------------------------------------------
# Chunk column selection (pure)
# --------------------------------------------------------------------------

# A chunk column has to support ORDER BY and the half-open ``<`` / ``>=``
# predicates the planner builds. Anything outside these sets -- JSON, ARRAY,
# STRUCT, GEOGRAPHY, BYTES, BOOL -- either cannot be ordered or has too few
# distinct values to cut on, so it is excluded rather than tried and failed.
ORDERABLE_BQ_TYPES = {
    "INT64",
    "INTEGER",
    "NUMERIC",
    "BIGNUMERIC",
    "DECIMAL",
    "DATE",
    "DATETIME",
    "TIMESTAMP",
    "STRING",
}

ORDERABLE_PG_TYPES = {
    "smallint",
    "integer",
    "bigint",
    "numeric",
    "decimal",
    "date",
    "timestamp without time zone",
    "timestamp with time zone",
    "text",
    "character varying",
    "character",
}

# ``NUMERIC(10, 2)`` and ``timestamp(3) without time zone`` are the same types
# as their unparameterised forms for our purposes, so the modifier is dropped
# before the lookup.
_TYPE_MODIFIER_RE = re.compile(r"\([^)]*\)")


def _base_type(data_type) -> str:
    if data_type is None:
        return ""
    return " ".join(_TYPE_MODIFIER_RE.sub(" ", str(data_type)).split())


def is_orderable_bq_type(data_type) -> bool:
    return _base_type(data_type).upper() in ORDERABLE_BQ_TYPES


def is_orderable_pg_type(data_type) -> bool:
    return _base_type(data_type).lower() in ORDERABLE_PG_TYPES


def _is_yes(value) -> bool:
    """INFORMATION_SCHEMA nullability, which BigQuery reports as YES/NO."""
    if isinstance(value, bool):
        return value
    return str(value).strip().upper() == "YES"


def normalise_allowed_columns(allowed_columns: Iterable | None) -> set[str] | None:
    """Case-folded lookup set, or ``None`` when no restriction applies.

    Source catalogues disagree with the CDM map about casing, so the
    comparison has to be case-insensitive in both directions.
    """
    if allowed_columns is None:
        return None
    return {str(name).lower() for name in allowed_columns}


def _is_allowed(name, allowed: set[str] | None) -> bool:
    return allowed is None or str(name).lower() in allowed


def pick_bq_candidate(
    rows: Iterable[Sequence],
    mapped_column: str | None,
    allowed_columns: Iterable | None = None,
):
    """Choose a chunk column from BigQuery column metadata.

    ``rows`` are ``(column_name, data_type, is_nullable,
    is_partitioning_column, clustering_ordinal_position)``.

    The order of preference is what makes the chunks cheap rather than merely
    correct: slicing on the partitioning column lets BigQuery prune whole
    partitions, the clustering column lets it prune blocks, and only if
    neither exists do we fall back to the surrogate id, where every chunk
    still scans the whole table.

    ``allowed_columns``, when given, restricts the choice to columns the copy
    will actually write. See :meth:`_BaseAdapter.collect` for why.

    Nullability is only ever a tie-break, never a promotion. Partition and
    cluster priority still win outright over it: pruning saves whole partitions
    on every chunk, while a nullable column costs at most one extra NULL chunk,
    which ``plan_chunks`` sizes and rejects if it is too big. So a nullable
    partition column beats a NOT NULL cluster column, and the lowest clustering
    ordinal beats a NOT NULL column at a higher one -- nullability only decides
    between two candidates that are otherwise equal.
    """
    allowed = normalise_allowed_columns(allowed_columns)
    partition = None
    cluster = None
    cluster_ordinal = None
    mapped = None

    for row in rows:
        name, data_type, is_nullable, is_partitioning, clustering_ordinal = row[:5]
        if not is_orderable_bq_type(data_type):
            continue
        if not _is_allowed(name, allowed):
            continue
        nullable = _is_yes(is_nullable)

        if _is_yes(is_partitioning) and (
            partition is None or (partition.nullable and not nullable)
        ):
            partition = ChunkColumnCandidate(
                name=name,
                kind=ColumnKind.PARTITION,
                data_type=str(data_type),
                nullable=nullable,
            )
        if clustering_ordinal is not None and (
            cluster_ordinal is None
            # Only the first clustering column prunes usefully on its own, so
            # the lowest ordinal wins -- ahead of nullability, which breaks
            # the tie only between columns at the same ordinal.
            or clustering_ordinal < cluster_ordinal
            or (
                clustering_ordinal == cluster_ordinal
                and cluster.nullable
                and not nullable
            )
        ):
            cluster_ordinal = clustering_ordinal
            cluster = ChunkColumnCandidate(
                name=name,
                kind=ColumnKind.CLUSTER,
                data_type=str(data_type),
                nullable=nullable,
            )
        if (
            mapped_column
            and mapped is None
            and str(name).lower() == str(mapped_column).lower()
        ):
            mapped = ChunkColumnCandidate(
                name=name,
                kind=ColumnKind.MAPPED_ID,
                data_type=str(data_type),
                nullable=nullable,
            )

    return partition or cluster or mapped


def pick_pg_candidate(
    pk_rows: Iterable[Sequence],
    mapped_column: str | None,
    mapped_meta: Sequence | None = None,
    allowed_columns: Iterable | None = None,
):
    """Choose a chunk column from Postgres catalog metadata.

    ``pk_rows`` are ``(name, data_type, nullable)`` and come from
    :func:`pg_candidates_sql`, so they are already restricted to single-column
    primary keys. A primary key is preferred over the mapped surrogate id
    because its btree index makes the boundary query an index scan.

    ``allowed_columns``, when given, restricts the choice to columns the copy
    will actually write. See :meth:`_BaseAdapter.collect` for why.

    As on BigQuery, nullability is only a tie-break within one priority tier.
    Primary-key priority still wins over it: the btree index makes the boundary
    query an index scan, which is worth far more than avoiding a NULL chunk
    that ``plan_chunks`` will size and reject anyway. In practice a Postgres
    primary key is NOT NULL by definition, so this tie-break rarely fires.
    """
    allowed = normalise_allowed_columns(allowed_columns)

    primary_key = None
    for row in pk_rows:
        name, data_type, nullable = row[:3]
        if not is_orderable_pg_type(data_type):
            continue
        if not _is_allowed(name, allowed):
            continue
        candidate = ChunkColumnCandidate(
            name=name,
            kind=ColumnKind.PRIMARY_KEY,
            data_type=str(data_type),
            nullable=bool(nullable),
        )
        if primary_key is None or (primary_key.nullable and not candidate.nullable):
            primary_key = candidate

    if primary_key is not None:
        return primary_key

    if mapped_column and mapped_meta and _is_allowed(mapped_column, allowed):
        data_type, nullable = mapped_meta[:2]
        if is_orderable_pg_type(data_type):
            return ChunkColumnCandidate(
                name=mapped_column,
                kind=ColumnKind.MAPPED_ID,
                data_type=str(data_type),
                nullable=bool(nullable),
            )

    return None


# --------------------------------------------------------------------------
# Adapters
# --------------------------------------------------------------------------


class _BaseAdapter:
    """Runs the statements above against a source connection.

    Subclasses supply the dialect-specific statements; ``collect`` owns the
    order in which they are asked, so both dialects produce the same
    :class:`ChunkStats` shape for the pure planner.
    """

    dialect = ""

    def __init__(self, read_conn):
        self.read_conn = read_conn

    def _rows(self, statement: str) -> list:
        # sqlalchemy is imported here, not at module scope, so the SQL
        # builders and candidate pickers above stay importable in the bare
        # planner test virtualenv.
        import sqlalchemy as sql

        with self.read_conn.engine.connect() as connection:
            return list(connection.execute(sql.text(statement)).fetchall())

    def _scalar(self, statement: str):
        import sqlalchemy as sql

        with self.read_conn.engine.connect() as connection:
            row = connection.execute(sql.text(statement)).fetchone()
        return None if row is None else row[0]

    # -- to be provided by the dialect -------------------------------------

    def count_rows(self, schema: str, table: str) -> tuple[int, bool]:
        raise NotImplementedError

    def count_rows_exact(self, schema: str, table: str) -> int:
        raise NotImplementedError

    def pick_chunk_column(self, schema: str, table: str, allowed_columns=None):
        raise NotImplementedError

    def column_boundaries(self, schema: str, table: str, column: str, chunk_count: int) -> list:
        raise NotImplementedError

    def count_nulls(self, schema: str, table: str, column: str) -> int:
        raise NotImplementedError

    # ----------------------------------------------------------------------

    def collect(
        self,
        schema: str,
        table: str,
        config: ChunkConfig,
        logger,
        allowed_columns: Iterable | None = None,
    ) -> ChunkStats:
        """Measure a table. The only method the copier needs to call.

        ``allowed_columns`` is the set of columns the copy will write, and is
        passed whenever a snapshot ``table_filter`` narrows the copy to a
        subset. The chunk column has to be one of them: each chunk runs
        ``DELETE FROM <target> WHERE <predicate>`` before its INSERT, and the
        target only has the copied columns, so a predicate on a column that was
        left out turns every chunk into a ChunkCopyError. ``None`` means the
        whole row is being copied and any column may be chosen.

        If the restriction leaves nothing chunkable this returns a ``None``
        column, and ``plan_chunks`` fails the table. That is deliberate: an
        unbounded copy of a table too large to chunk is the failure mode issue
        3033 exists to stop, and it must not be reached by way of a column
        filter either.
        """
        row_count, is_exact = self.count_rows(schema, table)

        # ``row_count_is_exact`` is read here and nowhere else: it is what says
        # the number below is safe to compare against the threshold. An
        # estimate near the threshold is not, so it is confirmed with a real
        # count before anything is decided on it. See
        # SMALL_TABLE_CONFIRM_FACTOR for what a wrong answer costs.
        if not is_exact and row_count < config.small_table_threshold * SMALL_TABLE_CONFIRM_FACTOR:
            exact = self.count_rows_exact(schema, table)
            logger.info(
                f"{schema}.{table}: the estimated row count ({row_count:,}) is near the "
                f"{config.small_table_threshold:,}-row small-table threshold, so it was "
                f"confirmed with an exact count: {exact:,} rows."
            )
            row_count, is_exact = exact, True

        if row_count < config.small_table_threshold:
            # Below the threshold the planner copies in one statement, so
            # neither a chunk column nor a boundary scan is worth paying for.
            return ChunkStats(row_count, is_exact, None, ())

        column = self.pick_chunk_column(schema, table, allowed_columns)
        if column is None:
            # Reported honestly; plan_chunks is what decides that a large
            # table without a chunk column is a hard failure (issue 3033).
            return ChunkStats(row_count, is_exact, None, ())

        chunk_count = resolve_chunk_count(row_count, config)
        logger.info(
            f"{schema}.{table}: chunking on '{column.name}' ({column.kind.value}, "
            f"{column.data_type}, nullable={column.nullable}) into {chunk_count} chunks"
        )
        # One extra single-column scan, and only when the catalog says the
        # column can be NULL: a NOT NULL column gets no NULL chunk at all, so
        # there is nothing for plan_chunks to size. See MAX_NULL_CHUNK_MULTIPLE
        # for what an unsized NULL chunk costs.
        null_count = self.count_nulls(schema, table, column.name) if column.nullable else 0
        if null_count:
            logger.info(
                f"{schema}.{table}: '{column.name}' is NULL in {null_count:,} rows, "
                "which will be copied as one unsplittable chunk."
            )
        boundaries = self.column_boundaries(schema, table, column.name, chunk_count)
        return ChunkStats(row_count, is_exact, column, tuple(boundaries), null_count)


class BigQuerySourceAdapter(_BaseAdapter):
    dialect = "bigquery"

    def count_rows(self, schema: str, table: str) -> tuple[int, bool]:
        row_count = self._scalar(bq_row_count_sql(schema, table))
        if row_count is None:
            # Views and external tables have no ``__TABLES__`` entry, so the
            # metadata query yields NULL rather than zero. Treating that as
            # zero would silently copy nothing.
            row_count = self._scalar(bq_exact_count_sql(schema, table))
        return int(row_count or 0), True

    def count_rows_exact(self, schema: str, table: str) -> int:
        # Decision D4: the metadata row count is free and is treated as exact,
        # so this reuses count_rows rather than billing a full scan. The
        # caveat is that __TABLES__ is eventually consistent for tables with
        # recent streaming inserts -- rows in the streaming buffer are not
        # counted yet. If these datasets start using the streaming API, switch
        # this to bq_exact_count_sql.
        return self.count_rows(schema, table)[0]

    def pick_chunk_column(self, schema: str, table: str, allowed_columns=None):
        rows = self._rows(bq_candidates_sql(schema, table))
        return pick_bq_candidate(
            rows,
            mapped_column=CHUNK_COLUMN_MAP.get(table),
            allowed_columns=allowed_columns,
        )

    def column_boundaries(self, schema: str, table: str, column: str, chunk_count: int) -> list:
        rows = self._rows(bq_boundaries_sql(schema, table, column, chunk_count))
        if not rows:
            return []
        # APPROX_QUANTILES returns one row holding a single array cell.
        bounds = rows[0][0]
        return list(bounds) if bounds is not None else []

    def count_nulls(self, schema: str, table: str, column: str) -> int:
        return int(self._scalar(bq_null_count_sql(schema, table, column)) or 0)


class PostgresSourceAdapter(_BaseAdapter):
    dialect = "postgres"

    def count_rows(self, schema: str, table: str) -> tuple[int, bool]:
        # reltuples is the planner's estimate, and is stale between autovacuum
        # runs, so it can land on the wrong side of small_table_threshold.
        # Returning False for is_exact is what makes ``_BaseAdapter.collect``
        # confirm it with count_rows_exact when it lands anywhere near that
        # threshold; see SMALL_TABLE_CONFIRM_FACTOR.
        estimate = self._scalar(pg_row_count_estimate_sql(schema, table))
        if estimate is None or int(estimate) < 0:
            # -1 means the table has never been analysed. Guessing "small"
            # there is what sends an unmeasured table down the unbounded
            # single-statement path (issue 3033), so pay for the real count.
            return self.count_rows_exact(schema, table), True
        return int(estimate), False

    def count_rows_exact(self, schema: str, table: str) -> int:
        return int(self._scalar(pg_exact_count_sql(schema, table)) or 0)

    def pick_chunk_column(self, schema: str, table: str, allowed_columns=None):
        allowed = normalise_allowed_columns(allowed_columns)
        pk_rows = self._rows(pg_candidates_sql(schema, table))
        mapped_column = CHUNK_COLUMN_MAP.get(table)
        mapped_meta = None
        # Skip the metadata round trip when the mapped column is not being
        # copied: its type cannot change the answer.
        if mapped_column and _is_allowed(mapped_column, allowed):
            meta_rows = self._rows(pg_column_meta_sql(schema, table, mapped_column))
            if meta_rows:
                mapped_meta = tuple(meta_rows[0])
        return pick_pg_candidate(pk_rows, mapped_column, mapped_meta, allowed)

    def column_boundaries(self, schema: str, table: str, column: str, chunk_count: int) -> list:
        rows = self._rows(pg_boundaries_sql(schema, table, column, chunk_count))
        return [row[0] for row in rows]

    def count_nulls(self, schema: str, table: str, column: str) -> int:
        return int(self._scalar(pg_null_count_sql(schema, table, column)) or 0)


def build_source_adapter(read_conn) -> _BaseAdapter:
    """Pick the adapter for a source connection's dialect."""
    # Imported lazily: _shared_flow_utils.types pulls in prefect, which the
    # planner test virtualenv does not have.
    from _shared_flow_utils.types import SupportedDatabaseDialects

    dialect = read_conn.tenant_configs.dialect
    if dialect == SupportedDatabaseDialects.BIGQUERY.value:
        return BigQuerySourceAdapter(read_conn)
    if dialect == SupportedDatabaseDialects.POSTGRES.value:
        return PostgresSourceAdapter(read_conn)
    raise PlannerError(
        f"Chunked copy has no source statistics adapter for dialect '{dialect}'."
    )
