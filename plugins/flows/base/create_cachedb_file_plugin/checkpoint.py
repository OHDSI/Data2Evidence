"""Chunk-level checkpointing for the cache copy.

Two bookkeeping tables live beside the copied data in the target schema:

``table_copy_status``
    One row per table: how far the copy got, under which chunk plan.
``copy_run_status``
    One row per ``(flow_run_id, target_schema)``: records that a ``freshCopy``
    reset has already been applied for that pair, so a Prefect task retry does
    not apply it a second time.

Both are **ephemeral**. They are created on demand at the start of a schema
copy and dropped again as soon as that schema copy succeeds, so in a healthy
system they do not exist at all: they only survive the window between a failure
and the next run, which is exactly when something needs to read them.

This module must never import prefect -- the pure test suite imports it from a
bare virtualenv. Every function takes a ``logger`` argument instead of calling
``get_run_logger()``.

The connection is used through the narrowest possible surface: ``execute(sql)``
followed by ``fetchall()``/``fetchone()``. That is all a psycopg2 cursor against
Trex pgwire and a plain duckdb connection have in common, and at runtime it is
the former while in tests it is the latter. No ``cursor()``, no context
managers, no bind parameters.
"""

import re
from dataclasses import dataclass

COPY_STATUS_TABLE_NAME = "table_copy_status"
COPY_RUN_TABLE_NAME = "copy_run_status"

#: The shape ``read_checkpoint`` needs. A ``table_copy_status`` missing any of
#: these is a pre-3033 table left behind by an older release.
REQUIRED_STATUS_COLUMNS = {
    "table_name",
    "status",
    "started_at",
    "completed_at",
    "plan_id",
    "chunks_total",
    "chunks_completed",
    "rows_expected",
}

STATUS_IN_PROGRESS = "IN_PROGRESS"
STATUS_COMPLETE = "COMPLETE"
STATUS_FAILED = "FAILED"

# Identifiers reach the SQL text by interpolation -- none of database, schema
# or table can be a bind parameter in a DDL statement, and the table names come
# from the source catalogue rather than from us. So refuse anything that is not
# a plain unquoted identifier, the same guard as ``source_stats._check_identifier``.
_IDENTIFIER_RE = re.compile(r"^[A-Za-z_][A-Za-z0-9_$]*$")


def _check_identifier(value: str, what: str) -> str:
    if not isinstance(value, str) or not _IDENTIFIER_RE.match(value):
        raise ValueError(
            f"Refusing to build SQL for {what} {value!r}: only plain identifiers "
            "matching [A-Za-z_][A-Za-z0-9_$]* are accepted."
        )
    return value


def _qualified(database: str, schema: str, table: str) -> str:
    _check_identifier(database, "database")
    _check_identifier(schema, "schema")
    _check_identifier(table, "table")
    return f'"{database}"."{schema}"."{table}"'


def _sql_string(value: str) -> str:
    """Single-quoted literal for a value that is not an identifier."""
    return "'" + str(value).replace("'", "''") + "'"


def _status_table(database: str, schema: str) -> str:
    return _qualified(database, schema, COPY_STATUS_TABLE_NAME)


def _run_table(database: str, schema: str) -> str:
    return _qualified(database, schema, COPY_RUN_TABLE_NAME)


@dataclass(frozen=True)
class TableCheckpoint:
    """How far one table's copy got, and under which plan."""

    table_name: str
    status: str
    plan_id: str | None
    chunks_total: int | None
    chunks_completed: int


def _existing_columns(conn, database: str, schema: str, table: str) -> set[str]:
    """Columns of ``table``, or an empty set when it does not exist.

    ``information_schema.columns`` is queried unqualified with a
    ``table_catalog`` predicate: DuckDB rejects ``"db".information_schema.columns``
    but exposes every attached catalogue through the default one.
    """
    conn.execute(
        "SELECT column_name FROM information_schema.columns "
        f"WHERE table_catalog = {_sql_string(database)} "
        f"AND table_schema = {_sql_string(schema)} "
        f"AND table_name = {_sql_string(table)}"
    )
    return {row[0] for row in conn.fetchall()}


def ensure_status_tables(conn, database: str, schema: str, logger) -> None:
    """Create both bookkeeping tables, migrating a legacy status table first.

    Releases before the chunk-level rewrite created ``table_copy_status`` with
    only ``table_name, status, started_at, completed_at``. There is nothing
    worth salvaging in those rows -- they record table-level completion under a
    chunk plan that did not exist -- so the table is dropped and recreated, and
    every table is treated as not-started.
    """
    _check_identifier(database, "database")
    _check_identifier(schema, "schema")

    existing = _existing_columns(conn, database, schema, COPY_STATUS_TABLE_NAME)
    if existing and not REQUIRED_STATUS_COLUMNS.issubset(existing):
        missing = ", ".join(sorted(REQUIRED_STATUS_COLUMNS - existing))
        logger.warning(
            f"Found a legacy '{COPY_STATUS_TABLE_NAME}' in "
            f'"{database}"."{schema}" with columns ({", ".join(sorted(existing))}) '
            f"and no ({missing}). It predates chunk-level checkpointing, so it is "
            "being dropped and recreated: every table in this schema will be "
            "treated as not-started and copied again from the beginning."
        )
        conn.execute(f"DROP TABLE IF EXISTS {_status_table(database, schema)}")

    conn.execute(
        f"CREATE TABLE IF NOT EXISTS {_status_table(database, schema)} ("
        "table_name TEXT PRIMARY KEY, "
        "status TEXT, "
        "started_at TIMESTAMP, "
        "completed_at TIMESTAMP, "
        "plan_id TEXT, "
        "chunks_total INTEGER, "
        "chunks_completed INTEGER, "
        "rows_expected BIGINT"
        ")"
    )
    conn.execute(
        f"CREATE TABLE IF NOT EXISTS {_run_table(database, schema)} ("
        "flow_run_id TEXT, "
        "target_schema TEXT, "
        "reset_applied_at TIMESTAMP, "
        "PRIMARY KEY (flow_run_id, target_schema)"
        ")"
    )


