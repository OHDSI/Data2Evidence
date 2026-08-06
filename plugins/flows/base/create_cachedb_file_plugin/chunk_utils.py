"""Pure chunk planning. This module must never import prefect or touch a database."""

import hashlib
from collections.abc import Iterable, Sequence
from datetime import date, datetime
from decimal import Decimal

from .errors import PlannerError
from .planner_types import (
    ChunkColumnCandidate,
    ChunkConfig,
    ChunkPlan,
    ChunkStats,
    ChunkStrategy,
)

PLANNER_VERSION = 2

DEFAULT_TARGET_CHUNK_ROWS = {
    "bigquery": 5_000_000,
    "postgres": 1_000_000,
}
FALLBACK_TARGET_CHUNK_ROWS = 1_000_000


def resolve_target_chunk_rows(dialect: str, override: int | None) -> int:
    """Rows per chunk. An explicit chunkSize from the caller always wins.

    It only wins if it is usable: a zero or negative override is a config
    mistake, and accepting one produces either a ZeroDivisionError or a single
    unbounded chunk rather than the smaller chunks the caller asked for.
    """
    if override is not None:
        if not isinstance(override, int) or isinstance(override, bool) or override < 1:
            raise PlannerError(
                f"chunkSize must be a positive integer, got {override!r}."
            )
        return override
    return DEFAULT_TARGET_CHUNK_ROWS.get(dialect, FALLBACK_TARGET_CHUNK_ROWS)


