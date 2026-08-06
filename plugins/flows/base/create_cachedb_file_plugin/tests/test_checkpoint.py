"""Unit tests for the chunk-level checkpoint tables.

These run against a real DuckDB connection rather than a mock: the SQL is the
part that has to be right, and ``write_conn`` is only ever exercised through
``execute()`` + ``fetchall()``/``fetchone()`` -- the surface a psycopg2 cursor
against Trex pgwire shares with a duckdb connection.
"""

import logging
import sys

import duckdb
import pytest

from create_cachedb_file_plugin.checkpoint import (
    COPY_RUN_TABLE_NAME,
    COPY_STATUS_TABLE_NAME,
    REQUIRED_STATUS_COLUMNS,
    TableCheckpoint,
    drop_status_tables,
    ensure_status_tables,
    mark_complete,
    mark_failed,
    mark_in_progress,
    read_checkpoint,
    record_chunk_progress,
)

DATABASE = "cachedb"
SCHEMA = "cdmdefault"


@pytest.fixture()
def conn():
    con = duckdb.connect()
    con.execute(f"ATTACH ':memory:' AS {DATABASE}")
    con.execute(f'CREATE SCHEMA "{DATABASE}"."{SCHEMA}"')
    yield con
    try:
        con.close()
    except Exception:
        pass


@pytest.fixture()
def logger():
    return logging.getLogger("test_checkpoint")


def _columns(conn, table):
    conn.execute(
        "SELECT column_name FROM information_schema.columns "
        f"WHERE table_catalog = '{DATABASE}' AND table_schema = '{SCHEMA}' "
        f"AND table_name = '{table}'"
    )
    return {row[0] for row in conn.fetchall()}


def test_ensure_status_tables_creates_both_tables(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)

    assert _columns(conn, COPY_STATUS_TABLE_NAME) == REQUIRED_STATUS_COLUMNS
    assert _columns(conn, COPY_RUN_TABLE_NAME) == {
        "flow_run_id",
        "target_schema",
        "reset_applied_at",
    }


def test_ensure_status_tables_is_idempotent(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    mark_in_progress(conn, DATABASE, SCHEMA, "person", "plan-a", 4, 1000)
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)

    checkpoint = read_checkpoint(conn, DATABASE, SCHEMA, "person")
    assert checkpoint is not None
    assert checkpoint.plan_id == "plan-a"


def test_legacy_status_table_is_dropped_and_recreated(conn, caplog, logger):
    """The pre-3033 shape has no plan_id/chunks_* columns; it cannot be read."""
    conn.execute(
        f'CREATE TABLE "{DATABASE}"."{SCHEMA}"."{COPY_STATUS_TABLE_NAME}" ('
        "table_name TEXT PRIMARY KEY, status TEXT, "
        "started_at TIMESTAMP, completed_at TIMESTAMP)"
    )
    conn.execute(
        f'INSERT INTO "{DATABASE}"."{SCHEMA}"."{COPY_STATUS_TABLE_NAME}" '
        "VALUES ('person', 'COMPLETE', NULL, NULL)"
    )

    with caplog.at_level(logging.WARNING):
        ensure_status_tables(conn, DATABASE, SCHEMA, logger)

    assert _columns(conn, COPY_STATUS_TABLE_NAME) == REQUIRED_STATUS_COLUMNS

    conn.execute(f'SELECT COUNT(*) FROM "{DATABASE}"."{SCHEMA}"."{COPY_STATUS_TABLE_NAME}"')
    assert conn.fetchone()[0] == 0, "legacy rows must not survive the migration"
    assert read_checkpoint(conn, DATABASE, SCHEMA, "person") is None

    warning = "\n".join(r.getMessage() for r in caplog.records if r.levelno >= logging.WARNING)
    assert COPY_STATUS_TABLE_NAME in warning
    assert "completed_at" in warning, "the warning should name the old columns"
    assert "not-started" in warning.lower() or "not started" in warning.lower()


def test_checkpoint_round_trip(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)

    mark_in_progress(conn, DATABASE, SCHEMA, "measurement", "plan-xyz", 180, 900_000_000)
    checkpoint = read_checkpoint(conn, DATABASE, SCHEMA, "measurement")
    assert checkpoint == TableCheckpoint(
        table_name="measurement",
        status="IN_PROGRESS",
        plan_id="plan-xyz",
        chunks_total=180,
        chunks_completed=0,
    )

    record_chunk_progress(conn, DATABASE, SCHEMA, "measurement", 42)
    assert read_checkpoint(conn, DATABASE, SCHEMA, "measurement").chunks_completed == 42

    mark_complete(conn, DATABASE, SCHEMA, "measurement")
    assert read_checkpoint(conn, DATABASE, SCHEMA, "measurement").status == "COMPLETE"

    mark_failed(conn, DATABASE, SCHEMA, "measurement")
    assert read_checkpoint(conn, DATABASE, SCHEMA, "measurement").status == "FAILED"


