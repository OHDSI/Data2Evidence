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

from .errors import FreshCopyResetError

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

    An upsert, not a bare UPDATE. A copy can fail *before* it has a status row:
    ``copy_table`` measures the source and plans the chunks first, and a
    ``PlannerError`` there -- no usable chunk column, or a chunk column too
    low-cardinality to cut a large table on -- reaches this function with
    nothing yet inserted. An UPDATE would match zero rows and leave the table
    with no status at all, silently reported as never-started rather than as
    FAILED.

    On conflict only ``status`` changes. ``plan_id`` and ``chunks_completed``
    are the resume point and a failure is exactly when they matter most.
    """
    _check_identifier(table, "table")
    conn.execute(
        f"INSERT INTO {_status_table(database, schema)} "
        "(table_name, status, started_at, completed_at, plan_id, chunks_total, "
        "chunks_completed, rows_expected) VALUES ("
        f"{_sql_string(table)}, {_sql_string(STATUS_FAILED)}, "
        "CAST(NOW() AS TIMESTAMP), NULL, NULL, NULL, 0, NULL) "
        "ON CONFLICT(table_name) DO UPDATE SET "
        f"status = {_sql_string(STATUS_FAILED)}"
    )


def clear_resume_point(conn, database: str, schema: str, table: str) -> None:
    """Forget where ``table``'s copy got to, so the next run replans it.

    The one failure the resume point cannot help with is a reconciliation
    mismatch. By the time reconciliation runs, ``chunks_completed`` already
    equals ``chunks_total``, so the next run computes
    ``start_at = len(predicates)``, executes ``range(N, N)`` -- zero chunks --
    and reconciles to the identical mismatch. Every retry then fails the same
    way having done no work: the never-converges pathology of issue 3033, one
    layer up from the chunk loop.

    Setting ``plan_id`` to NULL is what breaks the loop: no computed plan id
    can equal NULL, so the next run takes ``copy_table``'s plan-mismatch branch
    and calls ``reset_table`` properly, which is the only place allowed to drop
    the partial target. This function itself leaves the copied rows alone.

    Deliberately *not* called for a ``ChunkCopyError``. There the resume point
    is exactly what we want to keep -- it is what stops a 900M-row table
    restarting at chunk 0 on every retry.
    """
    _check_identifier(table, "table")
    conn.execute(
        f"UPDATE {_status_table(database, schema)} "
        "SET chunks_completed = 0, plan_id = NULL "
        f"WHERE table_name = {_sql_string(table)}"
    )


def drop_status_tables(conn, database: str, schema: str) -> None:
    """Drop both bookkeeping tables; called once a schema copy has succeeded."""
    conn.execute(f"DROP TABLE IF EXISTS {_status_table(database, schema)}")
    conn.execute(f"DROP TABLE IF EXISTS {_run_table(database, schema)}")


# --------------------------------------------------------------------------
# Discarding progress on purpose
# --------------------------------------------------------------------------


def reset_table(conn, database: str, schema: str, table: str, logger) -> int:
    """Discard everything already copied for ``table``; return the row count lost.

    Drops the target table and deletes its checkpoint row, so the next run
    treats the table as never started. Returns 0 when the target does not exist.

    This is the one place allowed to destroy copied data, and it has two
    callers: the operator-driven ``freshCopy`` override, and the plan_id
    mismatch path -- when the chunk plan changes between runs the existing
    partial data was written under different chunk boundaries and cannot be
    resumed against the new ones. Keep it free of assumptions about which.
    """
    target = _qualified(database, schema, table)

    discarded = 0
    if _existing_columns(conn, database, schema, table):
        conn.execute(f"SELECT COUNT(*) FROM {target}")
        row = conn.fetchone()
        discarded = 0 if row is None or row[0] is None else int(row[0])

    conn.execute(f"DROP TABLE IF EXISTS {target}")
    conn.execute(
        f"DELETE FROM {_status_table(database, schema)} "
        f"WHERE table_name = {_sql_string(table)}"
    )
    logger.warning(
        f"Reset table '{schema}.{table}': dropped the target and discarded "
        f"{discarded} already-copied rows. It will be copied again from the start."
    )
    return discarded


def apply_fresh_copy(
    conn,
    database: str,
    schema: str,
    flow_run_id: str,
    dry_run: bool,
    logger,
) -> list[str]:
    """Discard every non-COMPLETE table in ``schema``, at most once per run.

    Returns the sorted names of the tables discarded, or under ``dry_run`` the
    names that would be discarded.

    **Why once per run is load-bearing.** ``create_schema_tables_task`` carries
    ``retries=3``. Without arbitration the reset would run again at the top of
    attempt 2, deleting everything attempt 1 managed to copy before it timed
    out -- and again on attempt 3. A large table would then make no net
    progress across the whole run, silently undoing the chunk-level resume that
    this change exists to provide, while still looking like it was working.
    So the first application writes a row into ``copy_run_status`` and every
    later call for the same key returns ``[]`` without touching anything.

    **Why the key is composite.** One flow run can copy more than one schema:
    ``create_results_cache_flow`` re-enters ``create_cache_flow`` so the results
    schema is copied under the same ``flow_run_id`` as the datamart schema.
    Keying on the run alone would let the datamart's reset consume the token
    and leave the results schema silently un-reset, which is the failure mode
    ``freshCopy`` was requested to avoid. Keying on
    ``(flow_run_id, target_schema)`` gives each schema exactly one reset.

    A ``dry_run`` reports the discard set and deliberately does *not* consume
    the token, so the real run that follows still performs its reset.

    Any failure is wrapped in :class:`FreshCopyResetError`: a half-applied reset
    must abort the copy rather than let it proceed over an unknown mix of stale
    and fresh data.
    """
    try:
        _check_identifier(database, "database")
        _check_identifier(schema, "schema")

        if not dry_run and _fresh_copy_already_applied(conn, database, schema, flow_run_id):
            logger.info(
                f"freshCopy was already applied for flow run '{flow_run_id}' and schema "
                f"'{schema}'; leaving this attempt's progress alone."
            )
            return []

        conn.execute(
            "SELECT table_name FROM "
            f"{_status_table(database, schema)} "
            f"WHERE status IS DISTINCT FROM {_sql_string(STATUS_COMPLETE)} "
            "ORDER BY table_name"
        )
        tables = [row[0] for row in conn.fetchall()]

        if dry_run:
            logger.info(
                f"freshCopy dry run for schema '{schema}': would discard "
                f"{len(tables)} incomplete table(s): {tables}. Nothing was changed."
            )
            return tables

        for table in tables:
            reset_table(conn, database, schema, table, logger)

        _record_fresh_copy_applied(conn, database, schema, flow_run_id)
        logger.info(
            f"freshCopy discarded {len(tables)} incomplete table(s) in schema "
            f"'{schema}': {tables}. Completed tables were kept."
        )
        return tables
    except Exception as exc:
        raise FreshCopyResetError(
            f"freshCopy reset failed for schema '{schema}' in flow run "
            f"'{flow_run_id}': {exc}"
        ) from exc


def _fresh_copy_already_applied(conn, database: str, schema: str, flow_run_id: str) -> bool:
    conn.execute(
        f"SELECT COUNT(*) FROM {_run_table(database, schema)} "
        f"WHERE flow_run_id = {_sql_string(flow_run_id)} "
        f"AND target_schema = {_sql_string(schema)}"
    )
    row = conn.fetchone()
    return bool(row and row[0])


def _record_fresh_copy_applied(conn, database: str, schema: str, flow_run_id: str) -> None:
    conn.execute(
        f"INSERT INTO {_run_table(database, schema)} "
        "(flow_run_id, target_schema, reset_applied_at) VALUES ("
        f"{_sql_string(flow_run_id)}, {_sql_string(schema)}, CAST(NOW() AS TIMESTAMP)) "
        "ON CONFLICT DO NOTHING"
    )
