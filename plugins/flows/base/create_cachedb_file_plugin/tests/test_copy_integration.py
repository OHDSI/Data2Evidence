"""End-to-end exercise of the chunked copy, against local DuckDB.

``copy.py`` itself cannot be imported here: it imports prefect, which this
suite's virtualenv deliberately does not have. So these tests drive exactly
the primitives ``copy.copy_table`` drives, in the same order -- the pure
planner, the checkpoint module, and a per-chunk ``DELETE`` followed by an
``INSERT`` -- against a real DuckDB source and target. What is under test is
the interaction between those three, which no unit test of any one of them can
show:

* a full pass over the plan reconciles exactly against the source, and
* a crash in the window between a chunk's ``INSERT`` and its progress update
  replays at most that one chunk and does not duplicate its rows.

The source ids are sparse and offset-sharded -- ``i * 977 + 1_000_000_000_000``
-- because that is the shape that broke the pre-3033 planner. It derived the
chunk count from the chunk column's min/max *span*, so a key like this one
(span 195 billion over 200k rows, and far worse for a real hash-generated key)
produced an effectively unbounded predicate list and exhausted the worker
before a single row was copied. The planner under test derives the count from
the row count alone, so the span is irrelevant to it.
"""

import logging

import duckdb
import pytest

from create_cachedb_file_plugin.chunk_utils import plan_chunks, resolve_chunk_count
from create_cachedb_file_plugin.checkpoint import (
    clear_resume_point,
    ensure_status_tables,
    mark_complete,
    mark_failed,
    mark_in_progress,
    read_checkpoint,
    record_chunk_progress,
    reset_table,
)
from create_cachedb_file_plugin.planner_types import (
    ChunkColumnCandidate,
    ChunkConfig,
    ChunkStats,
    ChunkStrategy,
    ColumnKind,
)

DATABASE = "cachedb"
TARGET_SCHEMA = "cdmdefault"
SOURCE_SCHEMA = "cdmsource"
TABLE = "measurement"
CHUNK_COLUMN = "measurement_id"

ROW_COUNT = 200_000
#: Coprime with everything in sight, so consecutive ids are 977 apart and the
#: key's span is ~1000x its cardinality.
ID_STRIDE = 977
ID_BASE = 1_000_000_000_000

SOURCE = f'"{SOURCE_SCHEMA}"."{TABLE}"'
TARGET = f'"{DATABASE}"."{TARGET_SCHEMA}"."{TABLE}"'

#: The production defaults would copy 200k rows in one statement, since that is
#: below ``small_table_threshold``. Scaling the thresholds down rather than
#: scaling the fixture up keeps the test at ~20 chunks and under a second.
CONFIG = ChunkConfig(
    target_chunk_rows=10_000,
    min_chunk_rows=10_000,
    small_table_threshold=1_000,
)

LOGGER = logging.getLogger(__name__)


@pytest.fixture()
def conn():
    con = duckdb.connect()
    con.execute(f"ATTACH ':memory:' AS {DATABASE}")
    con.execute(f'CREATE SCHEMA "{DATABASE}"."{TARGET_SCHEMA}"')
    con.execute(f'CREATE SCHEMA "{SOURCE_SCHEMA}"')
    con.execute(
        f"CREATE TABLE {SOURCE} "
        f'("{CHUNK_COLUMN}" BIGINT, value_source_value TEXT)'
    )
    # One set-based INSERT ... SELECT over range(). executemany() costs about
    # 4.6 seconds per 20k rows here, which would put this fixture near a
    # minute; this form builds the whole 200k-row table in ~15ms.
    con.execute(
        f"INSERT INTO {SOURCE} SELECT "
        f"(i * {ID_STRIDE} + {ID_BASE})::BIGINT, 'v' || (i % 7) "
        f"FROM range(0, {ROW_COUNT}) t(i)"
    )
    ensure_status_tables(con, DATABASE, TARGET_SCHEMA, LOGGER)
    yield con
    con.close()


def _boundaries(con, chunk_count: int) -> list:
    """Quantile cuts for the chunk column, as the source adapters produce them.

    ``quantile_disc`` mirrors the ``percentile_disc`` in
    ``source_stats.pg_boundaries_sql``: the discrete form keeps every boundary
    to a value that actually occurs, so an integer key stays an integer rather
    than becoming a float the predicate builder rejects.
    """
    fractions = ", ".join(f"{i / chunk_count:.6f}" for i in range(chunk_count + 1))
    con.execute(
        f'SELECT unnest(quantile_disc("{CHUNK_COLUMN}", [{fractions}])) FROM {SOURCE}'
    )
    return [row[0] for row in con.fetchall()]


