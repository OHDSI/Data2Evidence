from unittest.mock import patch, MagicMock
import pytest

from _shared_flow_utils.dao.trexdao import TrexDao


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
def test_pgwire_dbname_uses_cache_id(secret_mock, var_mock, connect_mock):
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    dao = TrexDao(use_cache_db=True, database_code="db_a", cache_id="cache_a")
    with dao._get_connection():
        pass
    assert connect_mock.call_args.kwargs["dbname"] == "cache_a"


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
def test_pgwire_dbname_falls_back_to_database_code(secret_mock, var_mock, connect_mock):
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    dao = TrexDao(use_cache_db=True, database_code="db_a")  # cache_id omitted
    with dao._get_connection():
        pass
    assert connect_mock.call_args.kwargs["dbname"] == "db_a"


@patch("_shared_flow_utils.dao.trexdao.psycopg2.connect")
@patch("_shared_flow_utils.dao.trexdao.Variable")
@patch("_shared_flow_utils.dao.trexdao.Secret")
def test_use_cache_id_issued_after_connect(secret_mock, var_mock, connect_mock):
    """After connecting, the DAO must issue `USE "<cache_id>"` so unqualified
    queries route to the cache catalog (pgwire only auto-USEs when dbname
    matches a credential id, which cache_id typically won't)."""
    var_mock.get.side_effect = lambda k: {
        "trex_sql_user": "u",
        "trex_sql_host": "h",
        "trex_sql_port": "5432",
    }[k]
    secret_mock.load.return_value.get.return_value = "p"

    cursor_mock = MagicMock()
    connect_mock.return_value.cursor.return_value.__enter__.return_value = cursor_mock

    dao = TrexDao(use_cache_db=True, database_code="db_a", cache_id="cache_a")
    with dao._get_connection():
        pass

    assert cursor_mock.execute.called, "expected USE statement to be issued"
    executed_sql = cursor_mock.execute.call_args.args[0]
    rendered = executed_sql.as_string(connect_mock.return_value) if hasattr(executed_sql, "as_string") else str(executed_sql)
    assert "cache_a" in rendered
    assert rendered.strip().upper().startswith("USE")
