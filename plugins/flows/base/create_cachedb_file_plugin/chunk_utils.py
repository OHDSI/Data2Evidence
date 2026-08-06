"""Pure chunk planning. This module must never import prefect or touch a database."""

from .planner_types import ChunkConfig

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


def find_column_case_insensitive(columns: list[str], target: str) -> str | None:
    if not target:
        return None
    for col in columns:
        if col.lower() == target.lower():
            return col
    return None
