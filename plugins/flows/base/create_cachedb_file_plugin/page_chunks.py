"""One PAGE_RANGE chunk: the INSERT that reads it, and the transaction that commits it.

This module must never import prefect: the pure planner test suite imports it
from a bare virtualenv.

A chunk reads its pages through ``postgres_query``, which sends one query to
Postgres (a TID range scan), instead of the scanner's own page split over the
whole table. The INSERT and the progress update commit together, so a chunk is
either fully copied and recorded, or not at all; no DELETE is needed on retry.
"""

from collections.abc import Sequence

from .checkpoint import read_checkpoint, record_chunk_progress
from .chunk_utils import page_predicate
from .errors import ChunkCopyError

NO_ACTIVE_TRANSACTION = "no transaction is active"


def _ident(name: str) -> str:
    return '"' + str(name).replace('"', '""') + '"'


def _literal(value: str) -> str:
    return "'" + str(value).replace("'", "''") + "'"


def build_page_chunk_select(
    source_schema: str,
    table: str,
    columns: Sequence[str],
    lower: int,
    upper: int | None,
    patient_filter_col: str | None = None,
    patient_ids: Sequence[int] | None = None,
    timestamp_filter_col: str | None = None,
    timestamp: str | None = None,
) -> str:
    conditions = [page_predicate(lower, upper)]
    if patient_filter_col and patient_ids:
        ids = ", ".join(str(int(pid)) for pid in patient_ids)
        conditions.append(f"{_ident(patient_filter_col)} IN ({ids})")
    if timestamp_filter_col and timestamp:
        conditions.append(f"{_ident(timestamp_filter_col)} = {_literal(timestamp)}")
    column_list = ", ".join(_ident(c) for c in columns)
    return (
        f"SELECT {column_list} FROM {_ident(source_schema)}.{_ident(table)} "
        f"WHERE {' AND '.join(conditions)}"
    )


def build_page_chunk_insert(
    target_database: str,
    target_schema: str,
    source_database: str,
    source_select: str,
    table: str,
    columns: Sequence[str],
) -> str:
    column_list = ", ".join(_ident(c) for c in columns)
    target = f"{_ident(target_database)}.{_ident(target_schema)}.{_ident(table)}"
    return (
        f"INSERT INTO {target} ({column_list}) SELECT {column_list} "
        f"FROM postgres_query({_literal(source_database)}, {_literal(source_select)})"
    )


def run_page_chunk(conn, database: str, schema: str, table: str, index: int, insert_sql: str, logger) -> bool:
    """Copy chunk ``index`` and record it, in one transaction.

    Returns False when an earlier attempt already committed this chunk. Each
    statement is sent on its own: trex splits multi-statement strings and must
    not see BEGIN and COMMIT in one. On any error the transaction is rolled
    back before the error is raised again.
    """
    try:
        conn.execute("BEGIN")
        checkpoint = read_checkpoint(conn, database, schema, table)
        done = 0 if checkpoint is None else checkpoint.chunks_completed
        if done > index:
            conn.execute("ROLLBACK")
            return False
        if done < index:
            raise ChunkCopyError(
                f"'{table}' records {done} chunks done; chunk {index + 1} cannot be next."
            )
        conn.execute(insert_sql)
        record_chunk_progress(conn, database, schema, table, index + 1)
        conn.execute("COMMIT")
        return True
    except Exception:
        rollback(conn, logger)
        raise


def rollback(conn, logger) -> None:
    """Roll back; reconnect only if the rollback itself fails.

    trex already rolls back a session whose statement failed, so "no
    transaction is active" is the normal answer here. A Prefect timeout, by
    contrast, surfaces after the statement returned and leaves the
    transaction open, which this ROLLBACK closes.
    """
    try:
        conn.execute("ROLLBACK")
    except Exception as exc:
        if NO_ACTIVE_TRANSACTION in str(exc):
            return
        reconnect = getattr(conn, "reconnect", None)
        if logger is not None:
            logger.warning(
                f"ROLLBACK failed ({type(exc).__name__}); "
                f"{'reconnecting' if reconnect else 'no reconnect available'}."
            )
        if reconnect is not None:
            try:
                reconnect()
            except Exception as reconnect_exc:
                # The caller raises the original error; this one is only logged.
                if logger is not None:
                    logger.warning(f"Reconnect failed ({type(reconnect_exc).__name__}).")