def _plan(con):
    """The plan copy_table would build for this table."""
    column = ChunkColumnCandidate(
        name=CHUNK_COLUMN,
        kind=ColumnKind.PRIMARY_KEY,
        data_type="bigint",
        nullable=False,
    )
    chunk_count = resolve_chunk_count(ROW_COUNT, CONFIG)
    stats = ChunkStats(
        row_count=ROW_COUNT,
        row_count_is_exact=True,
        column=column,
        boundaries=tuple(_boundaries(con, chunk_count)),
    )
    return plan_chunks("postgres", SOURCE_SCHEMA, TABLE, stats, CONFIG)


def _create_empty_target(con):
    """The target's empty shell -- IF NOT EXISTS, so a resume keeps its rows."""
    con.execute(f"CREATE TABLE IF NOT EXISTS {TARGET} AS SELECT * FROM {SOURCE} WHERE 1=0")


def _copy_chunk(con, predicate: str):
    """One chunk, DELETE before INSERT -- the order is the whole point.

    Every statement here autocommits, exactly as DuckDB over Trex pgwire does,
    so a replayed chunk must first remove whatever a previous attempt left
    behind. Swapping these two lines duplicates rows on resume.
    """
    con.execute(f"DELETE FROM {TARGET} WHERE {predicate}")
    con.execute(f"INSERT INTO {TARGET} SELECT * FROM {SOURCE} WHERE {predicate}")


def _target_count(con) -> int:
    con.execute(f"SELECT COUNT(*) FROM {TARGET}")
    return int(con.fetchone()[0])


def _distinct_target_ids(con) -> int:
    con.execute(f'SELECT COUNT(DISTINCT "{CHUNK_COLUMN}") FROM {TARGET}')
    return int(con.fetchone()[0])


def _start_at(conn, plan):
    """Where the next run begins, exactly as ``copy.copy_table`` decides it.

    A checkpoint whose plan_id matches resumes; one that does not is discarded
    through ``reset_table``, because its rows were written under different
    chunk boundaries.
    """
    checkpoint = read_checkpoint(conn, DATABASE, TARGET_SCHEMA, TABLE)
    if checkpoint is None:
        return 0
    if checkpoint.plan_id == plan.plan_id:
        return min(checkpoint.chunks_completed, len(plan.predicates))
    reset_table(conn, DATABASE, TARGET_SCHEMA, TABLE, LOGGER)
    return 0


def _run_copy(conn, plan, start_at):
    mark_in_progress(
        conn, DATABASE, TARGET_SCHEMA, TABLE, plan.plan_id, len(plan.predicates), ROW_COUNT
    )
    if start_at:
        record_chunk_progress(conn, DATABASE, TARGET_SCHEMA, TABLE, start_at)
    _create_empty_target(conn)
    for index in range(start_at, len(plan.predicates)):
        _copy_chunk(conn, plan.predicates[index])
        record_chunk_progress(conn, DATABASE, TARGET_SCHEMA, TABLE, index + 1)


def test_the_sparse_key_still_plans_a_bounded_number_of_chunks(conn):
    """The span of the key must not drive the chunk count (issue 3033)."""
    plan = _plan(conn)
    assert plan.strategy is ChunkStrategy.CHUNKED
    assert plan.column_name == CHUNK_COLUMN
    # 200k rows at 10k rows per chunk, not 195 billion / anything.
    assert len(plan.predicates) == 20


def test_full_copy_reconciles_against_the_source(conn):
    plan = _plan(conn)
    total = len(plan.predicates)

    mark_in_progress(conn, DATABASE, TARGET_SCHEMA, TABLE, plan.plan_id, total, ROW_COUNT)
    _create_empty_target(conn)
    for index, predicate in enumerate(plan.predicates):
        _copy_chunk(conn, predicate)
        record_chunk_progress(conn, DATABASE, TARGET_SCHEMA, TABLE, index + 1)
    mark_complete(conn, DATABASE, TARGET_SCHEMA, TABLE)

    assert _target_count(conn) == ROW_COUNT
    assert _distinct_target_ids(conn) == ROW_COUNT
    checkpoint = read_checkpoint(conn, DATABASE, TARGET_SCHEMA, TABLE)
    assert checkpoint.status == "COMPLETE"
    assert checkpoint.chunks_completed == total


