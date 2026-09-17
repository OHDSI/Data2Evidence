from contextlib import contextmanager
from unittest.mock import patch, MagicMock

from psycopg2 import sql as pg_sql

from _shared_flow_utils.dao.trexdao import TrexDao


@contextmanager
def _renderable_composed_sql():
    """SQL/Identifier/Literal.as_string(context) require a real psycopg2
    connection/cursor - checked via isinstance against the C-extension types
    purely so they know how to quote - which a MagicMock can never satisfy
    (raises TypeError: argument 2 must be a connection or a cursor). Stub
    rendering using each class's own public, connection-free attributes
    (.string/.strings/.wrapped) so the DAO's query-composition logic can be
    exercised without a live Postgres/Trex connection. Approximate quoting
    only - not a substitute for psycopg2's own escaping, which isn't ours to
    test."""
    with patch.object(pg_sql.SQL, "as_string", lambda self, ctx: self.string), patch.object(
        pg_sql.Identifier, "as_string", lambda self, ctx: ".".join(f'"{s}"' for s in self.strings)
    ), patch.object(
        pg_sql.Literal,
        "as_string",
        lambda self, ctx: f"'{self.wrapped}'" if isinstance(self.wrapped, str) else str(self.wrapped),
    ):
        yield


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
@patch("_shared_flow_utils.dao.daobase.Secret")
def test_pgwire_dbname_uses_cache_id(daobase_secret_mock, secret_mock, var_mock, connect_mock):
    daobase_secret_mock.load.return_value.get.return_value = {}
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    dao = TrexDao(database_code="db_a", cache_id="cache_a")
    with dao._get_connection():
        pass
    assert connect_mock.call_args.kwargs["dbname"] == "cache_a"


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
@patch("_shared_flow_utils.dao.daobase.Secret")
def test_pgwire_dbname_falls_back_to_database_code(daobase_secret_mock, secret_mock, var_mock, connect_mock):
    daobase_secret_mock.load.return_value.get.return_value = {}
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    dao = TrexDao(database_code="db_a")  # cache_id omitted
    with dao._get_connection():
        pass
    assert connect_mock.call_args.kwargs["dbname"] == "db_a"


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
@patch("_shared_flow_utils.dao.daobase.Secret")
def test_use_cache_id_issued_when_cache_id_differs_from_database_code(daobase_secret_mock, secret_mock, var_mock, connect_mock):
    """When cache_id and database_code differ, the DAO issues `USE "<cache_id>"`
    so unqualified queries route to the cache catalog (pgwire only auto-USEs
    when dbname matches a credential id)."""
    daobase_secret_mock.load.return_value.get.return_value = {}
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    cursor_mock = MagicMock()
    connect_mock.return_value.cursor.return_value.__enter__.return_value = cursor_mock

    dao = TrexDao(database_code="db_a", cache_id="cache_a")
    with dao._get_connection():
        pass

    assert cursor_mock.execute.called, "expected USE statement to be issued"
    executed_sql = cursor_mock.execute.call_args.args[0]
    # Composed.as_string()/Identifier.as_string() require a real psycopg2
    # connection/cursor (they call quote_ident against it) - a MagicMock
    # doesn't satisfy that, so render via the public .string/.strings
    # attributes instead, which need no connection at all.
    parts = executed_sql.seq if hasattr(executed_sql, "seq") else [executed_sql]
    rendered = "".join(p.string if hasattr(p, "string") else str(p) for p in parts)
    assert "cache_a" in rendered
    assert rendered.strip().upper().startswith("USE")


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
@patch("_shared_flow_utils.dao.daobase.Secret")
def test_use_skipped_when_cache_id_equals_database_code(daobase_secret_mock, secret_mock, var_mock, connect_mock):
    """When cache_id == database_code (the default backfill), pgwire's auto-USE
    handles routing — the DAO must not issue a redundant USE."""
    daobase_secret_mock.load.return_value.get.return_value = {}
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    cursor_mock = MagicMock()
    connect_mock.return_value.cursor.return_value.__enter__.return_value = cursor_mock

    dao = TrexDao(database_code="db_a")  # cache_id defaults to db_a
    with dao._get_connection():
        pass

    assert not cursor_mock.execute.called, "USE should not be issued when cache_id == database_code"


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
@patch("_shared_flow_utils.dao.daobase.Secret")
def test_use_failure_does_not_break_connection(daobase_secret_mock, secret_mock, var_mock, connect_mock):
    """If `USE <cache_id>` fails (e.g. catalog not yet attached), the DAO must
    log and continue — the caller may still query against qualified catalogs."""
    daobase_secret_mock.load.return_value.get.return_value = {}
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    cursor_mock = MagicMock()
    cursor_mock.execute.side_effect = RuntimeError("catalog 'cache_x' does not exist")
    connect_mock.return_value.cursor.return_value.__enter__.return_value = cursor_mock

    dao = TrexDao(database_code="db_a", cache_id="cache_x")
    # Must not raise — the failed USE is swallowed.
    with dao._get_connection() as con:
        assert con is connect_mock.return_value


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
@patch("_shared_flow_utils.dao.daobase.Secret")
def test_select_rows_where_in_returns_empty_without_connecting(daobase_secret_mock, secret_mock, var_mock, connect_mock):
    daobase_secret_mock.load.return_value.get.return_value = {}
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    dao = TrexDao(database_code="db_a", cache_id="db_a")
    assert dao.select_rows_where_in("sch", "tbl", ["id"], "id", []) == []
    connect_mock.assert_not_called()


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
@patch("_shared_flow_utils.dao.daobase.Secret")
def test_select_rows_where_in_builds_query_and_maps_rows(daobase_secret_mock, secret_mock, var_mock, connect_mock):
    daobase_secret_mock.load.return_value.get.return_value = {}
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    cursor_mock = MagicMock()
    cursor_mock.description = [("id",), ("name",)]
    cursor_mock.fetchall.return_value = [(1, "a"), (2, "b")]
    connect_mock.return_value.cursor.return_value = cursor_mock

    # cache_id == database_code: no USE statement, so the only execute() call
    # is the SELECT itself.
    dao = TrexDao(database_code="db_a", cache_id="db_a")
    with _renderable_composed_sql():
        rows = dao.select_rows_where_in("sch", "tbl", ["id", "name"], "id", [1, 2])

    assert rows == [{"id": 1, "name": "a"}, {"id": 2, "name": "b"}]
    executed_sql = cursor_mock.execute.call_args.args[0]
    assert "sch" in executed_sql and "tbl" in executed_sql
    assert "1" in executed_sql and "2" in executed_sql


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
@patch("_shared_flow_utils.dao.daobase.Secret")
@patch("_shared_flow_utils.dao.trexdao.execute_values")
def test_delete_and_insert_rows_without_id_column(
    execute_values_mock, daobase_secret_mock, secret_mock, var_mock, connect_mock
):
    daobase_secret_mock.load.return_value.get.return_value = {}
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    cursor_mock = MagicMock()
    connect_mock.return_value.cursor.return_value = cursor_mock

    dao = TrexDao(database_code="db_a", cache_id="db_a")
    with _renderable_composed_sql():
        result = dao.delete_and_insert_rows(
            schema="sch",
            table="tbl",
            delete_column="dataset_id",
            delete_value="ds1",
            insert_rows=[{"dataset_id": "ds1", "value": 10}],
        )

    delete_sql = cursor_mock.execute.call_args_list[0].args[0]
    assert "tbl" in delete_sql and "'ds1'" in delete_sql
    execute_values_mock.assert_called_once()
    values = execute_values_mock.call_args.args[2]
    assert values == [("ds1", 10)]
    assert result == [{"dataset_id": "ds1", "value": 10}]
    connect_mock.return_value.commit.assert_called_once()


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
@patch("_shared_flow_utils.dao.daobase.Secret")
@patch("_shared_flow_utils.dao.trexdao.execute_values")
def test_delete_and_insert_rows_with_id_column_allocates_sequential_ids(
    execute_values_mock, daobase_secret_mock, secret_mock, var_mock, connect_mock
):
    daobase_secret_mock.load.return_value.get.return_value = {}
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    cursor_mock = MagicMock()
    cursor_mock.fetchone.return_value = (41,)  # current MAX(id)
    connect_mock.return_value.cursor.return_value = cursor_mock

    dao = TrexDao(database_code="db_a", cache_id="db_a")
    with _renderable_composed_sql():
        result = dao.delete_and_insert_rows(
            schema="sch",
            table="tbl",
            delete_column="dataset_id",
            delete_value="ds1",
            insert_rows=[{"value": 10}, {"value": 20}],
            id_column="id",
        )

    executed = [c.args[0] for c in cursor_mock.execute.call_args_list]
    assert any("EXCLUSIVE" in s.upper() for s in executed), "expected a LOCK TABLE statement"
    assert result == [{"value": 10, "id": 42}, {"value": 20, "id": 43}]
