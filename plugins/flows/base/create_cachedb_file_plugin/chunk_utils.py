"""Pure chunk planning. This module must never import prefect or touch a database."""

from collections.abc import Iterable
from datetime import date, datetime
from decimal import Decimal

from .errors import PlannerError
from .planner_types import ChunkColumnCandidate, ChunkConfig

PLANNER_VERSION = 2

DEFAULT_TARGET_CHUNK_ROWS = {
    "bigquery": 5_000_000,
    "postgres": 1_000_000,
}
FALLBACK_TARGET_CHUNK_ROWS = 1_000_000


def resolve_target_chunk_rows(dialect: str, override: int | None) -> int:
    """Rows per chunk. An explicit chunkSize from the caller always wins."""
    if override is not None:
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


def find_column_case_insensitive(columns: list[str], target: str) -> str | None:
    if not target:
        return None
    for col in columns:
        if col.lower() == target.lower():
            return col
    return None
