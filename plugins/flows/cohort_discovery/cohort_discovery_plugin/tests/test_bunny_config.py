from types import SimpleNamespace
from cohort_discovery_plugin.bunny_config import build_bunny_env

def _pg_creds():
    return SimpleNamespace(dialect="postgres", host="h", port=5432,
                           databaseName="omop", user="u",
                           password=SimpleNamespace(get_secret_value=lambda: "pw"))

def test_postgres_env_mapping():
    env = build_bunny_env(_pg_creds(), schema="cdm", collection_id="ds1",
                          base_env={"TASK_API_BASE_URL": "http://relay/link_connector_api"})
    assert env["DATASOURCE_DB_DRIVERNAME"] == "postgresql"
    assert env["DATASOURCE_DB_HOST"] == "h"
    assert env["DATASOURCE_DB_PORT"] == "5432"
    assert env["DATASOURCE_DB_DATABASE"] == "omop"
    assert env["DATASOURCE_DB_SCHEMA"] == "cdm"
    assert env["DATASOURCE_DB_USERNAME"] == "u"
    assert env["DATASOURCE_DB_PASSWORD"] == "pw"
    assert env["COLLECTION_ID"] == "ds1"

def test_duckdb_env_mapping():
    creds = SimpleNamespace(dialect="duckdb", duckdb_path="/data/ds1.duckdb")
    env = build_bunny_env(creds, schema="cdm", collection_id="ds1", base_env={})
    assert env["DATASOURCE_DB_DRIVERNAME"] == "duckdb"
    assert env["DATASOURCE_DUCKDB_PATH_TO_DB"] == "/data/ds1.duckdb"

def test_unsupported_dialect_hard_fails():
    creds = SimpleNamespace(dialect="hana")
    try:
        build_bunny_env(creds, schema="cdm", collection_id="ds1", base_env={})
        assert False, "expected ValueError"
    except ValueError:
        pass
