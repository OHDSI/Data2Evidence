"""Unit tests for one PAGE_RANGE chunk: its SQL, and the transaction that commits it.

``run_page_chunk`` runs against a real DuckDB connection, as in
``test_checkpoint.py``. The INSERT under test copies a ``rowid`` range from a
source table in the same DuckDB: a stand-in for ``postgres_query``, which only
trex can run. What is under test is the transaction around it.
"""

import logging
import sys

import duckdb
import pytest

from create_cachedb_file_plugin.checkpoint import (
    ensure_status_tables,
    mark_in_progress,
    read_checkpoint,
)
from create_cachedb_file_plugin.errors import ChunkCopyError
from create_cachedb_file_plugin.page_chunks import (
    NO_ACTIVE_TRANSACTION,
    build_page_chunk_insert,
    build_page_chunk_select,
    rollback,
    run_page_chunk,
)

DATABASE = "cachedb"
SCHEMA = "cdmdefault"
TABLE = "measurement"
TARGET = f'"{DATABASE}"."{SCHEMA}"."{TABLE}"'
SOURCE_ROWS = 100
CHUNKS = 4
CHUNK_ROWS = SOURCE_ROWS // CHUNKS


# ---------------------------------------------------------------------------
# build_page_chunk_select
# ---------------------------------------------------------------------------


def test_the_select_quotes_columns_and_reads_one_page_range():
    sql = build_page_chunk_select("cdm", "measurement", ["measurement_id", "person_id"], 0, 10)
    assert sql == (
        'SELECT "measurement_id", "person_id" FROM "cdm"."measurement" '
        "WHERE ctid >= '(0,0)'::tid AND ctid < '(10,0)'::tid"
    )


def test_the_last_chunk_has_no_upper_page_bound():
    sql = build_page_chunk_select("cdm", "measurement", ["measurement_id"], 990, None)
    assert sql == (
        'SELECT "measurement_id" FROM "cdm"."measurement" '
        "WHERE ctid >= '(990,0)'::tid"
    )


def test_identifiers_with_quotes_are_doubled():
    sql = build_page_chunk_select('cd"m', 'odd"table', ['we"ird'], 0, 1)
    assert sql.startswith('SELECT "we""ird" FROM "cd""m"."odd""table" WHERE ')


def test_a_patient_filter_is_an_in_list_on_the_quoted_column():
    ids = list(range(1, 50_001))
    sql = build_page_chunk_select(
        "cdm", "measurement", ["person_id"], 0, 10, "person_id", ids
    )
    expected = '"person_id" IN (' + ", ".join(str(i) for i in ids) + ")"
    assert sql.endswith(" AND " + expected)
    assert sql.count(", ") == 50_000 - 1
    assert "ctid >= '(0,0)'::tid AND ctid < '(10,0)'::tid AND " in sql


def test_patient_ids_are_rendered_as_integers_only():
    with pytest.raises(ValueError):
        build_page_chunk_select(
            "cdm", "measurement", ["person_id"], 0, 10, "person_id", ["1) OR (1=1"]
        )


@pytest.mark.parametrize("timestamp", ["2009-08-03", "2009-08-03 00:00:00"])
def test_a_timestamp_filter_keeps_the_literal_as_given(timestamp):
    sql = build_page_chunk_select(
        "cdm", "measurement", ["measurement_date"], 0, None,
        timestamp_filter_col="measurement_date", timestamp=timestamp,
    )
    assert sql.endswith(f"\"measurement_date\" = '{timestamp}'")


def test_quotes_in_the_timestamp_are_doubled():
    sql = build_page_chunk_select(
        "cdm", "measurement", ["measurement_date"], 0, None,
        timestamp_filter_col="measurement_date", timestamp="2009' OR '1'='1",
    )
    assert sql.endswith("\"measurement_date\" = '2009'' OR ''1''=''1'")


# ---------------------------------------------------------------------------
# build_page_chunk_insert
# ---------------------------------------------------------------------------


def test_the_insert_reads_through_postgres_query():
    inner = build_page_chunk_select("cdm", "measurement", ["a", "b"], 0, 10)
    sql = build_page_chunk_insert("cachedb", "cdmdefault", "demo__srcdb", inner, "measurement", ["a", "b"])
    assert sql == (
        'INSERT INTO "cachedb"."cdmdefault"."measurement" ("a", "b") SELECT "a", "b" '
        "FROM postgres_query('demo__srcdb', '"
        + inner.replace("'", "''")
        + "')"
    )


