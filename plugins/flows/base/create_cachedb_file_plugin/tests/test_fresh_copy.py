"""Unit tests for the freshCopy reset and its once-per-run arbitration."""

import logging

import duckdb
import pytest

from create_cachedb_file_plugin.checkpoint import (
    COPY_RUN_TABLE_NAME,
    apply_fresh_copy,
    ensure_status_tables,
    mark_complete,
    mark_in_progress,
    read_checkpoint,
    record_chunk_progress,
    reset_table,
)
from create_cachedb_file_plugin.errors import FreshCopyResetError

DATABASE = "cachedb"
SCHEMA = "cdmdefault"
OTHER_SCHEMA = "cdmresults"
RUN_ID = "flow-run-0001"


@pytest.fixture()
def logger():
    return logging.getLogger("test_fresh_copy")


@pytest.fixture()
def conn():
    con = duckdb.connect()
    con.execute(f"ATTACH ':memory:' AS {DATABASE}")
    con.execute(f'CREATE SCHEMA "{DATABASE}"."{SCHEMA}"')
    con.execute(f'CREATE SCHEMA "{DATABASE}"."{OTHER_SCHEMA}"')
    yield con
    try:
        con.close()
    except Exception:
        pass


def _seed_table(conn, schema, table, rows):
    conn.execute(f'DROP TABLE IF EXISTS "{DATABASE}"."{schema}"."{table}"')
    conn.execute(f'CREATE TABLE "{DATABASE}"."{schema}"."{table}" (id BIGINT)')
    if rows:
        values = ", ".join(f"({i})" for i in range(rows))
        conn.execute(f'INSERT INTO "{DATABASE}"."{schema}"."{table}" VALUES {values}')


def _table_exists(conn, schema, table):
    conn.execute(
        "SELECT COUNT(*) FROM information_schema.tables "
        f"WHERE table_catalog = '{DATABASE}' AND table_schema = '{schema}' "
        f"AND table_name = '{table}'"
    )
    return conn.fetchone()[0] == 1


def _row_count(conn, schema, table):
    conn.execute(f'SELECT COUNT(*) FROM "{DATABASE}"."{schema}"."{table}"')
    return conn.fetchone()[0]


def _arbitration_rows(conn, schema=SCHEMA):
    conn.execute(
        f'SELECT flow_run_id, target_schema FROM "{DATABASE}"."{schema}"."{COPY_RUN_TABLE_NAME}"'
    )
    return sorted(conn.fetchall())


# --------------------------------------------------------------------------
# reset_table
# --------------------------------------------------------------------------


def test_reset_table_drops_the_target_and_reports_the_discarded_rows(conn, logger, caplog):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    _seed_table(conn, SCHEMA, "measurement", 17)
    mark_in_progress(conn, DATABASE, SCHEMA, "measurement", "plan-a", 4, 100)
    record_chunk_progress(conn, DATABASE, SCHEMA, "measurement", 2)

    with caplog.at_level(logging.WARNING):
        discarded = reset_table(conn, DATABASE, SCHEMA, "measurement", logger)

    assert discarded == 17
    assert not _table_exists(conn, SCHEMA, "measurement")
    assert read_checkpoint(conn, DATABASE, SCHEMA, "measurement") is None
    assert "17" in "\n".join(
        r.getMessage() for r in caplog.records if r.levelno >= logging.WARNING
    )