def test_read_checkpoint_returns_none_for_unknown_table(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    assert read_checkpoint(conn, DATABASE, SCHEMA, "never_copied") is None


def test_mark_failed_creates_a_row_when_the_copy_never_started(conn, logger):
    """A planning failure happens before mark_in_progress, so there is no row.

    ``copy_table`` measures the source and plans the chunks first; a
    ``PlannerError`` there reaches ``mark_failed`` with nothing inserted yet.
    An UPDATE would match zero rows and leave the table looking never-started.
    """
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)

    mark_failed(conn, DATABASE, SCHEMA, "measurement")

    checkpoint = read_checkpoint(conn, DATABASE, SCHEMA, "measurement")
    assert checkpoint is not None
    assert checkpoint.status == "FAILED"
    assert checkpoint.plan_id is None
    assert checkpoint.chunks_completed == 0


def test_mark_failed_keeps_the_resume_point_of_a_started_copy(conn, logger):
    """A failure is exactly when plan_id and chunks_completed matter most."""
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    mark_in_progress(conn, DATABASE, SCHEMA, "measurement", "plan-xyz", 180, 900_000_000)
    record_chunk_progress(conn, DATABASE, SCHEMA, "measurement", 42)

    mark_failed(conn, DATABASE, SCHEMA, "measurement")

    checkpoint = read_checkpoint(conn, DATABASE, SCHEMA, "measurement")
    assert checkpoint.status == "FAILED"
    assert checkpoint.plan_id == "plan-xyz"
    assert checkpoint.chunks_total == 180
    assert checkpoint.chunks_completed == 42


def test_mark_in_progress_preserves_chunks_completed_on_retry(conn, logger):
    """Resume depends on this: attempt 2 must not zero attempt 1's progress."""
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    mark_in_progress(conn, DATABASE, SCHEMA, "measurement", "plan-xyz", 180, 900_000_000)
    record_chunk_progress(conn, DATABASE, SCHEMA, "measurement", 42)

    mark_in_progress(conn, DATABASE, SCHEMA, "measurement", "plan-xyz", 180, 900_000_000)

    checkpoint = read_checkpoint(conn, DATABASE, SCHEMA, "measurement")
    assert checkpoint.chunks_completed == 42
    assert checkpoint.status == "IN_PROGRESS"


def test_mark_in_progress_refreshes_plan_and_clears_completed_at(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    mark_in_progress(conn, DATABASE, SCHEMA, "person", "plan-a", 4, 100)
    mark_complete(conn, DATABASE, SCHEMA, "person")

    mark_in_progress(conn, DATABASE, SCHEMA, "person", "plan-b", 9, 200)

    conn.execute(
        "SELECT completed_at, plan_id, chunks_total, rows_expected FROM "
        f'"{DATABASE}"."{SCHEMA}"."{COPY_STATUS_TABLE_NAME}" '
        "WHERE table_name = 'person'"
    )
    completed_at, plan_id, chunks_total, rows_expected = conn.fetchone()
    assert completed_at is None
    assert (plan_id, chunks_total, rows_expected) == ("plan-b", 9, 200)


def test_drop_status_tables_removes_both(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    drop_status_tables(conn, DATABASE, SCHEMA)

    assert _columns(conn, COPY_STATUS_TABLE_NAME) == set()
    assert _columns(conn, COPY_RUN_TABLE_NAME) == set()


def test_drop_status_tables_tolerates_absent_tables(conn, logger):
    drop_status_tables(conn, DATABASE, SCHEMA)


@pytest.mark.parametrize(
    "hostile",
    ['person"; DROP TABLE "cachedb"."cdmdefault"."person"; --', "person'", "1person", ""],
)
def test_hostile_identifiers_are_rejected(conn, logger, hostile):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    with pytest.raises(ValueError):
        read_checkpoint(conn, DATABASE, SCHEMA, hostile)
    with pytest.raises(ValueError):
        mark_in_progress(conn, DATABASE, SCHEMA, hostile, "plan-a", 1, 1)


def test_checkpoint_module_does_not_drag_in_prefect():
    """Duplicated deliberately from test_chunk_planner.py: whoever edits
    checkpoint.py is reading this file, not that one."""
    import create_cachedb_file_plugin.checkpoint  # noqa: F401

    assert "prefect" not in sys.modules
