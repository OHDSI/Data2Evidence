# Hutch Bunny integration notes (v1.7.0)

Reference notes for the `cohort_discovery` flow group. These document the pinned
Hutch Bunny symbols that Tasks 5–7 depend on. All facts below were verified
against the gate-tested pin.

## Pin

- Hutch Bunny **v1.7.0**, code commit `a4121dc7a37660638763ed20b11d8882a7ab8edd`
  (peeled annotated tag).
- Bunny is a **git dependency, not on PyPI**. See `pyproject.toml`
  (`[tool.pixi.feature.bunny.pypi-dependencies]`).

## API surface (v1.7.0)

### Settings — `hutch_bunny.core.settings.DaemonSettings(...)`

- A `pydantic-settings` `BaseSettings`; **reads env on init**.
- Required env with **no default**:
  - `DATASOURCE_DB_SCHEMA`
  - `TASK_API_BASE_URL`
  - `TASK_API_USERNAME`
  - `TASK_API_PASSWORD`
  - `COLLECTION_ID`
- `TASK_API_TYPE: Literal['a','b']` — `a` = availability, `b` = distribution.
  **There is NO `'c'`.**
- `TASK_API_ENFORCE_HTTPS: bool = True` — a non-HTTPS `TASK_API_BASE_URL`
  requires `TASK_API_ENFORCE_HTTPS=false`.
- `DATASOURCE_DB_DRIVERNAME` ∈ `postgresql | mssql | duckdb | snowflake-connector-python`.

### Task API client — `hutch_bunny.core.upstream.task_api_client.TaskApiClient`

- `TaskApiClient(settings: DaemonSettings)`
- `.send_results(RquestResult)`
- `.get(...)`

### Polling — `hutch_bunny.core.upstream.polling_service.PollingService`

- `PollingService(client, task_handler: Callable, settings)`
- `.poll_for_tasks(max_iterations: int | None = None)` — `max_iterations=1` confirmed.

### DB client — `hutch_bunny.core.db.get_db_client() -> BaseDBClient`

- Takes **NO args**.
- Module is `core.db` (**not** `core.db_manager`).
- DuckDB is served via `DuckDBClient`.

### Query execution — `hutch_bunny.core.execute_query.execute_query`

- `execute_query(query_dict, results_modifier, db_client, settings=None, encode_result=True) -> RquestResult`
- Dispatches on the `"analysis"` key.
- `RquestResult.to_dict()` returns a serializable dict.

### Task handling — `hutch_bunny.core.upstream.task_handler.handle_task`

- `handle_task(task_data, db_client, settings, client)`

## CRITICAL: import-time env ordering

Importing `core.execute_query`, `core.upstream.task_handler`, or `core.db`
**constructs a Settings object AT IMPORT TIME**, which raises unless the
`DATASOURCE_*` + `TASK_API_*` + `COLLECTION_ID` env vars are already set.

Therefore `bunny_runner.py` **MUST set all required env before importing any
Bunny module**. Do not place a Bunny import at module top before env is
populated.

## Still to pin during implementation

Record these placeholders now and confirm from source during Tasks 5–7:

- The `DBDao` `CacheDBCredentialsType` attribute holding the **DuckDB file path**
  — TODO: confirm exact attribute name from source.
- The exact `RquestResult.to_dict()` keys for **`count`** and **distribution rows**
  — TODO: confirm exact key names from source.
