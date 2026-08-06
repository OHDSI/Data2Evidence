"""Value types shared by the chunk planner and its callers.

This module must never import prefect: the pure planner test suite imports it
from a bare virtualenv.
"""

from dataclasses import dataclass, field
from enum import Enum


class ColumnKind(str, Enum):
    """Why a column was considered a chunking candidate, best first."""

    PARTITION = "PARTITION"
    CLUSTER = "CLUSTER"
    PRIMARY_KEY = "PRIMARY_KEY"
    MAPPED_ID = "MAPPED_ID"


class ChunkStrategy(str, Enum):
    """How a table will be copied."""

    SINGLE_STATEMENT = "SINGLE_STATEMENT"
    CHUNKED = "CHUNKED"


@dataclass(frozen=True)
class ChunkConfig:
    """Tuning knobs for the planner.

    ``max_chunks`` is a hard cap: it is what stops a hash-distributed key from
    producing an unbounded predicate list (issue 3033).
    """

    target_chunk_rows: int
    max_chunks: int = 2_000
    min_chunk_rows: int = 100_000
    small_table_threshold: int = 500_000
    dry_run: bool = False


@dataclass(frozen=True)
class ChunkColumnCandidate:
    """A column the adapter believes can be used to slice a table."""

    name: str
    kind: ColumnKind
    data_type: str
    nullable: bool


@dataclass(frozen=True)
class ChunkStats:
    """What the source adapter measured about a table.

    ``boundaries`` is the adapter's quantile output and includes the minimum
    and maximum values.
    """

    row_count: int
    row_count_is_exact: bool
    column: ChunkColumnCandidate | None
    boundaries: tuple = field(default_factory=tuple)


@dataclass(frozen=True)
class ChunkPlan:
    """The planner's output: everything the copier needs, and nothing more."""

    plan_id: str
    strategy: ChunkStrategy
    column_name: str | None
    column_kind: ColumnKind | None
    predicates: tuple[str, ...]
    estimated_rows_per_chunk: int
    includes_null_chunk: bool