def test_reset_table_on_an_absent_target_discards_nothing(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    assert reset_table(conn, DATABASE, SCHEMA, "never_copied", logger) == 0


# --------------------------------------------------------------------------
# apply_fresh_copy
# --------------------------------------------------------------------------


def test_fresh_copy_discards_only_incomplete_tables(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)

    _seed_table(conn, SCHEMA, "person", 5)
    mark_in_progress(conn, DATABASE, SCHEMA, "person", "plan-a", 2, 5)
    mark_complete(conn, DATABASE, SCHEMA, "person")

    _seed_table(conn, SCHEMA, "measurement", 9)
    mark_in_progress(conn, DATABASE, SCHEMA, "measurement", "plan-a", 4, 100)
    record_chunk_progress(conn, DATABASE, SCHEMA, "measurement", 2)

    discarded = apply_fresh_copy(conn, DATABASE, SCHEMA, RUN_ID, False, logger)

    assert discarded == ["measurement"]
    assert not _table_exists(conn, SCHEMA, "measurement")
    assert read_checkpoint(conn, DATABASE, SCHEMA, "measurement") is None

    assert _row_count(conn, SCHEMA, "person") == 5
    assert read_checkpoint(conn, DATABASE, SCHEMA, "person").status == "COMPLETE"


def test_fresh_copy_is_applied_at_most_once_per_run_and_schema(conn, logger):
    """The retry case. ``create_schema_tables_task`` carries retries=3, so a
    second application would destroy the progress the first attempt made --
    silently undoing the chunk-level resume this whole change exists to add."""
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    _seed_table(conn, SCHEMA, "measurement", 9)
    mark_in_progress(conn, DATABASE, SCHEMA, "measurement", "plan-a", 4, 100)

    assert apply_fresh_copy(conn, DATABASE, SCHEMA, RUN_ID, False, logger) == ["measurement"]

    # Attempt 1 then copies some chunks before the task times out.
    _seed_table(conn, SCHEMA, "measurement", 6)
    mark_in_progress(conn, DATABASE, SCHEMA, "measurement", "plan-a", 4, 100)
    record_chunk_progress(conn, DATABASE, SCHEMA, "measurement", 3)

    # Attempt 2 of the same task run re-enters with the same flow run id.
    assert apply_fresh_copy(conn, DATABASE, SCHEMA, RUN_ID, False, logger) == []

    assert _row_count(conn, SCHEMA, "measurement") == 6
    assert read_checkpoint(conn, DATABASE, SCHEMA, "measurement").chunks_completed == 3


def test_each_schema_in_one_flow_run_gets_its_own_reset(conn, logger):
    """create_results_cache_flow re-enters create_cache_flow for the results
    schema under the same flow run; that schema still needs its own reset."""
    for schema in (SCHEMA, OTHER_SCHEMA):
        ensure_status_tables(conn, DATABASE, schema, logger)
        _seed_table(conn, schema, "measurement", 9)
        mark_in_progress(conn, DATABASE, schema, "measurement", "plan-a", 4, 100)

    assert apply_fresh_copy(conn, DATABASE, SCHEMA, RUN_ID, False, logger) == ["measurement"]
    assert apply_fresh_copy(conn, DATABASE, OTHER_SCHEMA, RUN_ID, False, logger) == ["measurement"]

    assert not _table_exists(conn, OTHER_SCHEMA, "measurement")
    assert _arbitration_rows(conn, SCHEMA) == [(RUN_ID, SCHEMA)]
    assert _arbitration_rows(conn, OTHER_SCHEMA) == [(RUN_ID, OTHER_SCHEMA)]


def test_dry_run_reports_without_destroying_or_consuming_the_token(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    for table, rows in (("measurement", 9), ("observation", 4)):
        _seed_table(conn, SCHEMA, table, rows)
        mark_in_progress(conn, DATABASE, SCHEMA, table, "plan-a", 4, 100)

    reported = apply_fresh_copy(conn, DATABASE, SCHEMA, RUN_ID, True, logger)

    assert reported == ["measurement", "observation"], "order must be deterministic"
    assert _row_count(conn, SCHEMA, "measurement") == 9
    assert _row_count(conn, SCHEMA, "observation") == 4
    assert read_checkpoint(conn, DATABASE, SCHEMA, "measurement") is not None
    assert _arbitration_rows(conn) == [], "a dry run must not consume the token"

    # ... and the real run afterwards still fires.
    assert apply_fresh_copy(conn, DATABASE, SCHEMA, RUN_ID, False, logger) == [
        "measurement",
        "observation",
    ]


def test_a_failure_mid_reset_raises_fresh_copy_reset_error(conn, logger):
    ensure_status_tables(conn, DATABASE, SCHEMA, logger)
    _seed_table(conn, SCHEMA, "measurement", 9)
    mark_in_progress(conn, DATABASE, SCHEMA, "measurement", "plan-a", 4, 100)

    conn.close()

    with pytest.raises(FreshCopyResetError):
        apply_fresh_copy(conn, DATABASE, SCHEMA, RUN_ID, False, logger)