def test_resume_after_a_kill_replays_one_chunk_without_duplicating(conn):
    """Crash between a chunk's INSERT and its progress update, then resume.

    That window is the real failure mode: the rows are already durable but the
    counter still says they are not, so the resume necessarily replays the
    chunk. The leading DELETE is what makes that replay idempotent instead of
    doubling the chunk's rows.
    """
    plan = _plan(conn)
    total = len(plan.predicates)
    half = total // 2
    assert 0 < half < total

    mark_in_progress(conn, DATABASE, TARGET_SCHEMA, TABLE, plan.plan_id, total, ROW_COUNT)
    _create_empty_target(conn)
    for index in range(half):
        _copy_chunk(conn, plan.predicates[index])
        record_chunk_progress(conn, DATABASE, TARGET_SCHEMA, TABLE, index + 1)

    # The kill: this chunk's rows land, and then the worker dies before
    # record_chunk_progress runs.
    _copy_chunk(conn, plan.predicates[half])
    copied_before_crash = _target_count(conn)

    checkpoint = read_checkpoint(conn, DATABASE, TARGET_SCHEMA, TABLE)
    assert checkpoint.plan_id == plan.plan_id
    assert checkpoint.chunks_completed == half
    assert copied_before_crash > 0

    # Resume from what the checkpoint claims, which replays chunk `half`.
    start_at = checkpoint.chunks_completed
    assert start_at == half
    for index in range(start_at, total):
        _copy_chunk(conn, plan.predicates[index])
        record_chunk_progress(conn, DATABASE, TARGET_SCHEMA, TABLE, index + 1)

    assert _target_count(conn) == ROW_COUNT
    assert _distinct_target_ids(conn) == ROW_COUNT


# ---------------------------------------------------------------------------
# A reconciliation mismatch has to be recoverable
# ---------------------------------------------------------------------------
#
# When reconciliation fails, chunks_completed already equals chunks_total. If
# the next run reads that resume point it starts at range(N, N), copies nothing
# and reconciles to the identical mismatch -- the same never-converges
# pathology, one layer up, that this branch was written to kill. Realistic
# triggers: rows inserted between collect() and reconcile_table, and BigQuery
# __TABLES__ not counting rows still in the streaming buffer.
#
# The plan is deliberately reused across both runs. One row appended past the
# column maximum does not move the interior quantile cuts, so a real second run
# computes the same plan_id; reusing it keeps these tests about the resume
# point rather than about quantile jitter.


def _source_count(conn) -> int:
    conn.execute(f"SELECT COUNT(*) FROM {SOURCE}")
    return int(conn.fetchone()[0])


def _append_one_source_row(conn):
    """A row inserted after collect() measured the table -- the usual trigger."""
    conn.execute(
        f"INSERT INTO {SOURCE} VALUES "
        f"(({ROW_COUNT} * {ID_STRIDE} + {ID_BASE})::BIGINT, 'late')"
    )


def test_keeping_the_resume_point_after_a_mismatch_never_converges(conn):
    """Characterises the bug clear_resume_point exists to break."""
    plan = _plan(conn)
    _run_copy(conn, plan, 0)
    _append_one_source_row(conn)
    assert _target_count(conn) != _source_count(conn), "reconciliation would fail here"

    # The old handler: mark_failed alone, which preserves plan_id and
    # chunks_completed == chunks_total.
    mark_failed(conn, DATABASE, TARGET_SCHEMA, TABLE)

    start_at = _start_at(conn, plan)
    assert start_at == len(plan.predicates), "the next run would copy zero chunks"
    _run_copy(conn, plan, start_at)
    assert _target_count(conn) != _source_count(conn), "and reconcile to the same mismatch"


def test_clearing_the_resume_point_makes_the_next_run_redo_the_table(conn):
    plan = _plan(conn)
    _run_copy(conn, plan, 0)
    _append_one_source_row(conn)

    mark_failed(conn, DATABASE, TARGET_SCHEMA, TABLE)
    clear_resume_point(conn, DATABASE, TARGET_SCHEMA, TABLE)

    start_at = _start_at(conn, plan)
    assert start_at == 0, "a cleared plan_id cannot match, so reset_table runs"

    _run_copy(conn, plan, start_at)
    mark_complete(conn, DATABASE, TARGET_SCHEMA, TABLE)

    assert _target_count(conn) == _source_count(conn) == ROW_COUNT + 1
    assert _distinct_target_ids(conn) == ROW_COUNT + 1
