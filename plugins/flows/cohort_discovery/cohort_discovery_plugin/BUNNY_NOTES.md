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

- `handle_task(task_data, db_client, settings, task_api_client)` — the 4th
  positional arg is named `task_api_client` (a `TaskApiClient`), **not** `client`.

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
  — TODO: confirm exact key names from source. (`RquestResult.to_dict` confirmed
  to exist on `hutch_bunny.core.rquest_models.result.RquestResult`.)

## Actual observed signatures (verified against installed pin `a4121dc`)

Captured via `inspect.signature` under `pixi run -e bunny` (Python 3.13):

```
handle_task(task_data: dict[str, object], db_client: hutch_bunny.core.db.base.BaseDBClient, settings: hutch_bunny.core.settings.DaemonSettings, task_api_client: hutch_bunny.core.upstream.task_api_client.TaskApiClient) -> None
get_db_client() -> hutch_bunny.core.db.base.BaseDBClient
execute_query(query_dict: dict[str, object], results_modifier: list[dict[str, str | int]], db_client: hutch_bunny.core.db.base.BaseDBClient, settings: hutch_bunny.core.settings.Settings | None = None, encode_result: bool = True) -> hutch_bunny.core.rquest_models.result.RquestResult
PollingService.poll_for_tasks(self, max_iterations: int | None = None) -> None
PollingService.__init__(self, client: TaskApiClient, task_handler: Callable, settings: DaemonSettings) -> None
TaskApiClient.__init__(self, settings: DaemonSettings)
```

Reality-check corrections/refinements to the notes above:

- `handle_task`'s 4th arg is `task_api_client`, not `client`.
- `TASK_API_TYPE` is `Optional[Literal['a','b']]` with default `None` (not a
  required field); `a` = availability, `b` = distribution, no `'c'`.
- `DATASOURCE_DB_DRIVERNAME` default is `postgresql`, constrained by regex
  `^(postgresql|mssql|duckdb|snowflake-connector-python)$`.
- `DaemonSettings` required (no-default) fields confirmed: `DATASOURCE_DB_SCHEMA`,
  `TASK_API_BASE_URL`, `TASK_API_USERNAME`, `TASK_API_PASSWORD`, `COLLECTION_ID`.
  Additionally `DATASOURCE_DB_HOST` / `DATASOURCE_DB_PORT` / `DATASOURCE_DB_DATABASE`
  are required **unless** `DATASOURCE_DB_DRIVERNAME=duckdb` (port also optional for
  `snowflake-connector-python`).
- Import-time env ordering CONFIRMED: importing `core.db` (via
  `core.db.sync` → `settings = Settings()`) raised a pydantic `ValidationError`
  until the required `DATASOURCE_*` env was set.
