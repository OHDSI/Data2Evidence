"""Behavioural tests of copy.create_schema_tables, with prefect and friends stubbed.

Only the copy/index steps are replaced; the status tables, fresh-copy reset and
the WebAPI-table skip run for real against local DuckDB.
"""

import importlib
import logging
import sys
from types import SimpleNamespace
from unittest import mock

import duckdb
import pytest

from create_cachedb_file_plugin.types import CopyParameters

DB = "cachedb"
SCHEMA = "cdmresults"

_STUBBED = [
    "psycopg2", "prefect", "prefect.cache_policies", "prefect.variables",
    "prefect.blocks", "prefect.blocks.system", "prefect.context",
    "prefect.logging", "prefect.runtime", "prefect.tasks",
    "_shared_flow_utils", "_shared_flow_utils.types",
]


@pytest.fixture()
def copy_module():
    saved = {n: sys.modules.get(n) for n in _STUBBED}
    saved_pkg = {n: sys.modules.get(n) for n in list(sys.modules) if n.startswith("create_cachedb_file_plugin.") and n.split(".")[-1] in ("copy", "utils")}
    for n in _STUBBED:
        sys.modules[n] = mock.MagicMock()
    # A pass-through @task keeps the decorated functions callable.
    sys.modules["prefect"].task = lambda *a, **k: (lambda f: f)
    for n in saved_pkg:
        sys.modules.pop(n)
    try:
        yield importlib.import_module("create_cachedb_file_plugin.copy")
    finally:
        for n in ("copy", "utils"):
            sys.modules.pop(f"create_cachedb_file_plugin.{n}", None)
        for n, m in saved.items():
            if m is None:
                sys.modules.pop(n, None)
            else:
                sys.modules[n] = m
        for n, m in saved_pkg.items():
            sys.modules[n] = m


def _params(**kw):
    base = dict(
        source_database="src", target_database=DB, source_schema=SCHEMA,
        target_schema=SCHEMA, vocab_schema=None, patient_filter=None,
        table_filter=None, timestamp_filter=None, fts_tables=[],
        limit_statement="", chunk_size=None, fresh_copy=True,
    )
    base.update(kw)
    return CopyParameters(**base)


def _run(copy_module, params):
    conn = duckdb.connect()
    conn.execute(f"ATTACH ':memory:' AS {DB}")
    conn.execute(f'CREATE SCHEMA "{DB}"."{SCHEMA}"')
    conn.execute(f'CREATE TABLE "{DB}"."{SCHEMA}"."cohort" (cohort_definition_id BIGINT)')
    conn.execute(f'INSERT INTO "{DB}"."{SCHEMA}"."cohort" VALUES (1001)')
    # Interrupted copy: checkpointed IN_PROGRESS, not COMPLETE.
    from create_cachedb_file_plugin.checkpoint import ensure_status_tables, mark_in_progress
    log = logging.getLogger("t")
    ensure_status_tables(conn, DB, SCHEMA, log)
    mark_in_progress(conn, DB, SCHEMA, "cohort", "plan-a", 4, 100)

    read_conn = SimpleNamespace(
        get_table_names=lambda schema: ["cohort", "person"],
        tenant_configs=SimpleNamespace(dialect="postgres"),
    )
    copied = []
    copy_module.prefect_flow_run = SimpleNamespace(id="run-1")
    with mock.patch.object(copy_module, "copy_table_task", lambda w, r, p, q, s: copied.append(q.table)), \
         mock.patch.object(copy_module, "copy_indexes", lambda *a, **k: None):
        copy_module.create_schema_tables(conn, read_conn, params, log)
    conn.execute(f'SELECT COUNT(*) FROM information_schema.tables WHERE table_catalog=\'{DB}\' AND table_name=\'cohort\'')
    return copied, conn.fetchone()[0]


def test_results_pass_keeps_and_does_not_recopy_an_existing_cohort(copy_module):
    copied, cohort_exists = _run(copy_module, _params(protect_webapi_results=True))
    assert copied == ["person"]
    assert cohort_exists == 1


def test_cdm_pass_resets_and_recopies_cohort(copy_module):
    copied, cohort_exists = _run(copy_module, _params())
    assert sorted(copied) == ["cohort", "person"]
    assert cohort_exists == 0  # dropped by the reset; the stubbed copy did not recreate it