def resolve_chunk_count(row_count: int, config: ChunkConfig) -> int:
    """Number of chunks, derived from row count and hard-capped.

    Deliberately independent of the chunk column's min/max span: deriving the
    count from the span is what made the planner allocate an unbounded list for
    hash-distributed keys (issue 3033).
    """
    if row_count <= 0:
        return 1
    n = -(-row_count // config.target_chunk_rows)  # ceil division
    n = min(n, config.max_chunks)
    n = min(n, max(1, row_count // config.min_chunk_rows))
    return max(1, n)


def sql_literal(value) -> str:
    """Render a boundary value as a SQL literal.

    The accepted set is deliberately narrow. Anything a chunk boundary should
    never be -- NULL, a bool, a float -- is rejected rather than guessed at, so
    a surprising value from the source catalog fails planning instead of
    silently producing a predicate that matches the wrong rows.
    """
    if value is None:
        raise PlannerError("Cannot render NULL as a chunk boundary literal.")
    # bool is a subclass of int, so it has to be rejected first.
    if isinstance(value, bool):
        raise PlannerError("Boolean chunk boundaries are not supported.")
    if isinstance(value, float):
        raise PlannerError(
            "Float chunk boundaries are not supported: rounding would make chunk "
            "edges overlap or leave gaps."
        )
    if isinstance(value, (int, Decimal)):
        return str(value)
    if isinstance(value, (datetime, date)):
        return f"'{value.isoformat()}'"
    if isinstance(value, str):
        escaped = value.replace("'", "''")
        return f"'{escaped}'"
    raise PlannerError(f"Unsupported chunk boundary type: {type(value).__name__}.")


def quote_identifier(name: str) -> str:
    escaped = name.replace('"', '""')
    return f'"{escaped}"'


def normalise_boundaries(raw_boundaries: Iterable) -> list:
    """Sorted, de-duplicated, NULL-free boundary values."""
    return sorted({value for value in raw_boundaries if value is not None})


def build_predicates(column: ChunkColumnCandidate, raw_boundaries: Iterable) -> tuple[str, ...]:
    """Turn quantile boundaries into mutually exclusive, exhaustive predicates.

    ``raw_boundaries`` is the adapter's quantile output and includes the column
    minimum and maximum. Those outer endpoints are dropped: the first and last
    chunks are left unbounded so that rows added or discovered outside the
    sampled range are still copied. The remaining cuts become half-open
    intervals, which is what keeps a row from landing in two chunks when a
    value sits exactly on a boundary.
    """
    cuts = normalise_boundaries(raw_boundaries)
    cuts = cuts[1:-1] if len(cuts) > 2 else []

    col = quote_identifier(column.name)
    if not cuts:
        # Fewer than three distinct values: there is nothing to cut on, so the
        # non-NULL rows are one chunk.
        predicates = [f"{col} IS NOT NULL"]
    else:
        literals = [sql_literal(cut) for cut in cuts]
        predicates = [f"{col} < {literals[0]}"]
        for lower, upper in zip(literals, literals[1:]):
            predicates.append(f"{col} >= {lower} AND {col} < {upper}")
        predicates.append(f"{col} >= {literals[-1]}")

    if column.nullable:
        # Every comparison above is false for NULL, so NULLs need their own
        # chunk or they are silently dropped from the copy.
        predicates.append(f"{col} IS NULL")

    return tuple(predicates)


def count_interval_predicates(predicates: Sequence[str], includes_null_chunk: bool) -> int:
    """How many predicates describe a value interval, excluding the NULL chunk.

    The NULL chunk is bookkeeping, not a slice of the value range, so it must
    not be counted when judging whether a plan actually divides the table.
    """
    return len(predicates) - (1 if includes_null_chunk else 0)


def _thin_boundaries(values: Sequence, max_values: int) -> list:
    """Evenly drop boundaries until at most ``max_values`` remain.

    An adapter may hand back more quantiles than the capped chunk count allows.
    Thinning here -- rather than truncating -- keeps the retained cuts spread
    across the whole range, so the chunks stay roughly equal in size while the
    cap on chunk count is still honoured.
    """
    if max_values < 2:
        # Asking for fewer than two boundaries is asking for something no
        # interval can be built from. Returning the caller's list unchanged
        # would be the opposite of what was asked, so keep only the outer pair
        # and let plan_chunks reject the degenerate plan that results.
        max_values = 2
    if len(values) <= max_values:
        return list(values)
    step = (len(values) - 1) / (max_values - 1)
    picked = [values[round(i * step)] for i in range(max_values)]
    # round() can land on the same index twice for tiny steps; de-duplicate
    # while preserving order. That only ever lowers the count.
    seen = []
    for value in picked:
        if not seen or value != seen[-1]:
            seen.append(value)
    return seen


def compute_plan_id(
    dialect: str,
    schema: str,
    table: str,
    column_name: str | None,
    strategy: ChunkStrategy,
    predicates: Sequence[str],
) -> str:
    """Stable identity for a plan.

    The hash covers the predicates that will actually be executed, not the
    boundaries they were derived from. Those are not the same thing in either
    direction: two different boundary lists can yield byte-identical predicates
    (``build_predicates`` discards the outer endpoints), and one boundary list
    can yield two different predicate lists (a nullable column gains a NULL
    chunk). Since ``plan_id`` is the resume key -- a different id means the
    stored checkpoints no longer describe the work about to be done -- it has
    to track the executed predicates exactly.
    """
    parts = [
        str(PLANNER_VERSION),
        dialect,
        schema,
        table,
        str(column_name),
        strategy.value,
        str(len(predicates)),
    ]
    parts.extend(predicates)
    return hashlib.sha256("\x1f".join(parts).encode("utf-8")).hexdigest()


def plan_chunks(
    dialect: str,
    schema: str,
    table: str,
    stats: ChunkStats,
    config: ChunkConfig,
) -> ChunkPlan:
    """Decide how a table will be copied. Pure: no database access."""
    if stats.row_count < config.small_table_threshold:
        return ChunkPlan(
            plan_id=compute_plan_id(
                dialect, schema, table, None, ChunkStrategy.SINGLE_STATEMENT, ()
            ),
            strategy=ChunkStrategy.SINGLE_STATEMENT,
            column_name=None,
            column_kind=None,
            predicates=(),
            estimated_rows_per_chunk=stats.row_count,
            includes_null_chunk=False,
        )

    if stats.column is None:
        raise PlannerError(
            f"{schema}.{table} has {stats.row_count:,} rows but no usable chunk column. "
            "Refusing to fall back to an unbounded single-statement copy: on a table "
            "this size that is what exhausts the worker rather than failing cleanly "
            "(issue 3033). Provide a chunk column or raise the small-table threshold."
        )

    chunk_count = resolve_chunk_count(stats.row_count, config)
    # n boundaries yield n-1 predicates, so cap the boundaries at chunk_count+1
    # to keep the plan inside max_chunks (plus the NULL chunk, if any).
    boundaries = _thin_boundaries(normalise_boundaries(stats.boundaries), chunk_count + 1)
    predicates = build_predicates(stats.column, boundaries)

    interval_count = count_interval_predicates(predicates, stats.column.nullable)
    if interval_count < 2:
        raise PlannerError(
            f"{schema}.{table} has {stats.row_count:,} rows but chunking on "
            f"{stats.column.name} collapsed to a single unbounded predicate: the "
            f"source returned {len(boundaries)} distinct boundary value(s), so the "
            "column is too low-cardinality to chunk on. Refusing to run what would "
            "be an unbounded whole-table copy mislabelled as CHUNKED (issue 3033). "
            "Pick a higher-cardinality chunk column or raise the small-table "
            "threshold above this row count."
        )

    return ChunkPlan(
        plan_id=compute_plan_id(
            dialect, schema, table, stats.column.name, ChunkStrategy.CHUNKED, predicates
        ),
        strategy=ChunkStrategy.CHUNKED,
        column_name=stats.column.name,
        column_kind=stats.column.kind,
        predicates=predicates,
        estimated_rows_per_chunk=max(1, stats.row_count // max(1, len(predicates))),
        includes_null_chunk=stats.column.nullable,
    )


def describe_plan(plan: ChunkPlan, schema: str, table: str) -> str:
    """One-line summary of a plan, for the copy log."""
    if plan.strategy is ChunkStrategy.SINGLE_STATEMENT:
        return f"{schema}.{table}: single statement (below small-table threshold)"
    kind = plan.column_kind.value if plan.column_kind is not None else "UNKNOWN"
    return (
        f"{schema}.{table}: {len(plan.predicates)} chunks on {plan.column_name} ({kind}), "
        f"~{plan.estimated_rows_per_chunk:,} rows/chunk, "
        f"null_chunk={plan.includes_null_chunk}, plan_id={plan.plan_id[:12]}"
    )


def find_column_case_insensitive(columns: list[str], target: str) -> str | None:
    if not target:
        return None
    for col in columns:
        if col.lower() == target.lower():
            return col
    return None
