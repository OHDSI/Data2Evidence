"""One greppable log line per copy stage, and a per-schema summary.

This module must never import prefect: the pure planner test suite imports it
from a bare virtualenv.

Line format::

    stage=<name> [<field>=<value> ...] seconds=<s> [rows=<n>] status=<ok|failed|fallback> [reason=<token>]
"""

import re
import time
from contextlib import contextmanager
from enum import Enum

_UNSAFE = re.compile(r"[^A-Za-z0-9_.:\-]")


class StageName(str, Enum):
    FLOW_TOTAL = "flow_total"
    SLOT_RECONCILE = "slot_reconcile"
    SCHEMA_SETUP = "schema_setup"
    SCHEMA_TOTAL = "schema_total"
    TABLE_TOTAL = "table_total"
    PLAN_ATTEMPT = "plan_attempt"
    COUNT_ESTIMATE = "count_estimate"
    COUNT_EXACT = "count_exact"
    COUNT_NULLS = "count_nulls"
    BOUNDARIES = "boundaries"
    COPY_SINGLE = "copy_single"
    COPY_CHUNKS = "copy_chunks"
    RECONCILE_SOURCE = "reconcile_source"
    RECONCILE_TARGET = "reconcile_target"
    INDEX = "index"
    FTS = "fts"


def _token(value) -> str:
    """A value that cannot break the line format or leak SQL into the log.

    Each field stays one ``key=value`` token on one line, and the line stays greppable.
    """
    return _UNSAFE.sub("_", str(value))[:64]


class Stage:
    """What a ``stage`` block reports. Callers may set ``rows``, ``status``,
    ``reason`` and extra ``fields`` inside the block."""

    def __init__(self, name: StageName, fields: dict, rows=None):
        self.name = name
        self.fields = dict(fields)
        self.rows = rows
        self.status = "ok"
        self.reason = None
        self.seconds = 0.0


def format_stage_line(item: Stage) -> str:
    parts = [f"stage={item.name.value}"]
    parts += [f"{key}={_token(value)}" for key, value in item.fields.items() if value is not None]
    parts.append(f"seconds={item.seconds:.3f}")
    if item.rows is not None:
        parts.append(f"rows={int(item.rows)}")
    parts.append(f"status={_token(item.status)}")
    if item.reason:
        parts.append(f"reason={_token(item.reason)}")
    return " ".join(parts)


class StageSummary:
    """Per-table totals for one schema, rendered as a single line. ``stage``
    names the step when the summary is not the table copy."""

    def __init__(self, schema: str, stage: StageName | None = None):
        self.schema = schema
        self.stage = stage
        self.tables: list[tuple[str, float, int | None]] = []

    def add(self, table: str, seconds: float, rows=None) -> None:
        self.tables.append((table, seconds, rows))

    def line(self, top: int = 10) -> str:
        rows = sum(r for _, _, r in self.tables if r is not None)
        seconds = sum(s for _, s, _ in self.tables)
        slowest = sorted(self.tables, key=lambda t: t[1], reverse=True)[:top]
        top_part = ",".join(f"{_token(t)}:{s:.1f}" for t, s, _ in slowest)
        stage_part = f" stage={self.stage.value}" if self.stage else ""
        # FTS has no row count.
        rows_part = "" if self.stage is StageName.FTS else f" rows={rows}"
        return (
            f"stage_summary{stage_part} schema={_token(self.schema)} tables={len(self.tables)}"
            f"{rows_part} seconds={seconds:.3f} top={top_part}"
        )


@contextmanager
def stage(logger, name: StageName, summary: StageSummary | None = None, rows=None, **fields):
    """Time a block and log its stage line when it ends.

    An ``Exception`` is logged as ``status=failed`` with its type name and
    re-raised unchanged. Anything else (cancellation, ``KeyboardInterrupt``)
    passes through without a line.
    """
    item = Stage(name, fields, rows)
    start = time.perf_counter()
    try:
        yield item
    except Exception as exc:
        item.status, item.reason = "failed", type(exc).__name__
        _finish(logger, item, start, summary)
        raise
    _finish(logger, item, start, summary)


def _finish(logger, item: Stage, start: float, summary: StageSummary | None) -> None:
    """Never raises: timing must not change what the timed block did."""
    try:
        item.seconds = time.perf_counter() - start
        if summary is not None:
            summary.add(str(item.fields.get("table", "")), item.seconds, item.rows)
        if logger is not None:
            logger.info(format_stage_line(item))
    except Exception:
        pass
