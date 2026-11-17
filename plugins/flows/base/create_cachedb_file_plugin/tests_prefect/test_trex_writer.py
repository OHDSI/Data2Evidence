"""Unit tests for ``copy.TrexWriter``, the replaceable trex cursor.

``copy.py`` imports prefect, so these live outside ``tests/``. Two things are
stubbed so that the module imports without a Prefect server or a trex:

- ``Variable.get``: the task decorators read their timeouts at import time.
  The stub returns the default each call gives.
- ``psycopg2``: only ``get_trex_connection`` uses it, and every test here
  replaces that function.
"""

import importlib
import sys
import types
from types import SimpleNamespace
from unittest.mock import patch

import pytest

pytest.importorskip("prefect")

from prefect.variables import Variable


def _import_copy_module():
    try:
        import psycopg2  # noqa: F401
    except ImportError:
        stub = types.ModuleType("psycopg2")
        stub.connect = lambda **kwargs: (_ for _ in ()).throw(
            AssertionError("tests must not open a real trex connection")
        )
        sys.modules["psycopg2"] = stub

    def variable_default(name, default=None, *args, **kwargs):
        return default

    with patch.object(Variable, "get", staticmethod(variable_default)):
        return importlib.import_module("create_cachedb_file_plugin.copy")


copy_module = _import_copy_module()
TrexWriter = copy_module.TrexWriter


class FakeCursor:
    def __init__(self, conn):
        self.conn = conn
        self.statements = []
        self.closed = False

    def execute(self, statement, *args):
        self.statements.append(statement)

    def fetchone(self):
        return (self.conn.number,)

    def fetchall(self):
        return [(self.conn.number,)]

    def close(self):
        self.closed = True


class FakeConnection:
    def __init__(self, database_code, number, fail_close=False):
        self.database_code = database_code
        self.number = number
        self.fail_close = fail_close
        self.closed = False
        self.cursors = []

    def cursor(self):
        cursor = FakeCursor(self)
        self.cursors.append(cursor)
        return cursor

    def close(self):
        if self.fail_close:
            raise RuntimeError("connection already closed")
        self.closed = True


@pytest.fixture()
def connections(monkeypatch):
    opened = []

    def fake_get_trex_connection(database_code):
        conn = FakeConnection(database_code, len(opened) + 1)
        opened.append(conn)
        return conn

    monkeypatch.setattr(copy_module, "get_trex_connection", fake_get_trex_connection)
    return opened


def test_reconnect_closes_the_old_connection_and_opens_a_new_one(connections):
    writer = TrexWriter("cachedb")
    old = connections[0]

    writer.reconnect()

    assert len(connections) == 2
    assert old.closed and old.cursors[0].closed
    new = connections[1]
    assert not new.closed
    writer.execute("SELECT 2")
    assert new.cursors[0].statements == ["SELECT 2"]
    assert old.cursors[0].statements == []
    assert writer.fetchone() == (2,)


@pytest.fixture(scope="module")
def prefect_server():
    """A throwaway Prefect API for the task engine, stopped before pytest exits."""
    from prefect.testing.utilities import prefect_test_harness

    with prefect_test_harness():
        yield


def test_a_retried_page_chunk_task_gets_the_same_writer(prefect_server, connections, monkeypatch):
    """A reconnect made during attempt 1 must still be in place for attempt 2."""
    writer = TrexWriter("cachedb")
    seen = []

    def fake_run_page_chunk(conn, *args):
        seen.append(conn)
        if len(seen) == 1:
            conn.reconnect()
            raise RuntimeError("attempt 1 fails")
        return True

    monkeypatch.setattr(copy_module, "run_page_chunk", fake_run_page_chunk)
    copy_params = SimpleNamespace(
        source_database="demo__srcdb", target_database="cachedb", target_schema="cdm",
        patient_filter=None, timestamp_filter=None,
    )
    query_columns = SimpleNamespace(
        table="measurement", columns_to_copy=["id"],
        patient_filter_col=None, timestamp_filter_col=None,
    )
    plan = SimpleNamespace(page_bounds=((0, None),), estimated_rows_per_chunk=10)

    task = copy_module.copy_page_chunk.with_options(retries=1, retry_delay_seconds=0)
    task(writer, copy_params, query_columns, "cdm", plan, 0)

    assert len(seen) == 2
    assert seen[0] is writer and seen[1] is writer
    assert len(connections) == 2
    assert seen[1]._conn is connections[1]


