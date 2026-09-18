from unittest.mock import patch, MagicMock

from _shared_flow_utils.dao.trexdao import TrexDao


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


