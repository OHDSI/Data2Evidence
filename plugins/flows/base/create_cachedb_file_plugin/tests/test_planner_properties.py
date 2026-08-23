"""Property tests: the chunk predicates must partition a real table exactly.

Two different concerns are tested here, and the split is deliberate.

* **The partition property belongs to ``build_predicates``.** For every value
  distribution the predicates must be mutually exclusive and exhaustive: each
  row of a real DuckDB table is matched by exactly one predicate, NULLs
  included, and the per-predicate counts sum to the total. That holds even for
  distributions the planner cannot cut -- a single chunk covering everything is
  still a valid partition. The parametrised tests below assert this.

* **The large-table policy belongs to ``plan_chunks``.** A plan that collapses
  to one unbounded interval is exactly the whole-table scan issue 3033 exists
  to prevent, so ``plan_chunks`` rejects it above ``small_table_threshold``
  even though the predicates themselves are a perfectly good partition. The
  degenerate distributions are therefore asserted against ``plan_chunks``
  separately, at the end of this file, and are *expected to raise* there.

The boundaries are produced with DuckDB's ``quantile_disc(col, [fractions])``,
which is the same shape of output the real BigQuery and Postgres adapters
return.
"""

from dataclasses import replace

import duckdb
import pytest

from create_cachedb_file_plugin.chunk_utils import (
    build_predicates,
    plan_chunks,
    resolve_chunk_count,
)
from create_cachedb_file_plugin.errors import PlannerError
from create_cachedb_file_plugin.planner_types import (
    ChunkColumnCandidate,
    ChunkConfig,
    ChunkStats,
    ChunkStrategy,
    ColumnKind,
)

ROW_COUNT = 20_000

CONFIG = ChunkConfig(target_chunk_rows=1_000, min_chunk_rows=100, max_chunks=50)

# plan_chunks only chunks above the small-table threshold, and 20,000 rows is
# far below the production default. Lowering it is what puts these tables on
# the large-table code path.
PLAN_CONFIG = replace(CONFIG, small_table_threshold=1_000)

DISTRIBUTIONS = [
    "dense_sequential",
    "hash_uniform_int64",
    "offset_sharded",
    "heavy_ties",
    "single_value",
]

# Distributions with fewer than three distinct values: a valid partition, but
# not a plan the large-table policy will accept.
DEGENERATE_DISTRIBUTIONS = ["single_value"]


def _values(distribution: str) -> list[int]:
    if distribution == "dense_sequential":
        return list(range(ROW_COUNT))
    if distribution == "hash_uniform_int64":
        # A deterministic stand-in for a hash-generated key: uniformly spread
        # across the INT64 range, which is the shape that made the pre-rewrite
        # planner allocate ~3.7e12 predicates (issue 3033).
        return [
            (i * 6364136223846793005 + 1442695040888963407) % (2**63)
            for i in range(ROW_COUNT)
        ]
    if distribution == "offset_sharded":
        return [10**12 * (1 + i % 3) + i for i in range(ROW_COUNT)]
    if distribution == "heavy_ties":
        return [i % 25 for i in range(ROW_COUNT)]
    if distribution == "single_value":
        return [42] * ROW_COUNT
    raise AssertionError(f"unknown distribution {distribution}")


def _rows(distribution: str, null_fraction: float) -> list[int | None]:
    values = _values(distribution)
    if not null_fraction:
        return list(values)
    every = round(1 / null_fraction)
    return [None if i % every == 0 else value for i, value in enumerate(values)]


@pytest.fixture(name="con")
def _con():
    connection = duckdb.connect()
    try:
        yield connection
    finally:
        connection.close()


def _build_table(con, distribution: str, null_fraction: float) -> None:
    con.execute("CREATE OR REPLACE TABLE t(chunk_col BIGINT)")
    # One multi-row INSERT: executemany over 20,000 rows costs seconds per
    # table, which at 20-odd parametrised cases makes the suite unusable. The
    # values are ints or None generated here, so inlining them is safe.
    values = ",".join(
        "(NULL)" if value is None else f"({value})"
        for value in _rows(distribution, null_fraction)
    )
    con.execute(f"INSERT INTO t VALUES {values}")


def _boundaries(con, chunk_count: int) -> tuple:
    """What an adapter hands back: chunk_count+1 quantiles, min and max included."""
    fractions = [i / chunk_count for i in range(chunk_count + 1)]
    values = con.execute("SELECT quantile_disc(chunk_col, ?) FROM t", [fractions]).fetchone()[0]
    return tuple(values or ())


def _column(nullable: bool) -> ChunkColumnCandidate:
    return ChunkColumnCandidate(
        name="chunk_col", kind=ColumnKind.MAPPED_ID, data_type="BIGINT", nullable=nullable
    )