def test_execute_reconnects_after_a_failed_reconnect(monkeypatch):
    """A reconnect that fails leaves no cursor; the next statement opens one."""
    opened = []
    unreachable = [False]

    def fake_get_trex_connection(database_code):
        if unreachable[0]:
            raise OSError("could not connect to server")
        conn = FakeConnection(database_code, len(opened) + 1)
        opened.append(conn)
        return conn

    monkeypatch.setattr(copy_module, "get_trex_connection", fake_get_trex_connection)
    writer = TrexWriter("cachedb")
    unreachable[0] = True
    with pytest.raises(OSError):
        writer.reconnect()
    unreachable[0] = False

    writer.execute("SELECT 3")

    assert len(opened) == 2
    assert opened[0].closed
    assert opened[1].cursors[0].statements == ["SELECT 3"]


# ---------------------------------------------------------------------------
# _page_plan_keys: what a page-range plan_id covers
# ---------------------------------------------------------------------------


def _params(patient_filter=None, timestamp_filter=None):
    return SimpleNamespace(patient_filter=patient_filter, timestamp_filter=timestamp_filter)


def test_the_columns_key_ignores_order_and_case():
    columns_key, _ = copy_module._page_plan_keys(_params(), ["Person_ID", "measurement_id"])
    assert columns_key == "measurement_id,person_id"
    assert copy_module._page_plan_keys(_params(), ["measurement_id", "person_id"])[0] == columns_key


@pytest.mark.parametrize(
    "change",
    [{"patient_filter": [1, 2, 4]}, {"patient_filter": None}, {"timestamp_filter": "2010-01-01"}],
)
def test_the_filters_key_changes_with_the_filters(change):
    base = {"patient_filter": [1, 2, 3], "timestamp_filter": "2009-08-03"}
    _, before = copy_module._page_plan_keys(_params(**base), ["a"])
    _, after = copy_module._page_plan_keys(_params(**{**base, **change}), ["a"])
    assert before != after


def test_the_filters_key_does_not_carry_the_patient_ids():
    _, filters_key = copy_module._page_plan_keys(_params([123456789]), ["a"])
    assert "123456789" not in filters_key
    assert len(filters_key) == 64


# ---------------------------------------------------------------------------
# copy_page_chunk: how a failed chunk is reported
# ---------------------------------------------------------------------------


class _Logger:
    def __init__(self):
        self.lines = []

    def info(self, message):
        self.lines.append(message)

    warning = info


def _run_chunk_fn(monkeypatch, patient_filter, error):
    logger = _Logger()
    monkeypatch.setattr(copy_module, "get_run_logger", lambda: logger)

    def failing_run_page_chunk(*args):
        raise error

    monkeypatch.setattr(copy_module, "run_page_chunk", failing_run_page_chunk)
    copy_params = SimpleNamespace(
        source_database="demo__srcdb", target_database="cachedb", target_schema="cdm",
        patient_filter=patient_filter, timestamp_filter=None,
    )
    query_columns = SimpleNamespace(
        table="measurement", columns_to_copy=["person_id"],
        patient_filter_col="person_id", timestamp_filter_col=None,
    )
    plan = SimpleNamespace(page_bounds=((0, 50), (50, None)), estimated_rows_per_chunk=10)
    with pytest.raises(copy_module.ChunkCopyError) as raised:
        copy_module.copy_page_chunk.fn(None, copy_params, query_columns, "cdm", plan, 1)
    return raised.value


def test_with_a_patient_filter_the_cause_is_dropped(monkeypatch):
    """The cause can quote the statement, and so the patient list."""
    error = _run_chunk_fn(monkeypatch, [424242], RuntimeError("near person_id IN (424242)"))
    assert error.__cause__ is None
    assert error.__suppress_context__ is True
    assert "424242" not in str(error)