def read_checkpoint(conn, database: str, schema: str, table: str) -> TableCheckpoint | None:
    """The checkpoint for ``table``, or ``None`` if it has never been started."""
    _check_identifier(table, "table")
    conn.execute(
        "SELECT table_name, status, plan_id, chunks_total, chunks_completed "
        f"FROM {_status_table(database, schema)} "
        f"WHERE table_name = {_sql_string(table)}"
    )
    row = conn.fetchone()
    if row is None:
        return None
    return TableCheckpoint(
        table_name=row[0],
        status=row[1],
        plan_id=row[2],
        chunks_total=None if row[3] is None else int(row[3]),
        chunks_completed=0 if row[4] is None else int(row[4]),
    )


def mark_in_progress(
    conn,
    database: str,
    schema: str,
    table: str,
    plan_id: str,
    chunks_total: int,
    rows_expected: int,
) -> None:
    """Open (or reopen) the checkpoint for ``table`` under ``plan_id``.

    Deliberately leaves ``chunks_completed`` alone on conflict. This is the
    resume path: attempt 2 of a retried task calls this before continuing, and
    zeroing the counter here would throw away everything attempt 1 copied. The
    caller decides when progress is invalid -- see the plan_id mismatch path,
    which resets the table explicitly through ``reset_table``.
    """
    _check_identifier(table, "table")
    conn.execute(
        f"INSERT INTO {_status_table(database, schema)} "
        "(table_name, status, started_at, completed_at, plan_id, chunks_total, "
        "chunks_completed, rows_expected) VALUES ("
        f"{_sql_string(table)}, {_sql_string(STATUS_IN_PROGRESS)}, "
        f"CAST(NOW() AS TIMESTAMP), NULL, {_sql_string(plan_id)}, "
        f"{int(chunks_total)}, 0, {int(rows_expected)}) "
        "ON CONFLICT(table_name) DO UPDATE SET "
        f"status = {_sql_string(STATUS_IN_PROGRESS)}, "
        "started_at = CAST(NOW() AS TIMESTAMP), "
        "completed_at = NULL, "
        f"plan_id = {_sql_string(plan_id)}, "
        f"chunks_total = {int(chunks_total)}, "
        f"rows_expected = {int(rows_expected)}"
    )


def record_chunk_progress(
    conn, database: str, schema: str, table: str, completed: int
) -> None:
    """Record that ``completed`` chunks of ``table`` are now durably copied."""
    _check_identifier(table, "table")
    conn.execute(
        f"UPDATE {_status_table(database, schema)} "
        f"SET chunks_completed = {int(completed)} "
        f"WHERE table_name = {_sql_string(table)}"
    )


def mark_complete(conn, database: str, schema: str, table: str) -> None:
    """Mark ``table`` fully copied, so later runs skip it entirely."""
    _check_identifier(table, "table")
    conn.execute(
        f"UPDATE {_status_table(database, schema)} "
        f"SET status = {_sql_string(STATUS_COMPLETE)}, "
        "completed_at = CAST(NOW() AS TIMESTAMP) "
        f"WHERE table_name = {_sql_string(table)}"
    )


def mark_failed(conn, database: str, schema: str, table: str) -> None:
    """Mark ``table`` failed, leaving the target table and its rows in place.

    This deliberately does **not** drop the target table. The function it
    replaces, ``copy.cleanup()``, did exactly that, and it is what made retries
    restart a large table from chunk 0: a 900M-row copy that overran the task
    timeout had its partial target dropped on the way out, so attempt 2 began
    with nothing and overran the timeout again, forever (issue #3033). The
    partial data plus the ``chunks_completed`` counter is the resume point.
    Never reintroduce a DROP on this path.
    """
    _check_identifier(table, "table")
    conn.execute(
        f"UPDATE {_status_table(database, schema)} "
        f"SET status = {_sql_string(STATUS_FAILED)} "
        f"WHERE table_name = {_sql_string(table)}"
    )


def drop_status_tables(conn, database: str, schema: str) -> None:
    """Drop both bookkeeping tables; called once a schema copy has succeeded."""
    conn.execute(f"DROP TABLE IF EXISTS {_status_table(database, schema)}")
    conn.execute(f"DROP TABLE IF EXISTS {_run_table(database, schema)}")
