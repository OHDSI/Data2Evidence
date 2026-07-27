from types import SimpleNamespace

import pytest

from cohort_discovery_plugin.bunny_config import build_bunny_env

def _pg_creds():
    return SimpleNamespace(dialect="postgres", host="h", port=5432,
                           databaseName="omop", user="u",
                           password=SimpleNamespace(get_secret_value=lambda: "pw"))

def _trex_creds():
    return SimpleNamespace(dialect="trex", host="trex-host", port=5433,
                           databaseName="ignored", user="trexuser",
                           password=SimpleNamespace(get_secret_value=lambda: "trexpw"))

def test_postgres_env_mapping():
    env = build_bunny_env(_pg_creds(), schema="cdm", collection_id="ds1",
                          base_env={"TASK_API_BASE_URL": "http://relay/link_connector_api"})
    assert env["DATASOURCE_DB_DRIVERNAME"] == "postgresql"
    assert env["DATASOURCE_DB_HOST"] == "h"
    assert env["DATASOURCE_DB_PORT"] == "5432"
    assert env["DATASOURCE_DB_DATABASE"] == "omop"
    # Bunny's DATASOURCE_DB_SCHEMA has no default, so it must always be set.
    assert env["DATASOURCE_DB_SCHEMA"] == "cdm"
    assert env["DATASOURCE_DB_USERNAME"] == "u"
    assert env["DATASOURCE_DB_PASSWORD"] == "pw"
    assert env["COLLECTION_ID"] == "ds1"

def test_postgres_database_override():
    env = build_bunny_env(_pg_creds(), schema="cdm", collection_id="ds1",
                          base_env={}, database="other_db")
    assert env["DATASOURCE_DB_DATABASE"] == "other_db"

def test_trex_maps_to_postgres_client_over_pgwire():
    # Trex speaks the postgres wire protocol, so Bunny uses its postgres client
    # and DATASOURCE_DB_DATABASE carries the cache_id (the pgwire dbname).
    env = build_bunny_env(_trex_creds(), schema="cdm", collection_id="ds1",
                          base_env={}, database="cache-abc123")
    assert env["DATASOURCE_DB_DRIVERNAME"] == "postgresql"
    assert env["DATASOURCE_DB_DATABASE"] == "cache-abc123"
    assert env["DATASOURCE_DB_SCHEMA"] == "cdm"
    assert env["DATASOURCE_DB_HOST"] == "trex-host"
    assert env["DATASOURCE_DB_PORT"] == "5433"
    assert env["DATASOURCE_DB_USERNAME"] == "trexuser"
    assert env["DATASOURCE_DB_PASSWORD"] == "trexpw"
    assert env["COLLECTION_ID"] == "ds1"

def test_trex_without_database_hard_fails():
    with pytest.raises(ValueError):
        build_bunny_env(_trex_creds(), schema="cdm", collection_id="ds1", base_env={})

@pytest.mark.parametrize("dialect", ["duckdb", "hana", "bigquery"])
def test_unsupported_dialect_hard_fails(dialect):
    creds = SimpleNamespace(dialect=dialect)
    with pytest.raises(ValueError):
        build_bunny_env(creds, schema="cdm", collection_id="ds1", base_env={})

def test_missing_schema_hard_fails():
    # Bunny's DATASOURCE_DB_SCHEMA has no default; fail early with a clear message.
    with pytest.raises(ValueError, match="schema"):
        build_bunny_env(_pg_creds(), schema="", collection_id="ds1", base_env={})

def test_incomplete_config_hard_fails():
    creds = SimpleNamespace(dialect="postgres", host="", port=5432, databaseName="omop",
                            user="u", password=SimpleNamespace(get_secret_value=lambda: "pw"))
    with pytest.raises(ValueError, match="missing/empty"):
        build_bunny_env(creds, schema="cdm", collection_id="ds1", base_env={})

def test_secret_username_is_unwrapped():
    # CacheDBCredentialsType types `user` as SecretStr; str() would mask it.
    creds = SimpleNamespace(dialect="trex", host="h", port=5432, databaseName="d",
                            user=SimpleNamespace(get_secret_value=lambda: "real_user"),
                            password=SimpleNamespace(get_secret_value=lambda: "pw"))
    env = build_bunny_env(creds, schema="cdm", collection_id="ds1",
                          base_env={}, database="cache1")
    assert env["DATASOURCE_DB_USERNAME"] == "real_user"
