from typing import Any

_PG_DIALECTS = {"postgres", "postgresql"}
_DUCKDB_DIALECTS = {"duckdb"}

def _secret(v: Any) -> str:
    return v.get_secret_value() if hasattr(v, "get_secret_value") else str(v)

def build_bunny_env(creds: Any, schema: str, collection_id: str, base_env: dict[str, str]) -> dict[str, str]:
    """Map DBDao credentials to Bunny DATASOURCE_* env. Hard-fail unsupported dialects."""
    env = dict(base_env)
    env["COLLECTION_ID"] = collection_id
    dialect = str(getattr(creds, "dialect", "")).lower()
    if dialect in _PG_DIALECTS:
        env["DATASOURCE_DB_DRIVERNAME"] = "postgresql"
        env["DATASOURCE_DB_HOST"] = str(creds.host)
        env["DATASOURCE_DB_PORT"] = str(creds.port)
        env["DATASOURCE_DB_DATABASE"] = str(creds.databaseName)
        env["DATASOURCE_DB_SCHEMA"] = schema
        env["DATASOURCE_DB_USERNAME"] = str(creds.user)
        env["DATASOURCE_DB_PASSWORD"] = _secret(creds.password)
    elif dialect in _DUCKDB_DIALECTS:
        env["DATASOURCE_DB_DRIVERNAME"] = "duckdb"
        # Attribute per BUNNY_NOTES.md / CacheDBCredentialsType (Task 1).
        env["DATASOURCE_DUCKDB_PATH_TO_DB"] = str(creds.duckdb_path)
    else:
        raise ValueError(f"Unsupported dialect for cohort_discovery: {dialect!r} (Postgres/DuckDB only)")
    return env
