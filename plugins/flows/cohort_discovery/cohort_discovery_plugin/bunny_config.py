"""Map d2e DAO credentials onto Bunny's `DATASOURCE_*` environment.

Bunny always owns SQL execution: it builds its own SQLAlchemy engine from these
variables (`hutch_bunny.core.db.get_db_client`). We only supply connection
details — we never hand Bunny a d2e connection object, because
`hutch_bunny.core.db.base.BaseDBClient` requires a SQLAlchemy `Engine` and
`Executable` statements, which the psycopg2-based `TrexDao` does not expose.
"""

from typing import Any

_PG_DIALECTS = {"postgres", "postgresql"}
_TREX_DIALECTS = {"trex"}

# Every one of these is required by Bunny for the postgresql driver; an empty
# value would otherwise surface as an opaque connection error in the child.
_REQUIRED = ("DATASOURCE_DB_HOST", "DATASOURCE_DB_PORT", "DATASOURCE_DB_DATABASE",
             "DATASOURCE_DB_SCHEMA", "DATASOURCE_DB_USERNAME", "DATASOURCE_DB_PASSWORD")


def _secret(v: Any) -> str:
    return v.get_secret_value() if hasattr(v, "get_secret_value") else str(v)


def build_bunny_env(creds: Any, schema: str, collection_id: str,
                    base_env: dict[str, str], database: str | None = None) -> dict[str, str]:
    """Map DAO credentials to Bunny `DATASOURCE_*` env. Hard-fail unsupported dialects.

    `database` is the database name Bunny should connect to. For `trex` it is the
    cachedb `cache_id` (the pgwire dbname) and is required.
    """
    env = dict(base_env)
    env["COLLECTION_ID"] = collection_id

    dialect = str(getattr(creds, "dialect", "")).lower()

    # Bunny's DaemonSettings declares DATASOURCE_DB_SCHEMA with no default, so a
    # missing schema fails at Bunny import time — catch it here with a clear message.
    if not schema:
        raise ValueError(
            "cohort_discovery requires a schema name (Bunny's DATASOURCE_DB_SCHEMA has no default)"
        )

    if dialect in _PG_DIALECTS:
        env["DATASOURCE_DB_DRIVERNAME"] = "postgresql"
        env["DATASOURCE_DB_HOST"] = str(creds.host)
        env["DATASOURCE_DB_PORT"] = str(creds.port)
        env["DATASOURCE_DB_DATABASE"] = str(database or creds.databaseName)
        env["DATASOURCE_DB_SCHEMA"] = schema
        env["DATASOURCE_DB_USERNAME"] = _secret(creds.user)
        env["DATASOURCE_DB_PASSWORD"] = _secret(creds.password)
    elif dialect in _TREX_DIALECTS:
        # Trex serves the PostgreSQL wire protocol, so Bunny's standard postgres
        # client connects to it directly — no adapter and no DuckDB file path.
        # TrexDao only resolves the connection details for us.
        if not database:
            raise ValueError(
                "cohort_discovery requires a cachedb database name (cache_id) for the "
                "'trex' dialect: it is the pgwire dbname Bunny connects to."
            )
        env["DATASOURCE_DB_DRIVERNAME"] = "postgresql"
        env["DATASOURCE_DB_HOST"] = str(creds.host)
        env["DATASOURCE_DB_PORT"] = str(creds.port)
        env["DATASOURCE_DB_DATABASE"] = str(database)
        env["DATASOURCE_DB_SCHEMA"] = schema
        env["DATASOURCE_DB_USERNAME"] = _secret(creds.user)
        env["DATASOURCE_DB_PASSWORD"] = _secret(creds.password)
    else:
        raise ValueError(
            f"Unsupported dialect for cohort_discovery: {dialect!r}. "
            "Supported: postgres, trex."
        )

    missing = [k for k in _REQUIRED if not env.get(k)]
    if missing:
        raise ValueError(
            f"Incomplete Bunny datasource config; missing/empty: {', '.join(missing)}"
        )
    return env