def _predicates_for(con, distribution, null_fraction):
    _build_table(con, distribution, null_fraction)
    total = con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
    chunk_count = resolve_chunk_count(total, CONFIG)
    boundaries = _boundaries(con, chunk_count)
    return build_predicates(_column(nullable=bool(null_fraction)), boundaries), total


def _counts(con, predicates) -> list[int]:
    projection = ", ".join(
        f"COUNT(*) FILTER (WHERE {predicate})" for predicate in predicates
    )
    return list(con.execute(f"SELECT {projection} FROM t").fetchone())


def _matches_per_row(con, predicates) -> tuple[int, int]:
    expression = " + ".join(
        f"CASE WHEN {predicate} THEN 1 ELSE 0 END" for predicate in predicates
    )
    return con.execute(
        f"SELECT MIN(m), MAX(m) FROM (SELECT {expression} AS m FROM t)"
    ).fetchone()


@pytest.mark.parametrize("distribution", DISTRIBUTIONS)
@pytest.mark.parametrize("null_fraction", [0.0, 0.1])
def test_predicates_cover_every_row_exactly_once(con, distribution, null_fraction):
    predicates, total = _predicates_for(con, distribution, null_fraction)
    assert total == ROW_COUNT

    counts = _counts(con, predicates)
    assert sum(counts) == total, f"{sum(counts)} != {total} for {predicates}"

    lowest, highest = _matches_per_row(con, predicates)
    assert (lowest, highest) == (1, 1), "a row matched zero or several predicates"


@pytest.mark.parametrize("distribution", DISTRIBUTIONS)
@pytest.mark.parametrize("null_fraction", [0.0, 0.1])
def test_null_rows_land_in_the_null_chunk(con, distribution, null_fraction):
    predicates, _ = _predicates_for(con, distribution, null_fraction)
    nulls = con.execute("SELECT COUNT(*) FROM t WHERE chunk_col IS NULL").fetchone()[0]
    if not null_fraction:
        assert nulls == 0
        assert '"chunk_col" IS NULL' not in predicates
        return
    assert nulls > 0
    assert predicates[-1] == '"chunk_col" IS NULL'
    assert _counts(con, predicates)[-1] == nulls


@pytest.mark.parametrize("distribution", DISTRIBUTIONS)
def test_predicate_count_stays_inside_the_cap(con, distribution):
    predicates, _ = _predicates_for(con, distribution, 0.0)
    assert 1 <= len(predicates) <= CONFIG.max_chunks


@pytest.mark.parametrize(
    "distribution", [d for d in DISTRIBUTIONS if d not in DEGENERATE_DISTRIBUTIONS]
)
@pytest.mark.parametrize("null_fraction", [0.0, 0.1])
def test_plan_chunks_partitions_the_non_degenerate_distributions(
    con, distribution, null_fraction
):
    """End to end: what plan_chunks emits is what has to partition the table."""
    _build_table(con, distribution, null_fraction)
    total = con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
    stats = ChunkStats(
        row_count=total,
        row_count_is_exact=True,
        column=_column(nullable=bool(null_fraction)),
        boundaries=_boundaries(con, resolve_chunk_count(total, PLAN_CONFIG)),
    )
    plan = plan_chunks("duckdb", "main", "t", stats, PLAN_CONFIG)

    assert plan.strategy is ChunkStrategy.CHUNKED
    assert sum(_counts(con, plan.predicates)) == total
    assert _matches_per_row(con, plan.predicates) == (1, 1)


@pytest.mark.parametrize("distribution", DEGENERATE_DISTRIBUTIONS)
@pytest.mark.parametrize("null_fraction", [0.0, 0.1])
def test_plan_chunks_rejects_the_degenerate_distributions(con, distribution, null_fraction):
    """A one-interval plan partitions the table, and is still the 3033 bug."""
    _build_table(con, distribution, null_fraction)
    total = con.execute("SELECT COUNT(*) FROM t").fetchone()[0]
    boundaries = _boundaries(con, resolve_chunk_count(total, PLAN_CONFIG))
    column = _column(nullable=bool(null_fraction))

    # The predicates themselves are a sound partition ...
    predicates = build_predicates(column, boundaries)
    assert sum(_counts(con, predicates)) == total
    assert _matches_per_row(con, predicates) == (1, 1)

    # ... but a single unbounded interval is not an acceptable plan.
    stats = ChunkStats(
        row_count=total, row_count_is_exact=True, column=column, boundaries=boundaries
    )
    with pytest.raises(PlannerError, match="low-cardinality"):
        plan_chunks("duckdb", "main", "t", stats, PLAN_CONFIG)