def test_every_quote_of_the_inner_select_is_doubled_exactly_once():
    inner = build_page_chunk_select(
        "cdm", "measurement", ["measurement_date"], 0, 10,
        timestamp_filter_col="measurement_date", timestamp="2009' OR '1'='1",
    )
    sql = build_page_chunk_insert("cachedb", "cdmdefault", "demo__srcdb", inner, "measurement", ["measurement_date"])
    prefix = "postgres_query('demo__srcdb', '"
    literal = sql[sql.index(prefix) + len(prefix) : -len("')")]
    assert literal == inner.replace("'", "''")
    # Undoing the doubling once gives back the exact statement Postgres must run.
    assert literal.replace("''", "'") == inner


# ---------------------------------------------------------------------------
# run_page_chunk: rows and progress commit together, or not at all
# ---------------------------------------------------------------------------


@pytest.fixture()
def logger():
    return logging.getLogger("test_page_chunks")


@pytest.fixture()
def conn(logger):
    con = duckdb.connect()
    con.execute(f"ATTACH ':memory:' AS {DATABASE}")
    con.execute(f'CREATE SCHEMA "{DATABASE}"."{SCHEMA}"')
    con.execute(f"CREATE TABLE src AS SELECT range AS id FROM range({SOURCE_ROWS})")
    con.execute(f"CREATE TABLE {TARGET} (id BIGINT)")
    ensure_status_tables(con, DATABASE, SCHEMA, logger)
    mark_in_progress(con, DATABASE, SCHEMA, TABLE, "plan-p", CHUNKS, SOURCE_ROWS)
    yield con
    try:
        con.close()
    except Exception:
        pass


def _insert(index):
    lower, upper = index * CHUNK_ROWS, (index + 1) * CHUNK_ROWS
    return f"INSERT INTO {TARGET} SELECT id FROM src WHERE rowid >= {lower} AND rowid < {upper}"


def _target_rows(conn):
    conn.execute(f"SELECT COUNT(*) FROM {TARGET}")
    return conn.fetchone()[0]


def _completed(conn):
    return read_checkpoint(conn, DATABASE, SCHEMA, TABLE).chunks_completed


def _no_open_transaction(conn):
    with pytest.raises(duckdb.Error, match=NO_ACTIVE_TRANSACTION):
        conn.execute("ROLLBACK")
    return True


class RecordingConn:
    """Passes statements to a real connection and records them; can fail one."""

    def __init__(self, inner, fail_on=None, before=None):
        self.inner = inner
        self.fail_on = fail_on
        self.before = before
        self.statements = []

    def execute(self, statement, *args):
        self.statements.append(statement)
        if self.before is not None and self.before[0] in statement:
            hook, self.before = self.before[1], None
            hook()
        if self.fail_on is not None and statement.startswith(self.fail_on):
            raise RuntimeError(f"injected failure on {self.fail_on}")
        return self.inner.execute(statement, *args)

    def fetchone(self):
        return self.inner.fetchone()

    def fetchall(self):
        return self.inner.fetchall()


def test_a_chunk_commits_its_rows_and_its_progress_together(conn, logger):
    assert run_page_chunk(conn, DATABASE, SCHEMA, TABLE, 0, _insert(0), logger) is True

    assert _target_rows(conn) == CHUNK_ROWS
    assert _completed(conn) == 1
    assert _no_open_transaction(conn)


def test_each_statement_is_sent_on_its_own_in_order(conn, logger):
    recording = RecordingConn(conn)

    run_page_chunk(recording, DATABASE, SCHEMA, TABLE, 0, _insert(0), logger)

    statements = recording.statements
    assert statements[0] == "BEGIN"
    assert statements[1].startswith("SELECT ") and "chunks_completed" in statements[1]
    assert statements[2] == _insert(0)
    assert statements[3].startswith("UPDATE ") and "chunks_completed = 1" in statements[3]
    assert statements[4] == "COMMIT"
    assert len(statements) == 5
    assert not any(";" in s for s in statements)
    assert not any("DELETE" in s.upper() for s in statements)


def test_a_chunk_already_committed_is_not_copied_again(conn, logger):
    """A task retry after the COMMIT reached trex but before Prefect saw it."""
    run_page_chunk(conn, DATABASE, SCHEMA, TABLE, 0, _insert(0), logger)

    assert run_page_chunk(conn, DATABASE, SCHEMA, TABLE, 0, _insert(0), logger) is False

    assert _target_rows(conn) == CHUNK_ROWS
    assert _completed(conn) == 1
    assert _no_open_transaction(conn)


