import threading

from prefect import flow
from prefect.cache_policies import _None


def _import_modules():
    # Deferred imports: module-level @task decorators need the session fixture's
    # Prefect Variables to exist first.
    import create_cachedb_file_plugin.copy as copy_mod
    import create_cachedb_file_plugin.flow as flow_mod
    from create_cachedb_file_plugin.types import (
        CacheFlowAction,
        CopyParameters,
        CreateCacheOptions,
    )
    return copy_mod, flow_mod, CopyParameters, CreateCacheOptions, CacheFlowAction


class RecordingCursor:
    """Stand-in for a live psycopg2 cursor: records SQL and is intentionally
    unserializable (thread locks cannot be pickled or JSON-encoded)."""

    def __init__(self):
        self.statements = []
        self._lock = threading.Lock()

    def execute(self, sql, *args, **kwargs):
        self.statements.append(str(sql))


def _copy_params(CopyParameters):
    return CopyParameters(
        source_database="demo__srcdb",
        target_database="demo",
        source_schema="cdm_src",
        target_schema="cdm_tgt",
        vocab_schema=None,
        patient_filter=None,
        table_filter=None,
        timestamp_filter=None,
        fts_tables=[],
        limit_statement="",
        chunk_size=None,
    )


def test_handle_receiving_tasks_disable_input_hashing():
    copy_mod, flow_mod, *_ = _import_modules()
    for task_fn in [
        copy_mod.create_cache_status_table,
        copy_mod.drop_cache_status_table,
        copy_mod.create_schema_tables_task,
        copy_mod.copy_table_task,
        flow_mod.copy_all_schemas,
        flow_mod.attach_to_source_db,
        flow_mod.load_extensions,
    ]:
        # Accepts both NONE and NO_CACHE (distinct _None() singletons); also
        # robust to PREFECT_TASKS_DISABLE_CACHING normalizing the stored policy.
        assert isinstance(task_fn.cache_policy, _None), (
            f"{task_fn.name} receives live DB handles and must set cache_policy=NONE "
            f"(Prefect >=3.1 raises HashError on unserializable task inputs)"
        )


def test_task_accepts_unpicklable_cursor_input():
    """Reproduces issue #2745's HashError: pre-fix, the task's DEFAULT cache
    policy (which includes Inputs) tries to hash the live cursor and raises
    prefect.exceptions.HashError ("cannot pickle ..."), surfaced by prefect's
    Inputs.compute_key as a ValueError chained from the HashError.

    Note: on prefect 3.6.10 the task engine catches this at runtime and logs
    "Error encountered when computing cache key - result will not be
    persisted." on every task run instead of crashing, but the hashing failure
    is the same one reported in #2745. With cache_policy=NONE inputs are never
    hashed: compute_key returns None and the run stays clean."""
    copy_mod, _, CopyParameters, *_ = _import_modules()
    cursor = RecordingCursor()
    params = _copy_params(CopyParameters)

    # Pre-fix this raises (HashError: cannot pickle '_thread.lock' object);
    # post-fix (cache_policy=NONE) it returns None without touching the inputs.
    key = copy_mod.create_cache_status_table.cache_policy.compute_key(
        task_ctx=None,
        inputs={"con": cursor, "copy_params": params},
        flow_parameters=None,
    )
    assert key is None

    @flow
    def run():
        copy_mod.create_cache_status_table(cursor, params)

    run()
    assert len(cursor.statements) >= 1  # task body executed against the fake cursor


def _run_create_cache_flow(monkeypatch, **options_kwargs):
    """Drives create_cache_flow with fakes for the DAO and the copy tasks and
    captures what catalog/file the cache write is aimed at."""
    _, flow_mod, _, CreateCacheOptions, CacheFlowAction = _import_modules()
    from prefect.variables import Variable

    Variable.set("duckdb_data_folder", "/tmp/duckdb-2745", overwrite=True)

    captured = {}

    class FakeDBDao:
        def __init__(self, database_code, cache_id=None):
            captured["dbdao"] = {"database_code": database_code, "cache_id": cache_id}
            self.database_code = database_code
            self.cache_id = cache_id
            self.dialect = "postgres"
            self.tenant_configs = object()

    def record_target(use_trex_connection, copy_params, duckdb_file_path):
        captured["copy_params"] = copy_params
        captured["duckdb_file_path"] = duckdb_file_path

    monkeypatch.setattr(flow_mod, "DBDao", FakeDBDao)
    monkeypatch.setattr(flow_mod, "create_schema_if_not_exists_task", record_target)
    monkeypatch.setattr(
        flow_mod, "create_schema_tables_task", lambda *args, **kwargs: None
    )
    monkeypatch.setattr(
        flow_mod, "create_fts_index_task", lambda *args, **kwargs: None
    )

    options = CreateCacheOptions(
        flowActionType=CacheFlowAction.CREATE_DATAMART_CACHE,
        databaseCode="alpdev_pg",
        schemaName="cdmdefault",
        **options_kwargs,
    )

    @flow
    def run():
        flow_mod.create_cache_flow(options)

    run()
    return captured


def test_create_cache_flow_writes_into_cache_id_catalog(monkeypatch):
    """#2745: the cache must be written into the portal-assigned {cacheId}
    catalog/file — the one "Update metadata" reads (USE <cacheId>) — while the
    source attach stays on the database_code."""
    captured = _run_create_cache_flow(monkeypatch, cacheId="cdm000111222")

    assert captured["dbdao"] == {
        "database_code": "alpdev_pg",
        "cache_id": "cdm000111222",
    }
    assert captured["copy_params"].source_database == "alpdev_pg__srcdb"
    assert captured["copy_params"].target_database == "cdm000111222"
    assert captured["duckdb_file_path"] == "/tmp/duckdb-2745/cdm000111222.db"


def test_create_cache_flow_falls_back_to_database_code_without_cache_id(monkeypatch):
    """Legacy callers (and HANA, where cacheId == databaseCode) that pass no
    cacheId keep writing into the {database_code} catalog."""
    captured = _run_create_cache_flow(monkeypatch)

    assert captured["copy_params"].target_database == "alpdev_pg"
    assert captured["duckdb_file_path"] == "/tmp/duckdb-2745/alpdev_pg.db"


def test_create_cache_options_accepts_cache_id_alias():
    *_, CreateCacheOptions, CacheFlowAction = _import_modules()
    opts = CreateCacheOptions(
        flowActionType=CacheFlowAction.CREATE_DATAMART_CACHE,
        databaseCode="alpdev_pg",
        cacheId="cdm000111222",
        schemaName="cdmvocab",
    )
    assert opts.cache_id == "cdm000111222"
