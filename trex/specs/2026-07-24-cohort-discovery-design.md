# Cohort Discovery plugin group — design spec

**Date:** 2026-07-24
**Status:** Approved; compatibility gate executed & PASSED (see `trex/plans/2026-07-24-cohort-discovery-compat-gate.md`); implementation plan at `trex/plans/2026-07-24-cohort-discovery-bunny.md`.
**Scope (this iteration):** New `cohort_discovery` flow plugin group in Data2Evidence that wraps Hutch Bunny as a scheduled, short-run Relay Task API poller. **Flow-only** — the `jobplugins` API endpoint, Jobs-page UI, schedule controls, and run-history/status/results UI are **out of scope for this iteration** (consumption is the persisted Prefect artifact + Prefect's own run views).
**Bunny pin:** `hutch-bunny` **v1.7.0**, commit `a4121dc7a37660638763ed20b11d8882a7ab8edd` (git dependency — not PyPI).

---

## 1. Overview & goals

Add a new plugin group `plugins/flows/cohort_discovery/` whose Prefect flow acts as a **federated cohort-discovery node**: on a schedule it polls a Hutch **Relay Task API**, pulls one native **RQuest** task for a dataset, has **Hutch Bunny** resolve/execute it against the dataset's OMOP database, and returns the result to the Relay; the parent persists a normalized Prefect artifact. **This iteration is flow-only** — a `jobplugins` API endpoint and Jobs-page UI (schedule/on-off controls, run status/history/results) are **out of scope** here and, if wanted, would be a separate follow-up.

Goals:
- Reuse Bunny's native `TaskApiClient` / `PollingService` and its translate-and-execute API — no custom Relay REST client, no custom RQuest→SQL SQL generation unless Bunny cannot express a needed translation.
- Bunny executes against OMOP using **its own database client** (Postgres and DuckDB cachedb).
- Keep Bunny's Python ≥3.13 stack isolated from d2e's 3.12 flow stack via a **named, self-contained Pixi environment** (the `ner` pattern).
- Resolve per-dataset credentials dynamically through **DBDao** and map them into Bunny runtime configuration.

## 2. Non-goals

- **Not** a persistent daemon. Each scheduled run performs exactly one poll cycle (`max_iterations=1`) and exits; cadence is owned by the Prefect deployment schedule.
- **Not** an on-demand, user-triggered cohort-count endpoint. The flow is Relay-poller-only.
- **No `jobplugins` API endpoint and no Jobs-page UI this iteration** (schedule controls, on/off, run history/status, results UI are all out of scope). Consumption is the persisted Prefect artifact + Prefect's own run views.
- **Not** a Circe→RQuest translator. Input tasks arrive from the Relay already in native RQuest form; there is no d2e/Circe cohort definition on the input path.
- **Not** returning "the resolved cohort definition." Superseded: the flow executes and returns query **results** (counts / distributions).
- **No** cohort-scoped distributions. Distributions are dataset-wide only (Bunny does not support cohort-scoped distributions).
- **No** HANA/BigQuery execution. Bunny's client targets Postgres + DuckDB cachedb only for this feature.
- **No** per-run override of Bunny count-protection/obfuscation — those are deploy-time environment configuration, revisited later.

## 3. Architecture

### 3.1 Plugin group layout
```
plugins/flows/cohort_discovery/
  package.json           # trex.flow manifest: image, flows[], type="cohort_discovery", schedule
  pyproject.toml         # default (3.12) env + named "bunny" (3.13) self-contained env
  pixi.lock
  cohort_discovery_plugin/
    flow.py              # @flow orchestrator (runs in default 3.12 env)
    types.py             # Pydantic params + artifact envelope models
    bunny_runner.py      # entrypoint executed IN the 3.13 "bunny" env
  Dockerfile
```

### 3.2 Two Pixi environments (the `ner` analogy)
Following `data_transformation`'s `ner` convention (`[tool.pixi.feature.<name>]` + `[tool.pixi.environments] <name> = { features=[...], no-default-feature=true }`, provisioned by `pixi install --frozen -e <name>`):

- **`default` env — Python 3.12.** Contains `_shared_flow_utils` (DBDao) exactly like every other group. Runs the Prefect `@flow`, credential resolution, and artifact writing.
- **`bunny` env — Python 3.13, `no-default-feature=true`, `hutch-bunny`.** Self-contained; contains no d2e default deps. Runs `bunny_runner.py` (PollingService/TaskApiClient/execute_query).

**Rationale:** Bunny requires Python ≥3.13; DBDao/`_shared_flow_utils` are validated on 3.12. Separate self-contained envs mean the two dependency stacks never share a lockfile or interpreter, so "Bunny 3.13 vs DBDao compatibility" is resolved by isolation rather than co-resolution.

### 3.3 Process topology (approved Option 1)
A single scheduled flow run:
1. Prefect worker runs `flow.py` in the **default (3.12)** env.
2. The flow resolves the dataset's DB/cachedb credentials via **DBDao** (`datasetId` → `database_code`/`cache_id` → `DATABASE_CREDENTIALS` secret block → `DBCredentialsType`/`CacheDBCredentialsType`).
3. The flow maps those values to Bunny `DATASOURCE_*` config and invokes `bunny_runner.py` in the **`bunny` (3.13)** env as a child process (`pixi run -e bunny ...`), passing datasource + relay config via environment/args.
4. `bunny_runner.py` builds Bunny `DaemonSettings`, `TaskApiClient`, a `task_handler`, and `PollingService`; calls `poll_for_tasks(max_iterations=1)`. Bunny fetches one native task, `execute_query` resolves/executes it via Bunny's own DB client, and `send_results` posts the `RquestResult` back to the Relay.
5. `bunny_runner.py` emits a structured JSON summary (the resolved result + metadata, or a structured error) on stdout.
6. The flow parses that summary and writes the **normalized Prefect artifact** for Jobs-page consumption.

"All inside the Prefect flow" holds at the flow-orchestration level; Bunny executes in the named child env, mirroring how `ner` steps run.

### 3.4 Relay-task distribution model (approved interpretation)
This is a Relay-native poller, so the **Relay decides** which task is delivered each cycle; the flow resolves whatever native task arrives. Task class is governed by Bunny `TASK_API_TYPE` (a=Availability, b=Distribution). Concretely:
- **Availability** tasks: cohort-scoped; return patient counts (obfuscated per deploy-time protection).
- **Distribution** tasks: dataset-wide; Bunny distribution codes are exactly `DEMOGRAPHICS`, `GENERIC`, `ICD-MAIN`.
- `DEMOGRAPHICS` + `GENERIC` are supported. **`ICD-MAIN` is not executable at the pinned Bunny version** — `execute_query` raises `NotImplementedError` for `code == "ICD-MAIN"` before any solver runs ([hutch-bunny#30](https://github.com/Health-Informatics-UoN/hutch-bunny/issues/30)), so an `ICD-MAIN` task hard-fails the run. There is no feature toggle: one would be inert. Revisit if upstream adds support.

> **Correction (2026-07-27):** this section originally specified a deploy-time `ICD_MAIN` toggle defaulting off. That toggle was never implementable — upstream rejects `ICD-MAIN` unconditionally — and has been removed from the design rather than shipped as inert config.

## 4. Interfaces

### 4.1 Flow parameters (`types.py`)
- `datasetId: str` — the d2e dataset; also the Relay `COLLECTION_ID`.
- Derived at runtime: `database_code` / `cache_id` for DBDao resolution.
- All connection/relay/protection values come from **deployment environment variables**, not per-run params.

### 4.2 Deployment environment variables
- Relay: `TASK_API_BASE_URL` (incl. `/link_connector_api`), `TASK_API_USERNAME`, `TASK_API_PASSWORD`, `TASK_API_TYPE` (**`a`=availability | `b`=distribution only**), `TASK_API_ENFORCE_HTTPS` (default `true`; set `false` for a non-HTTPS relay), `COLLECTION_ID` (= `datasetId`).
- Datasource (populated at runtime from DBDao): `DATASOURCE_DB_HOST/PORT/DATABASE/SCHEMA/USERNAME/PASSWORD/DRIVERNAME`, or `DATASOURCE_DB_DRIVERNAME=duckdb` + `DATASOURCE_DUCKDB_PATH_TO_DB` for cachedb. **`DATASOURCE_DB_SCHEMA` is required even for DuckDB.**
- Protection: `LOW_NUMBER_SUPPRESSION_THRESHOLD`, `ROUNDING_TARGET`.
- Schedule cadence: Prefect deployment schedule (cron/interval).

### 4.3 Bunny API surface used (verified against v1.7.0 in the compat gate)
- `hutch_bunny.core.settings.DaemonSettings` — pydantic-settings, env-driven. **Required (no default): `DATASOURCE_DB_SCHEMA`, `TASK_API_BASE_URL`, `TASK_API_USERNAME`, `TASK_API_PASSWORD`, `COLLECTION_ID`.**
- `hutch_bunny.core.upstream.task_api_client.TaskApiClient(settings: DaemonSettings)` → `send_results(RquestResult, ...)`.
- `hutch_bunny.core.upstream.polling_service.PollingService(client, task_handler, settings).poll_for_tasks(max_iterations=1)`.
- `hutch_bunny.core.db.get_db_client() -> BaseDBClient` — **no arguments** (module `core.db`; DuckDB via `DuckDBClient`). This is Bunny's own client.
- `hutch_bunny.core.execute_query.execute_query(query_dict, results_modifier, db_client, settings=None, encode_result=True) -> RquestResult` — dispatches availability vs distribution by the `analysis` key; serialize via `RquestResult.to_dict()`.
- **⚠ Import-time env ordering:** importing `core.execute_query` / `core.upstream.task_handler` / `core.db` constructs `Settings` at import and raises unless `DATASOURCE_*` + `TASK_API_*` + `COLLECTION_ID` are set first (and non-HTTPS relay needs `TASK_API_ENFORCE_HTTPS=false`). `bunny_runner.py` **must populate env before importing Bunny**.

### 4.4 Normalized artifact envelope (Jobs-page contract)
```jsonc
{
  "availability": { "count": <int|null>, "obfuscation": { "suppression": <int>, "rounding": <int> } },
  "distributions": { "DEMOGRAPHICS": [<rows>], "GENERIC": [<rows>] },
  "metadata": { "datasetId": <str>, "cohortName": <str|null>, "generatedAt": <iso8601>, "taskId": <str>, "taskType": "availability|distribution" },
  "errors": [<structured error>]  // present on hard-fail; see §5
}
```
A given run carries either an `availability` or a `distributions` payload depending on the native task type; the envelope shape is stable regardless.

### 4.5 jobplugins endpoint + Jobs-page UI — OUT OF SCOPE (this iteration)
Deferred. A future follow-up could add a `CohortDiscoveryController` at `/jobplugins/cohort-discovery` (schedule on/off + cadence via `PrefectAPI`, run history/status, results via `getFlowRunsArtifactsByFlowRunId`) plus a Jobs-page view — but **none of that is implemented in this iteration**. For now, results are the persisted Prefect artifact and Prefect's own run views.

## 5. Error handling
- **Hard-fail on unsupported inputs/rules.** If a native task uses an RQuest construct Bunny (or an approved custom converter) cannot translate, the run fails with a structured error `{ code: "UNSUPPORTED_RULE", detail, taskId }`; no partial/approximate result is produced or returned.
- **Hard-fail on execution/config errors** (credential resolution failure, datasource unreachable, Bunny non-zero exit): the flow run is marked FAILED, the error is captured in the artifact `errors[]`, and — where the Relay protocol supports it — a failure status is reported to the Relay.
- **Relay submission retries** use Bunny's built-in `send_results` retry (default 4×/5s). Exhausted retries fail the run.
- **Empty poll** (no task available this cycle) is a successful no-op run (empty artifact, `metadata` only).
- **Custom-converter policy:** custom conversion is permitted only where Bunny's native API cannot express a required translation; any construct outside the supported subset still hard-fails rather than being approximated.

## 6. Testing approach
- **Pure logic (default env, 3.12):** `prefect_test_harness()` for the flow orchestration — DBDao credential mapping to `DATASOURCE_*`, artifact envelope construction, hard-fail branches. DBDao and the Bunny subprocess are mocked.
- **Bunny runner (bunny env, 3.13):** unit-test `bunny_runner.py` with a mocked `TaskApiClient`/Relay and a DuckDB cachedb fixture: assert `poll_for_tasks(max_iterations=1)` handles one availability task and one distribution task, `execute_query` returns an `RquestResult`, `send_results` is called, and the stdout summary matches the envelope.
- **Env isolation / compatibility gate:** a provisioning check that `pixi install --frozen -e bunny` resolves on 3.13 and that `bunny_runner.py` imports `hutch_bunny` and constructs `DaemonSettings` from mapped `DATASOURCE_*`. This is the explicit "Bunny 3.13 vs DBDao compatibility" validation — satisfied by isolation.
- **Integration (deferred):** end-to-end against a real Relay requires the Relay endpoint/credentials, which are supplied at deployment; until then, a mocked Relay stands in.
- **jobplugins/UI tests:** out of scope this iteration (no endpoint/UI is built).

## 7. Open risks / spike
- **Spike — DONE (PASSED).** The compatibility gate (`trex/plans/2026-07-24-cohort-discovery-compat-gate.md`) empirically confirmed with pixi 0.72.2: the isolated `bunny` env builds on **Python 3.13.14** with `hutch-bunny` **from git @ `a4121dc7…` (v1.7.0)**, the `default` env on **3.12.13**, they coexist (separate solve-groups), and Bunny's `DaemonSettings`/`TaskApiClient`/`PollingService`/`get_db_client`/`execute_query` are present. Note: Bunny is a **git** dependency (not PyPI), and its `Settings` validate at import → env must be set before importing Bunny (§4.3).
- **Manifest schedule field:** the `trex.flow` manifest has no schedule field today; registering a recurring Prefect schedule is net-new plumbing (add to manifest/registration).
- **Relay protocol details** (task-claim semantics, failure-status reporting) are taken from Bunny's `TaskApiClient` behavior; confirmed against a live Relay at deployment.
- **Dedicated branch + committed lockfile:** implementation must run on a fresh branch (not the current unrelated `Zhimin-arya/data-2745_fix_update_metadata`), and a `pixi.lock` covering both envs must be generated and committed (runtime provisioning is `--frozen`).

## 8. Registration & deployment
- Group `package.json` `trex.flow` manifest (`type: "cohort_discovery"`, image, `flows[]` entrypoint + command targeting the flow; the flow internally shells to the `bunny` env) — discovered from the `trex.plugins` table at `jobplugins` boot and pre-warmed by the dataflow process worker.
- A Prefect deployment carrying the configurable schedule; relay/protection values as deploy-time env.
- One poller deployment per dataset (single `COLLECTION_ID` per deployment).