def test_a_chunk_after_a_gap_is_refused(conn, logger):
    """Chunk 3 must not be recorded as done while chunks 1 and 2 are not."""
    recording = RecordingConn(conn)

    with pytest.raises(ChunkCopyError, match="0 chunks done; chunk 3 cannot be next"):
        run_page_chunk(recording, DATABASE, SCHEMA, TABLE, 2, _insert(2), logger)

    assert _insert(2) not in recording.statements
    assert recording.statements[-1] == "ROLLBACK"
    assert _target_rows(conn) == 0
    assert _completed(conn) == 0
    assert _no_open_transaction(conn)


def test_a_failing_insert_rolls_back_and_raises(conn, logger):
    with pytest.raises(duckdb.Error):
        run_page_chunk(
            conn, DATABASE, SCHEMA, TABLE, 0,
            f"INSERT INTO {TARGET} SELECT id FROM no_such_table", logger,
        )

    assert _target_rows(conn) == 0
    assert _completed(conn) == 0
    assert _no_open_transaction(conn)


def test_a_failure_between_insert_and_commit_discards_the_rows(conn, logger):
    """The kill-between-INSERT-and-COMMIT case: no rows without their progress."""
    failing = RecordingConn(conn, fail_on="UPDATE")

    with pytest.raises(RuntimeError, match="injected"):
        run_page_chunk(failing, DATABASE, SCHEMA, TABLE, 0, _insert(0), logger)

    assert failing.statements[-1] == "ROLLBACK"
    assert _target_rows(conn) == 0
    assert _completed(conn) == 0


def test_the_connection_is_usable_after_a_failed_chunk(conn, logger):
    with pytest.raises(duckdb.Error):
        run_page_chunk(
            conn, DATABASE, SCHEMA, TABLE, 0,
            f"INSERT INTO {TARGET} SELECT no_such_column FROM src", logger,
        )

    assert run_page_chunk(conn, DATABASE, SCHEMA, TABLE, 0, _insert(0), logger) is True
    assert _target_rows(conn) == CHUNK_ROWS
    assert _completed(conn) == 1


def test_two_attempts_on_one_chunk_commit_it_once(conn, logger):
    """A second attempt commits the chunk while the first is inside its transaction."""
    other = conn.cursor()

    def second_attempt():
        assert run_page_chunk(other, DATABASE, SCHEMA, TABLE, 0, _insert(0), logger) is True

    first = RecordingConn(conn, before=("INSERT INTO", second_attempt))

    with pytest.raises(duckdb.Error):
        run_page_chunk(first, DATABASE, SCHEMA, TABLE, 0, _insert(0), logger)

    assert _target_rows(conn) == CHUNK_ROWS
    assert _completed(conn) == 1
    assert _no_open_transaction(conn)


# ---------------------------------------------------------------------------
# rollback(): reconnect only when the ROLLBACK itself fails
# ---------------------------------------------------------------------------


class FakeConn:
    def __init__(self, error=None, with_reconnect=True):
        self.error = error
        self.statements = []
        self.reconnects = 0
        if not with_reconnect:
            self.reconnect = None

    def execute(self, statement, *args):
        self.statements.append(statement)
        if self.error is not None and statement == "ROLLBACK":
            raise self.error

    def reconnect(self):
        self.reconnects += 1


def test_rollback_ignores_no_active_transaction(logger, caplog):
    fake = FakeConn(RuntimeError("TransactionContext Error: cannot rollback - no transaction is active"))

    with caplog.at_level(logging.WARNING):
        rollback(fake, logger)

    assert fake.reconnects == 0
    assert not caplog.records


def test_rollback_reconnects_when_rollback_fails_otherwise(logger, caplog):
    fake = FakeConn(RuntimeError("server closed the connection unexpectedly"))

    with caplog.at_level(logging.WARNING):
        rollback(fake, logger)

    assert fake.reconnects == 1
    assert "reconnecting" in caplog.text


def test_a_failed_chunk_raises_its_own_error_when_reconnect_fails_too(logger):
    class DeadConn(FakeConn):
        def execute(self, statement, *args):
            raise RuntimeError(f"server closed the connection ({statement})")

        def reconnect(self):
            raise OSError("could not connect to server")

    with pytest.raises(RuntimeError, match=r"\(BEGIN\)"):
        run_page_chunk(DeadConn(), DATABASE, SCHEMA, TABLE, 0, "INSERT", logger)


def test_page_chunks_does_not_drag_in_prefect():
    assert "prefect" not in sys.modules
