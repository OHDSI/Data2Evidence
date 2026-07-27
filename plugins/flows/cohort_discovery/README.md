# cohort_discovery flow group

A scheduled, short-run Prefect flow that connects a d2e dataset to a **Hutch
Relay Task API** through [Hutch Bunny](https://github.com/Health-Informatics-UoN/hutch-bunny).

On each tick — where a **tick is a single run of this flow**, i.e. one trigger
of the Prefect deployment (scheduled or manual) — the flow:

1. Polls the Relay Task API (via Bunny's `PollingService`) for **one** pending
   task and returns it (`max_iterations=1` — one task per tick).
2. Executes the task against the dataset's OMOP database through **Bunny's own
   DB client** (no d2e query layer in the child). Direct Postgres datasets use
   Bunny's postgres client; **cachedb is reached over Trex's PostgreSQL wire
   protocol**, with `TrexDao` resolving the connection details only.
3. Submits the resolved result back to Relay (`TaskApiClient.send_results`).
4. Persists a normalized Prefect **markdown artifact**
   (`cohort-discovery-result`) with the availability count / distributions and
   obfuscation settings. The artifact is written on **both** the success and the
   hard-fail path — on failure the structured error is carried in the envelope's
   `errors` list, so a failed run is still inspectable.

The flow is designed to be driven by a Prefect **deployment schedule**. One
**tick = one flow run = one trigger of the deployment**, and each run performs
**exactly one poll** — there is no in-process polling loop. Cadence is therefore
entirely a function of the deployment's schedule: to poll more often, schedule
the deployment more often.

## Datasource / cachedb access

Bunny **always owns SQL execution**. We never hand it a d2e connection object:
`hutch_bunny.core.db.base.BaseDBClient` requires a SQLAlchemy `Engine` plus
`Executable` statements, which the psycopg2-based `TrexDao` does not expose. The
parent's only job is to resolve connection details and pass them as
`DATASOURCE_*` env vars.

Two dialects are supported: **`postgres`** and **`trex`**. Anything else
(including `duckdb`, `hana`, `bigquery`) hard-fails in `build_bunny_env`.

| Dialect    | How Bunny connects                                                                   |
| ---------- | ------------------------------------------------------------------------------------ |
| `postgres` | Directly to the dataset's Postgres. `DATASOURCE_DB_DATABASE` = the dataset database.  |
| `trex`     | **Trex serves the PostgreSQL wire protocol**, so Bunny uses its ordinary PostgreSQL client (`DATASOURCE_DB_DRIVERNAME=postgresql`) pointed at Trex's pgwire endpoint. `DATASOURCE_DB_DATABASE` = the **`cache_id`** (the pgwire dbname). |

For cachedb, `TrexDao` is used **only to resolve** host / port / user / password
and the `cache_id`; the query path itself is Bunny → Trex over pgwire. There is
no adapter layer and **no DuckDB file path in production** — a local DuckDB file
is used only as a cheap fixture for the env-gated integration test.

## Two-environment architecture

Bunny requires Python 3.13, while the d2e flow worker / `_shared_flow_utils`
(DBDao, ibis, prefect) run on 3.12. The group therefore uses two isolated pixi
environments (see `pyproject.toml` + `pixi.lock`):

- **`default` (Python 3.12)** — the parent `flow.py`. Resolves dataset DB /
  cachedb credentials via `DBDao`, maps them to Bunny `DATASOURCE_*` env, and
  spawns the child.
- **`bunny` (Python 3.13, `no-default-feature`)** — the child
  `cohort_discovery_plugin.bunny_runner`, invoked as
  `pixi run --frozen -e bunny python -m cohort_discovery_plugin.bunny_runner`.
  hutch-bunny is a **git pypi-dependency pinned to commit
  `a4121dc7a37660638763ed20b11d8882a7ab8edd`** (v1.7.0); it is not on PyPI.

The parent passes config to the child over env vars and reads a single JSON
line from the child's stdout. `setup_assets.sh` is a no-op: this group has no
downloadable assets.

## Required deploy-time environment variables

| Env var                             | Meaning                                                                                   |
| ----------------------------------- | ----------------------------------------------------------------------------------------- |
| `TASK_API_BASE_URL`                 | Relay Task API base URL, **including the `/link_connector_api` path**.                     |
| `TASK_API_USERNAME`                 | Relay Task API username.                                                                   |
| `TASK_API_PASSWORD`                 | Relay Task API password.                                                                   |
| `TASK_API_TYPE`                     | `a` = availability, `b` = distribution. (Bunny has no `c`.)                                |
| `COLLECTION_ID`                     | The Relay collection id — **equal to the d2e `datasetId`** this poller serves.             |
| `DATASOURCE_DB_SCHEMA`              | **Required.** Bunny's `DaemonSettings` declares it with **no default**, so `Settings()` raises for every driver if it is unset. |
| `LOW_NUMBER_SUPPRESSION_THRESHOLD`  | Low-number suppression threshold applied to results (e.g. `10`).                           |
| `ROUNDING_TARGET`                   | Rounding target applied to results (e.g. `10`).                                            |
| `TASK_API_ENFORCE_HTTPS`            | Set **`false`** for a non-HTTPS Relay `TASK_API_BASE_URL`. Bunny's `DaemonSettings` enforces HTTPS by default. |

If `TASK_API_BASE_URL` is not HTTPS, also set `TASK_API_ENFORCE_HTTPS=false`
(Bunny's `DaemonSettings` enforces HTTPS by default).

The remaining `DATASOURCE_DB_*` connection values are derived by the flow from
`DBDao` / `TrexDao` at run time and do not need to be set by hand.

### Supported distribution task types

Bunny resolves `DEMOGRAPHICS` and `GENERIC` distribution tasks. **`ICD-MAIN` is
not executable at the pinned Bunny version and there is no configuration that
enables it** — `execute_query` raises `NotImplementedError` for
`code == "ICD-MAIN"` before any solver runs
([hutch-bunny#30](https://github.com/Health-Informatics-UoN/hutch-bunny/issues/30)).

If the Relay dispatches an ICD-MAIN task, the child exits non-zero, the run
hard-fails, and the error is recorded in the persisted artifact's `errors[]`.
No partial or approximated result is returned to the Relay. Revisit if upstream
adds support.

### Where deploy-time env is configured

These values are supplied to the **dataflow worker runtime** — i.e.
`docker-compose.yml` for local/compose deployments and
`charts/d2e-services/templates/dataflow-worker-deployment.yaml` for Helm/k8s.
**The exact wiring is still pending confirmation with the reviewer** (which of
these values are per-deployment Prefect job variables vs. worker-wide env), so
treat the table above as the required set rather than as a finished deployment
recipe.

### Schedule (cadence)

Cadence is driven by the Prefect **deployment schedule**, not by any env var —
set the schedule on the deployment to control how often the flow polls Relay.

## One poller per dataset

Each deployment serves a **single `COLLECTION_ID` (one dataset)**. Run one
poller deployment per dataset; do not multiplex datasets through a single
deployment.

## Scope

This iteration is **flow + worker provisioning only**. There is **no `jobplugins`
API endpoint and no Jobs-page UI** — consumption is the persisted Prefect
artifact plus Prefect's own run views. Schedule controls, run-history/status UI,
and results UI are out of scope for this iteration.

## Tests

See `cohort_discovery_plugin/tests/README.md` for the unit suite command and the
env-gated integration test (`TEST_OMOP_DUCKDB`, `TEST_RELAY_URL`).
