# cohort_discovery flow group

A scheduled, short-run Prefect flow that connects a d2e dataset to a **Hutch
Relay Task API** through [Hutch Bunny](https://github.com/Health-Informatics-UoN/hutch-bunny).

On each tick the flow:

1. Polls the Relay Task API (via Bunny's `PollingService`) for **one** pending
   task and returns it (`max_iterations=1` — one task per tick).
2. Executes the task against the dataset's OMOP database through **Bunny's own
   DB client** (Postgres or DuckDB cachedb; no d2e query layer in the child).
3. Submits the resolved result back to Relay (`TaskApiClient.send_results`).
4. Persists a normalized Prefect **markdown artifact**
   (`cohort-discovery-result`) with the availability count / distributions and
   obfuscation settings.

The flow is designed to be driven by a Prefect **deployment schedule** — each
scheduled run is one poll tick, so cadence is entirely a function of the
deployment's schedule.

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
| `LOW_NUMBER_SUPPRESSION_THRESHOLD`  | Low-number suppression threshold applied to results (e.g. `10`).                           |
| `ROUNDING_TARGET`                   | Rounding target applied to results (e.g. `10`).                                            |
| `COHORT_DISCOVERY_ICD_MAIN_ENABLED` | Enable ICD_MAIN distribution tasks. **Default off.** When off, ICD_MAIN distribution tasks are excluded. |
| `TASK_API_ENFORCE_HTTPS`            | Set **`false`** for a non-HTTPS Relay `TASK_API_BASE_URL`. Bunny's `DaemonSettings` enforces HTTPS by default. |

If `TASK_API_BASE_URL` is not HTTPS, also set `TASK_API_ENFORCE_HTTPS=false`
(Bunny's `DaemonSettings` enforces HTTPS by default).

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
