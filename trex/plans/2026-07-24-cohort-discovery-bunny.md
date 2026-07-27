# Cohort Discovery — Hutch Bunny Relay Poller Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a new `cohort_discovery` d2e flow plugin group: a scheduled, short-lived Prefect flow that polls the Hutch Relay Task API via Bunny's `TaskApiClient`/`PollingService`, executes native RQuest tasks against the dataset's OMOP DB through Bunny's own DB client, submits results to Relay, and persists a normalized Prefect artifact.

**Architecture:** Option A process split. A **Python 3.12 parent** Prefect flow resolves the dataset's DB/cachedb credentials via **DBDao**, maps them to Bunny's `DATASOURCE_*` config, and invokes **Hutch Bunny** in an **isolated named Pixi Python 3.13 child environment** (the `data_transformation` `ner` pattern). The child runs the Bunny poll/execute/submit; the parent parses the child's JSON output and writes the artifact. Consumption is the persisted Prefect artifact (+ Prefect's own run views). **This iteration is flow-only — no `jobplugins` API endpoint and no Jobs-page UI** (out of scope per the team's decided scope for this plan).

**Tech Stack:** Prefect 3 (Python), Pixi (multi-env), Hutch Bunny (`hutch-bunny`, Python ≥3.13), DBDao (`_shared_flow_utils`), Postgres + DuckDB cachedb, pytest + `prefect_test_harness`.

---

## Scope & non-goals (team-decided scope for this plan)

> **Scope note:** this plan is **flow-only** (Tasks 1–9). The team's decided scope for this iteration **excludes** the `jobplugins` API endpoint, the Jobs-page UI, schedule controls, run history/status UI, and any results UI. Consumption is the persisted Prefect artifact + Prefect's own run views. (A `jobplugins`/Jobs-UI layer may be planned separately later; it is not part of this plan.)

**In scope:** flow group, the 3.13 named Pixi env, shared-worker provisioning change, Relay submission (by Bunny), normalized Prefect artifact persistence (by parent), and tests + compatibility validation.

**Non-goals (explicit):**
- **No `jobplugins` API endpoint, no Jobs-page UI, no schedule controls / run-history-status UI / results UI** (excluded from this iteration).
- No user-triggered/on-demand cohort execution (the flow only polls native Relay tasks).
- No Circe→RQuest translation (Relay tasks are already RQuest); no custom converter unless the Task 1 spike proves it necessary.
- No cohort-scoped distributions (Bunny distributions are dataset-wide).
- No databases beyond Postgres and DuckDB cachedb.
- No persistent daemon (cadence is the Prefect schedule).
- No single combined 3.13 env (DBDao stays on the 3.12 parent).
- No per-run Bunny count-protection config (deploy-time env only).

## Normalized artifact envelope (target)

```json
{
  "availability":  { "count": 0, "obfuscation": { "suppression": 10, "rounding": 10 } },
  "distributions": { "DEMOGRAPHICS": [], "GENERIC": [] },
  "metadata":      { "datasetId": "", "cohortName": "", "generatedAt": "" }
}
```
(`ICD_MAIN` key present only when the deploy-time toggle is on.)

## Verified Bunny wiring (from `hutch_bunny/daemon.py`, main branch)

```python
from hutch_bunny.core.settings import DaemonSettings           # pydantic-settings BaseSettings; reads env on init
from hutch_bunny.core.upstream.task_api_client import TaskApiClient   # TaskApiClient(settings=...); .send_results(RquestResult); .get(...)
from hutch_bunny.core.db import get_db_client                  # get_db_client() -> Bunny DB client, reads settings/env
from hutch_bunny.core.upstream.polling_service import PollingService  # PollingService(client, handler, settings).poll_for_tasks(max_iterations=None)
from hutch_bunny.core.upstream.task_handler import handle_task # handle_task(task_data, db_client, settings, client)

settings = DaemonSettings()
db_client = get_db_client()
client = TaskApiClient(settings=settings)
polling = PollingService(client, lambda task_data: handle_task(task_data, db_client, settings, client), settings)
polling.poll_for_tasks()   # our flow passes max_iterations=1
```

### Compatibility gate — DONE (see `trex/plans/2026-07-24-cohort-discovery-compat-gate.md`)

The pre-implementation gate has been **executed and passed empirically** (pixi 0.72.2, exact repo version). Confirmed against **hutch-bunny `v1.7.0`**:

- **Pin:** `v1.7.0` code commit = **`a4121dc7a37660638763ed20b11d8882a7ab8edd`** (peeled annotated tag).
- **Bunny is a git dependency, NOT PyPI.** Use a git source pinned to the tag/commit (see corrected Task 1 pyproject).
- **Envs coexist:** isolated `bunny` env built on **Python 3.13.14** with Bunny from git; `default` env on **Python 3.12.13**; separate solve-groups, `no-default-feature` — the `ner` pattern. Both `pixi install` exit 0.
- **Confirmed API surface (v1.7.0):**
  - `hutch_bunny.core.settings.DaemonSettings(...)` — required env (no default): `DATASOURCE_DB_SCHEMA`, `TASK_API_BASE_URL`, `TASK_API_USERNAME`, `TASK_API_PASSWORD`, `COLLECTION_ID`. `TASK_API_TYPE: Literal['a','b']` (**a=availability, b=distribution; no `c`**). `TASK_API_ENFORCE_HTTPS: bool = True`. `DATASOURCE_DB_DRIVERNAME` ∈ `postgresql|mssql|duckdb|snowflake-connector-python`.
  - `TaskApiClient(settings: DaemonSettings)`; `PollingService(client, task_handler: Callable, settings).poll_for_tasks(max_iterations: int | None = None)` — `max_iterations=1` confirmed.
  - `hutch_bunny.core.db.get_db_client() -> BaseDBClient` — **no args** (module is `core.db`, not `core.db_manager`; DuckDB via `DuckDBClient`).
  - `execute_query(query_dict, results_modifier, db_client, settings=None, encode_result=True) -> RquestResult`; dispatches on `"analysis"`; `RquestResult.to_dict()`.
- **⚠ Import-time env ordering (critical):** importing `core.execute_query` / `core.upstream.task_handler` / `core.db` **constructs `Settings` at import**, which raises unless `DATASOURCE_*` + `TASK_API_*` + `COLLECTION_ID` are already set (and a non-HTTPS `TASK_API_BASE_URL` requires `TASK_API_ENFORCE_HTTPS=false`). → `bunny_runner.py` **must set all env before importing Bunny modules** (do not import Bunny at module top level before env is populated). This validates the Option A parent-sets-env ordering.
- **Still to pin at implementation** (parent side, 3.12): the DBDao `CacheDBCredentialsType` attribute holding the DuckDB file path; and `RquestResult.to_dict()` exact `count`/distribution-row keys (record in `cohort_discovery_plugin/BUNNY_NOTES.md`).

### Two implementation prerequisites (from the gate)
- **Dedicated branch:** implementation must start on a fresh branch (e.g. `Zhimin-arya/cohort-discovery-bunny`), NOT the current unrelated `Zhimin-arya/data-2745_fix_update_metadata`.
- **Committed `pixi.lock`:** runtime provisioning is `--frozen`; a lockfile covering both envs must be generated (resolvability proven by the gate) and committed (Task 9).

---

## Task 1: Compatibility spike — 3.13 Bunny env + parent→child boundary (GATE)

**Files:**
- Create: `plugins/flows/cohort_discovery/pyproject.toml` (minimal, envs only for now)
- Create: `plugins/flows/cohort_discovery/cohort_discovery_plugin/BUNNY_NOTES.md`

- [ ] **Step 1: Create a minimal pyproject with default (3.12) + `bunny` (3.13) envs**

```toml
# plugins/flows/cohort_discovery/pyproject.toml
[project]
name = "cohort-discovery-flow"
version = "0.0.1"
requires-python = "==3.12.*"
dependencies = ["prefect"]

[tool.pixi.workspace]
channels = ["conda-forge"]
platforms = ["linux-64"]

[tool.pixi.dependencies]
python = "3.12.*"

[tool.pixi.feature.bunny.dependencies]
python = "3.13.*"
pytest = "*"

# Bunny is a GIT dependency (not on PyPI). Pin to v1.7.0 (commit a4121dc…).
[tool.pixi.feature.bunny.pypi-dependencies]
hutch-bunny = { git = "https://github.com/Health-Informatics-UoN/hutch-bunny.git", rev = "a4121dc7a37660638763ed20b11d8882a7ab8edd" }

[tool.pixi.environments]
default = { solve-group = "default" }
bunny = { features = ["bunny"], no-default-feature = true }
```
> Gate-verified: this exact form resolves — `default` → Python 3.12.13, `bunny` → Python 3.13.14. `rev` (commit) is preferred over `tag` for a reproducible lock.

- [ ] **Step 2: Solve/install both envs**

Run: `cd plugins/flows/cohort_discovery && pixi install && pixi install -e bunny`
Expected: both envs resolve; `.pixi/envs/default` (3.12) and `.pixi/envs/bunny` (3.13) created. (Gate already proved this resolves; STOP and report only if it regresses.)

- [ ] **Step 3: Verify the child env imports Bunny and constructs its objects**

Run:
```
cd plugins/flows/cohort_discovery && pixi run -e bunny python -c "
from hutch_bunny.core.settings import DaemonSettings
from hutch_bunny.core.upstream.task_api_client import TaskApiClient
from hutch_bunny.core.upstream.polling_service import PollingService
from hutch_bunny.core.upstream.task_handler import handle_task
from hutch_bunny.core.db import get_db_client
from hutch_bunny.core.execute_query import execute_query
import inspect
print('handle_task', inspect.signature(handle_task))
print('get_db_client', inspect.signature(get_db_client))
print('execute_query', inspect.signature(execute_query))
print('poll_for_tasks', inspect.signature(PollingService.poll_for_tasks))
print('OK')
"
```
Expected: prints signatures and `OK`. If import paths differ from the header above, record the actual paths.

- [ ] **Step 4: Verify the parent (3.12) default env is 3.12**

Run: `cd plugins/flows/cohort_discovery && pixi run python -c "import sys; print(sys.version)"`
Expected: prints 3.12.x. (DBDao itself lives in the repo's staged `_shared_flow_utils`; it is exercised in Task 7 via mocks and at build time.)

- [ ] **Step 5: Verify the parent can launch the child**

Run: `cd plugins/flows/cohort_discovery && pixi run python -c "import subprocess; print(subprocess.run(['pixi','run','-e','bunny','python','-c','print(1)'],capture_output=True,text=True).stdout)"`
Expected: prints `1`.

- [ ] **Step 6: Record pinned symbols in BUNNY_NOTES.md**

Write `cohort_discovery_plugin/BUNNY_NOTES.md` capturing, from Step 3's output plus quick source reads: (a) does `handle_task` return the `RquestResult`? (b) exact `results_modifier` shape / builder Bunny uses from settings; (c) `get_db_client()` params; (d) `RquestResult.to_dict()` keys for count + distribution rows; (e) `CacheDBCredentialsType` DuckDB-path attribute. These are the authoritative references for Tasks 5–7.

- [ ] **Step 7: Commit**

```bash
git add plugins/flows/cohort_discovery/pyproject.toml plugins/flows/cohort_discovery/cohort_discovery_plugin/BUNNY_NOTES.md
git commit -m "chore(cohort_discovery): pin Bunny 3.13 env + integration notes (spike)"
```

> If any of Steps 2–5 fail, do not proceed — report the failure; the isolation approach must be revisited with the team.

---

## Task 2: Flow group scaffold + manifest

**Files:**
- Create: `plugins/flows/cohort_discovery/cohort_discovery_plugin/__init__.py`
- Create: `plugins/flows/cohort_discovery/package.json`

- [ ] **Step 1: Add the empty package marker**

Create `cohort_discovery_plugin/__init__.py` (empty).

- [ ] **Step 2: Write the `trex.flow` manifest**

```json
// plugins/flows/cohort_discovery/package.json
{
  "name": "@data2evidence/cohort-discovery-flow",
  "version": "0.0.1",
  "scripts": {
    "build": "docker build ../../.. -f ../../../services/alp-dataflow-gen-worker/Dockerfile -t d2e-dataflow-gen-worker:local --build-arg GITHUB_PAT=${GITHUB_PAT}",
    "prepack": "bash ../build/stage_package.sh",
    "postpack": "bash ../build/stage_package.sh clean"
  },
  "license": "Apache-2.0",
  "trex": {
    "flow": {
      "image": "ghcr.io/ohdsi/d2e/flow-cohort-discovery",
      "flows": [
        {
          "name": "cohort_discovery_plugin",
          "entrypoint": "flows.cohort_discovery_plugin.flow.cohort_discovery_plugin",
          "command": "/app/run-flow.sh cohort-discovery-flow",
          "type": "cohort_discovery",
          "parameter_openapi_schema": {
            "title": "Parameters",
            "type": "object",
            "properties": {
              "options": { "$ref": "#/definitions/CohortDiscoveryOptions", "position": 0, "title": "options" }
            },
            "required": ["options"],
            "definitions": {
              "CohortDiscoveryOptions": {
                "type": "object",
                "title": "CohortDiscoveryOptions",
                "properties": {
                  "datasetId": { "type": "string", "title": "Dataset Id" },
                  "databaseCode": { "type": "string", "title": "Database Code" },
                  "cacheId": { "anyOf": [{ "type": "string" }, { "type": "null" }], "default": null, "title": "Cache Id" },
                  "schemaName": { "type": "string", "title": "Schema Name" }
                },
                "required": ["datasetId", "databaseCode", "schemaName"]
              }
            }
          }
        }
      ]
    }
  },
  "files": ["flows", "_shared_flow_utils", "__init__.py", "pyproject.toml", "pixi.lock", "setup_assets.sh"]
}
```

- [ ] **Step 3: Verify the manifest is valid JSON**

Run: `python -c "import json; json.load(open('plugins/flows/cohort_discovery/package.json')); print('OK')"`
Expected: `OK`.

- [ ] **Step 4: Commit**

```bash
git add plugins/flows/cohort_discovery/cohort_discovery_plugin/__init__.py plugins/flows/cohort_discovery/package.json
git commit -m "feat(cohort_discovery): flow group scaffold + trex.flow manifest"
```

---

## Task 3: Shared-worker provisioning for the `bunny` env

**Files:**
- Modify: `services/alp-dataflow-gen-worker/provision-envs.sh` (the `ner` branch is the template)

- [ ] **Step 1: Add a `bunny` provisioning branch mirroring `ner`**

Find the existing block:
```bash
  if grep -qE '^ner *= \{' "$manifest"; then
    pixi install --frozen -e ner --manifest-path "$manifest" || return 1
```
Add immediately after its closing `fi`:
```bash
  # Cohort Discovery isolates Hutch Bunny in a Python 3.13 child env.
  if grep -qE '^bunny *= \{' "$manifest"; then
    pixi install --frozen -e bunny --manifest-path "$manifest" || return 1
  fi
```

- [ ] **Step 2: Shell syntax check**

Run: `bash -n services/alp-dataflow-gen-worker/provision-envs.sh && echo OK`
Expected: `OK`.

- [ ] **Step 3: Verify detection against the new manifest**

Run: `grep -qE '^bunny *= \{' plugins/flows/cohort_discovery/pyproject.toml && echo DETECTED`
Expected: `DETECTED`.

- [ ] **Step 4: Commit**

```bash
git add services/alp-dataflow-gen-worker/provision-envs.sh
git commit -m "feat(worker): provision cohort_discovery bunny (3.13) named pixi env"
```

---

## Task 4: Pydantic models — options, envelope, parent↔child contract

**Files:**
- Create: `plugins/flows/cohort_discovery/cohort_discovery_plugin/types.py`
- Test: `plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_types.py`

- [ ] **Step 1: Write the failing test**

```python
# tests/test_types.py
from cohort_discovery_plugin.types import (
    CohortDiscoveryOptions, ChildResult, ArtifactEnvelope,
)

def test_options_parse():
    o = CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm")
    assert o.cacheId is None

def test_child_result_roundtrip():
    payload = {"results": [{"analysis": None, "count": 42, "distributions": {}, "raw": {}}]}
    cr = ChildResult(**payload)
    assert cr.results[0].count == 42

def test_envelope_shape():
    env = ArtifactEnvelope(
        availability={"count": 42, "obfuscation": {"suppression": 10, "rounding": 10}},
        distributions={"DEMOGRAPHICS": []},
        metadata={"datasetId": "ds1", "cohortName": "c", "generatedAt": "t"},
    )
    assert env.availability["count"] == 42
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/flows/cohort_discovery && pixi run pytest cohort_discovery_plugin/tests/test_types.py -v`
Expected: FAIL (`ModuleNotFoundError: cohort_discovery_plugin.types`).

- [ ] **Step 3: Implement `types.py`**

```python
# cohort_discovery_plugin/types.py
from typing import Optional, Any
from pydantic import BaseModel

class CohortDiscoveryOptions(BaseModel):
    datasetId: str
    databaseCode: str
    cacheId: Optional[str] = None
    schemaName: str

class ChildTaskResult(BaseModel):
    # One resolved RQuest result, as emitted by the child (from RquestResult.to_dict()).
    analysis: Optional[str] = None      # None => availability; else distribution code
    count: Optional[int] = None
    distributions: dict[str, Any] = {}
    raw: dict[str, Any] = {}            # full to_dict() for traceability

class ChildResult(BaseModel):
    results: list[ChildTaskResult] = []
    error: Optional[str] = None

class ArtifactEnvelope(BaseModel):
    availability: dict[str, Any]
    distributions: dict[str, Any]
    metadata: dict[str, Any]
```
> Field names in `ChildTaskResult` (`count`, `distributions`) must match the `RquestResult.to_dict()` keys pinned in `BUNNY_NOTES.md` (Task 1). Adjust here if they differ.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugins/flows/cohort_discovery && pixi run pytest cohort_discovery_plugin/tests/test_types.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/cohort_discovery/cohort_discovery_plugin/types.py plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_types.py
git commit -m "feat(cohort_discovery): pydantic models for options, child contract, artifact"
```

---

## Task 5: `bunny_config.py` — DBDao credentials → Bunny env (parent, 3.12)

**Files:**
- Create: `plugins/flows/cohort_discovery/cohort_discovery_plugin/bunny_config.py`
- Test: `plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_bunny_config.py`

- [ ] **Step 1: Write the failing test (mock DBDao credentials)**

```python
# tests/test_bunny_config.py
from types import SimpleNamespace
from cohort_discovery_plugin.bunny_config import build_bunny_env

def _pg_creds():
    return SimpleNamespace(dialect="postgres", host="h", port=5432,
                           databaseName="omop", user="u",
                           password=SimpleNamespace(get_secret_value=lambda: "pw"))

def test_postgres_env_mapping():
    env = build_bunny_env(_pg_creds(), schema="cdm", collection_id="ds1",
                          base_env={"TASK_API_BASE_URL": "http://relay/link_connector_api"})
    assert env["DATASOURCE_DB_DRIVERNAME"] == "postgresql"
    assert env["DATASOURCE_DB_HOST"] == "h"
    assert env["DATASOURCE_DB_PORT"] == "5432"
    assert env["DATASOURCE_DB_DATABASE"] == "omop"
    assert env["DATASOURCE_DB_SCHEMA"] == "cdm"
    assert env["DATASOURCE_DB_USERNAME"] == "u"
    assert env["DATASOURCE_DB_PASSWORD"] == "pw"
    assert env["COLLECTION_ID"] == "ds1"

def test_duckdb_env_mapping():
    creds = SimpleNamespace(dialect="duckdb", duckdb_path="/data/ds1.duckdb")
    env = build_bunny_env(creds, schema="cdm", collection_id="ds1", base_env={})
    assert env["DATASOURCE_DB_DRIVERNAME"] == "duckdb"
    assert env["DATASOURCE_DUCKDB_PATH_TO_DB"] == "/data/ds1.duckdb"

def test_unsupported_dialect_hard_fails():
    creds = SimpleNamespace(dialect="hana")
    try:
        build_bunny_env(creds, schema="cdm", collection_id="ds1", base_env={})
        assert False, "expected ValueError"
    except ValueError:
        pass
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/flows/cohort_discovery && pixi run pytest cohort_discovery_plugin/tests/test_bunny_config.py -v`
Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Implement `bunny_config.py`**

```python
# cohort_discovery_plugin/bunny_config.py
from typing import Any

_PG_DIALECTS = {"postgres", "postgresql"}
_DUCKDB_DIALECTS = {"duckdb"}

def _secret(v: Any) -> str:
    return v.get_secret_value() if hasattr(v, "get_secret_value") else str(v)

def build_bunny_env(creds: Any, schema: str, collection_id: str, base_env: dict[str, str]) -> dict[str, str]:
    """Map DBDao credentials to Bunny DATASOURCE_* env. Hard-fail unsupported dialects."""
    env = dict(base_env)
    env["COLLECTION_ID"] = collection_id
    dialect = str(getattr(creds, "dialect", "")).lower()
    if dialect in _PG_DIALECTS:
        env["DATASOURCE_DB_DRIVERNAME"] = "postgresql"
        env["DATASOURCE_DB_HOST"] = str(creds.host)
        env["DATASOURCE_DB_PORT"] = str(creds.port)
        env["DATASOURCE_DB_DATABASE"] = str(creds.databaseName)
        env["DATASOURCE_DB_SCHEMA"] = schema
        env["DATASOURCE_DB_USERNAME"] = str(creds.user)
        env["DATASOURCE_DB_PASSWORD"] = _secret(creds.password)
    elif dialect in _DUCKDB_DIALECTS:
        env["DATASOURCE_DB_DRIVERNAME"] = "duckdb"
        # Attribute per BUNNY_NOTES.md / CacheDBCredentialsType (Task 1).
        env["DATASOURCE_DUCKDB_PATH_TO_DB"] = str(creds.duckdb_path)
    else:
        raise ValueError(f"Unsupported dialect for cohort_discovery: {dialect!r} (Postgres/DuckDB only)")
    return env
```
> `creds.duckdb_path` is a placeholder for the real `CacheDBCredentialsType` field pinned in Task 1; rename to the actual attribute.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugins/flows/cohort_discovery && pixi run pytest cohort_discovery_plugin/tests/test_bunny_config.py -v`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/cohort_discovery/cohort_discovery_plugin/bunny_config.py plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_bunny_config.py
git commit -m "feat(cohort_discovery): map DBDao creds to Bunny DATASOURCE_* env"
```

---

## Task 6: `bunny_runner.py` — child entrypoint (3.13 env)

**Files:**
- Create: `plugins/flows/cohort_discovery/cohort_discovery_plugin/bunny_runner.py`
- Test: `plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_bunny_runner.py`

The child reads config from env (already set by the parent), polls once, executes each task via `execute_query`, captures the `RquestResult`, submits it to Relay, and prints a `ChildResult` JSON to stdout.

- [ ] **Step 1: Write the failing test (mock Bunny modules)**

```python
# tests/test_bunny_runner.py  (run under the bunny env)
import json, sys, types

def _install_fakes(monkeypatch, captured):
    class RQ:
        def __init__(self, count): self._c = count
        def to_dict(self): return {"count": self._c, "distributions": {}}
    def execute_query(task, modifiers, db_client, settings=None, encode_result=True):
        return RQ(7)
    class Client:
        def __init__(self, settings=None): pass
        def send_results(self, result): captured.append(result)
    class Polling:
        def __init__(self, client, handler, settings): self.handler = handler
        def poll_for_tasks(self, max_iterations=None): self.handler({"uuid": "t1"})
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.settings",
        types.SimpleNamespace(DaemonSettings=lambda: types.SimpleNamespace(
            LOW_NUMBER_SUPPRESSION_THRESHOLD=10, ROUNDING_TARGET=10)))
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.db",
        types.SimpleNamespace(get_db_client=lambda: object()))
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.execute_query",
        types.SimpleNamespace(execute_query=execute_query))
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.upstream.task_api_client",
        types.SimpleNamespace(TaskApiClient=Client))
    monkeypatch.setitem(sys.modules, "hutch_bunny.core.upstream.polling_service",
        types.SimpleNamespace(PollingService=Polling))

def test_runner_emits_child_result(monkeypatch, capsys):
    captured = []
    _install_fakes(monkeypatch, captured)
    from cohort_discovery_plugin import bunny_runner
    bunny_runner.run()
    out = json.loads(capsys.readouterr().out.strip().splitlines()[-1])
    assert out["results"][0]["count"] == 7
    assert out["error"] is None
    assert len(captured) == 1  # send_results called
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/flows/cohort_discovery && pixi run -e bunny pytest cohort_discovery_plugin/tests/test_bunny_runner.py -v`
Expected: FAIL (`ModuleNotFoundError: cohort_discovery_plugin.bunny_runner`).

- [ ] **Step 3: Implement `bunny_runner.py`**

```python
# cohort_discovery_plugin/bunny_runner.py
"""Runs inside the isolated Bunny 3.13 pixi env. Config comes from env (set by parent)."""
import json, sys, traceback

def _build_results_modifiers(settings):
    # Shape per BUNNY_NOTES.md (Task 1). Default mirrors Bunny CLI modifiers.
    return [
        {"id": "Low Number Suppression", "threshold": int(settings.LOW_NUMBER_SUPPRESSION_THRESHOLD)},
        {"id": "Rounding", "nearest": int(settings.ROUNDING_TARGET)},
    ]

def run() -> None:
    from hutch_bunny.core.settings import DaemonSettings
    from hutch_bunny.core.db import get_db_client
    from hutch_bunny.core.execute_query import execute_query
    from hutch_bunny.core.upstream.task_api_client import TaskApiClient
    from hutch_bunny.core.upstream.polling_service import PollingService

    settings = DaemonSettings()
    db_client = get_db_client()
    client = TaskApiClient(settings=settings)
    modifiers = _build_results_modifiers(settings)
    collected: list[dict] = []

    def handler(task_data: dict) -> None:
        result = execute_query(task_data, modifiers, db_client, settings)  # RquestResult
        client.send_results(result)                                        # submit to Relay
        d = result.to_dict()
        collected.append({
            "analysis": task_data.get("analysis"),
            "count": d.get("count"),
            "distributions": d.get("distributions", {}),
            "raw": d,
        })

    try:
        PollingService(client, handler, settings).poll_for_tasks(max_iterations=1)
        print(json.dumps({"results": collected, "error": None}))
    except Exception as exc:  # hard-fail: emit error JSON + non-zero exit
        print(json.dumps({"results": collected, "error": f"{type(exc).__name__}: {exc}"}))
        traceback.print_exc(file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    run()
```
> Use the exact `results_modifier` shape and `RquestResult.to_dict()` keys from `BUNNY_NOTES.md`. If Task 1 finds `handle_task` returns the result, you may call `handle_task(task_data, db_client, settings, client)` and read its return instead of the inline `execute_query`+`send_results`; the inline form uses only verified symbols.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugins/flows/cohort_discovery && pixi run -e bunny pytest cohort_discovery_plugin/tests/test_bunny_runner.py -v`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/cohort_discovery/cohort_discovery_plugin/bunny_runner.py plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_bunny_runner.py
git commit -m "feat(cohort_discovery): Bunny child runner (poll once, execute, submit, emit JSON)"
```

---

## Task 7: `flow.py` — parent flow (3.12): DBDao → child → artifact

**Files:**
- Create: `plugins/flows/cohort_discovery/cohort_discovery_plugin/flow.py`
- Test: `plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_flow.py`

- [ ] **Step 1: Write the failing test (mock DBDao + subprocess, real Prefect harness)**

```python
# tests/test_flow.py
import json
from unittest.mock import patch, MagicMock
from prefect.testing.utilities import prefect_test_harness
from cohort_discovery_plugin.types import CohortDiscoveryOptions

def test_flow_builds_artifact_from_child_output():
    from cohort_discovery_plugin import flow as flowmod
    child_json = json.dumps({"results": [
        {"analysis": None, "count": 12, "distributions": {}, "raw": {"count": 12}},
        {"analysis": "DEMOGRAPHICS", "count": None, "distributions": {"DEMOGRAPHICS": [{"k": 1}]}, "raw": {}},
    ], "error": None})
    fake_creds = MagicMock(dialect="postgres", host="h", port=5432, databaseName="omop",
                           user="u", password=MagicMock(get_secret_value=lambda: "pw"))
    with prefect_test_harness():
        with patch.object(flowmod, "_resolve_credentials", return_value=(fake_creds, "cdm")), \
             patch.object(flowmod, "_run_child", return_value=child_json), \
             patch.object(flowmod, "create_markdown_artifact") as art:
            env = flowmod.cohort_discovery_plugin(
                CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm"))
    assert env.availability["count"] == 12
    assert env.distributions["DEMOGRAPHICS"] == [{"k": 1}]
    assert env.metadata["datasetId"] == "ds1"
    art.assert_called_once()

def test_flow_hard_fails_on_child_error():
    from cohort_discovery_plugin import flow as flowmod
    child_json = json.dumps({"results": [], "error": "ValueError: unsupported rule"})
    fake_creds = MagicMock(dialect="postgres", host="h", port=5432, databaseName="omop",
                           user="u", password=MagicMock(get_secret_value=lambda: "pw"))
    with prefect_test_harness():
        with patch.object(flowmod, "_resolve_credentials", return_value=(fake_creds, "cdm")), \
             patch.object(flowmod, "_run_child", return_value=child_json), \
             patch.object(flowmod, "create_markdown_artifact"):
            try:
                flowmod.cohort_discovery_plugin(
                    CohortDiscoveryOptions(datasetId="ds1", databaseCode="pg1", schemaName="cdm"))
                assert False, "expected RuntimeError"
            except RuntimeError:
                pass
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd plugins/flows/cohort_discovery && pixi run pytest cohort_discovery_plugin/tests/test_flow.py -v`
Expected: FAIL (`ModuleNotFoundError`).

- [ ] **Step 3: Implement `flow.py`**

```python
# cohort_discovery_plugin/flow.py
import os, json, subprocess
from datetime import datetime, timezone

from prefect import flow
from prefect.logging import get_run_logger
from prefect.artifacts import create_markdown_artifact

from _shared_flow_utils.dao.DBDao import DBDao
from .types import CohortDiscoveryOptions, ChildResult, ArtifactEnvelope
from .bunny_config import build_bunny_env

os.environ["plugin_name"] = "cohort_discovery_plugin"

def _resolve_credentials(options: CohortDiscoveryOptions):
    """Resolve dataset DB/cachedb credentials via DBDao (3.12 parent). Returns (creds, schema)."""
    dao = DBDao(database_code=options.databaseCode, cache_id=options.cacheId or options.databaseCode)
    return dao.tenant_configs, options.schemaName

def _run_child(env: dict[str, str]) -> str:
    """Invoke the Bunny child in its isolated 3.13 pixi env; return its stdout (last JSON line)."""
    proc = subprocess.run(
        ["pixi", "run", "--frozen", "-e", "bunny", "python", "-m", "cohort_discovery_plugin.bunny_runner"],
        env={**os.environ, **env}, capture_output=True, text=True,
    )
    if proc.returncode != 0 and not proc.stdout.strip():
        raise RuntimeError(f"Bunny child failed (exit {proc.returncode}): {proc.stderr[-2000:]}")
    return proc.stdout.strip().splitlines()[-1]

def _to_envelope(child: ChildResult, options: CohortDiscoveryOptions) -> ArtifactEnvelope:
    suppression = int(os.environ.get("LOW_NUMBER_SUPPRESSION_THRESHOLD", "10"))
    rounding = int(os.environ.get("ROUNDING_TARGET", "10"))
    availability = {"count": None, "obfuscation": {"suppression": suppression, "rounding": rounding}}
    distributions: dict = {}
    for r in child.results:
        if r.analysis is None:
            availability["count"] = r.count
        else:
            distributions.update(r.distributions or {})
    return ArtifactEnvelope(
        availability=availability,
        distributions=distributions,
        metadata={"datasetId": options.datasetId,
                  "cohortName": options.datasetId,
                  "generatedAt": datetime.now(timezone.utc).isoformat()},
    )

@flow(log_prints=True)
def cohort_discovery_plugin(options: CohortDiscoveryOptions) -> ArtifactEnvelope:
    logger = get_run_logger()
    logger.info(f"cohort_discovery start: dataset={options.datasetId}")

    creds, schema = _resolve_credentials(options)
    base_env = {k: os.environ[k] for k in (
        "TASK_API_BASE_URL", "TASK_API_USERNAME", "TASK_API_PASSWORD", "TASK_API_TYPE",
        "LOW_NUMBER_SUPPRESSION_THRESHOLD", "ROUNDING_TARGET",
    ) if k in os.environ}
    env = build_bunny_env(creds, schema=schema, collection_id=options.datasetId, base_env=base_env)  # hard-fails unsupported dialect

    child = ChildResult.model_validate_json(_run_child(env))
    if child.error:
        raise RuntimeError(f"cohort_discovery hard-fail: {child.error}")

    envelope = _to_envelope(child, options)
    create_markdown_artifact(
        key="cohort-discovery-result",
        markdown=f"```json\n{json.dumps(envelope.model_dump(), indent=2)}\n```",
        description=f"Cohort discovery result for dataset {options.datasetId}",
    )
    logger.info(f"cohort_discovery done: availability={envelope.availability['count']}")
    return envelope
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd plugins/flows/cohort_discovery && pixi run pytest cohort_discovery_plugin/tests/test_flow.py -v`
Expected: PASS (2 tests).

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/cohort_discovery/cohort_discovery_plugin/flow.py plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_flow.py
git commit -m "feat(cohort_discovery): parent flow — DBDao resolve, child invoke, artifact persist, hard-fail"
```

---

## Task 8: Integration test — mocked Relay + OMOP fixtures

**Files:**
- Create: `plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_integration.py`
- Create: `plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/README.md`

- [ ] **Step 1: Write the integration test (DuckDB cachedb; real child subprocess; stub relay via env)**

```python
# tests/test_integration.py
import os, json, subprocess, pathlib, pytest

BUNNY = ["pixi", "run", "--frozen", "-e", "bunny", "python", "-m", "cohort_discovery_plugin.bunny_runner"]

@pytest.mark.integration
def test_child_runs_against_duckdb():
    """Requires a DuckDB OMOP cachedb fixture (TEST_OMOP_DUCKDB) and a stub relay (TEST_RELAY_URL)
    returning one availability task and accepting POST results."""
    duckdb_file = pathlib.Path(os.environ.get("TEST_OMOP_DUCKDB", "")).resolve()
    if not duckdb_file.exists() or not os.environ.get("TEST_RELAY_URL"):
        pytest.skip("Set TEST_OMOP_DUCKDB and TEST_RELAY_URL to run this test")
    env = {
        **os.environ,
        "DATASOURCE_DB_DRIVERNAME": "duckdb",
        "DATASOURCE_DUCKDB_PATH_TO_DB": str(duckdb_file),
        "COLLECTION_ID": "ds-test",
        "TASK_API_BASE_URL": os.environ["TEST_RELAY_URL"],
        "TASK_API_USERNAME": "u", "TASK_API_PASSWORD": "p",
        "LOW_NUMBER_SUPPRESSION_THRESHOLD": "10", "ROUNDING_TARGET": "10",
    }
    proc = subprocess.run(BUNNY, cwd="plugins/flows/cohort_discovery", env=env, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr[-2000:]
    out = json.loads(proc.stdout.strip().splitlines()[-1])
    assert out["error"] is None
    assert out["results"], "expected at least one resolved task"
```

- [ ] **Step 2: Run (expect skip without fixtures, PASS with them)**

Run: `cd plugins/flows/cohort_discovery && pixi run pytest cohort_discovery_plugin/tests/test_integration.py -v -m integration`
Expected: SKIP without env; PASS with a DuckDB OMOP fixture + stub relay.

- [ ] **Step 3: Document the stub relay + fixture**

Write `tests/README.md`: minimal stub relay (tiny HTTP server returning one availability task on the poll endpoint and 200 on the results POST) and how to build a DuckDB OMOP cachedb fixture. Do not invent a real relay.

- [ ] **Step 4: Commit**

```bash
git add plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/test_integration.py plugins/flows/cohort_discovery/cohort_discovery_plugin/tests/README.md
git commit -m "test(cohort_discovery): integration test (DuckDB fixture + stub relay), gated by env"
```

---

## Task 9: Lockfile, manifest generation, deployment note, final suite

**Files:**
- Create/modify: `plugins/flows/cohort_discovery/pixi.lock` (generated)
- Create: `plugins/flows/cohort_discovery/setup_assets.sh` (parity; may be a no-op)
- Create: `plugins/flows/cohort_discovery/README.md`

- [ ] **Step 1: Freeze the lockfile**

Run: `cd plugins/flows/cohort_discovery && pixi install && pixi install -e bunny` (regenerates `pixi.lock` covering both envs).

- [ ] **Step 2: Generate/verify the manifest**

Run: `python plugins/flows/flowinit.py` (per repo convention) or confirm the hand-written manifest matches `parameter_openapi_schema` for `CohortDiscoveryOptions`. Verify JSON validity as in Task 2 Step 3.

- [ ] **Step 3: Add `setup_assets.sh` + deployment README**

Create `setup_assets.sh` (no-op if no assets). In `README.md`, document required deploy-time env: `TASK_API_BASE_URL` (incl. `/link_connector_api`), `TASK_API_USERNAME/PASSWORD/TYPE`, `COLLECTION_ID`(=datasetId), `LOW_NUMBER_SUPPRESSION_THRESHOLD`, `ROUNDING_TARGET`, `COHORT_DISCOVERY_ICD_MAIN_ENABLED` (default off), and the Prefect deployment **schedule** (cadence). Note: with `ICD_MAIN` off, `TASK_API_TYPE`/accepted results exclude ICD_MAIN distribution tasks; on, include them.

- [ ] **Step 4: Run the whole suite (both envs)**

Run:
```
cd plugins/flows/cohort_discovery && pixi run pytest cohort_discovery_plugin/tests -v && pixi run -e bunny pytest cohort_discovery_plugin/tests/test_bunny_runner.py -v
```
Expected: all PASS (integration test SKIP without fixtures).

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/cohort_discovery/pixi.lock plugins/flows/cohort_discovery/setup_assets.sh plugins/flows/cohort_discovery/README.md
git commit -m "chore(cohort_discovery): freeze envs, finalize manifest, deployment notes"
```

---

## Self-review (spec coverage)

- New flow group + manifest → Tasks 2, 9. Named 3.13 env isolation (gate-verified) → Task 1. Worker provisioning → Task 3. DBDao→Bunny mapping (Postgres + DuckDB, hard-fail unsupported) → Task 5. Reuse `TaskApiClient`/`PollingService`, `max_iterations=1`, Bunny own client, submit to Relay → Task 6. Parent resolves DBDao, invokes child, persists artifact, hard-fail → Task 7. Availability count + dataset-wide `DEMOGRAPHICS`/`GENERIC` (+`ICD_MAIN` toggle) in envelope → Tasks 4, 7, 9. Tests + compatibility validation → Tasks 1, 4–8.
- **Scope respected:** this plan is flow-only — **no `jobplugins` API and no Jobs-page UI tasks exist** (excluded from this iteration per the team's decided scope).
- **`ICD_MAIN` toggle:** enforced at deploy-time env (Task 9); in poller mode Relay decides which distribution tasks are sent, so the toggle governs accepted task types/results (`TASK_API_TYPE` ∈ `a|b`), not client-side generation.

## Open items requiring team/environment input (not assumptions)

1. **Remaining Bunny/DBDao pins** (most of Task 1 now resolved by the compat gate): still to pin at implementation — `RquestResult.to_dict()` keys for `count`/distribution rows, the exact `results_modifier` shape, and the DBDao `CacheDBCredentialsType` DuckDB-path attribute. Record in `cohort_discovery_plugin/BUNNY_NOTES.md`. (`get_db_client()` = no-args, and the import-time env ordering, are already confirmed — see the Compatibility gate section.)
2. **Integration fixtures** (Task 8): a DuckDB OMOP cachedb sample and a stub relay are needed to run the end-to-end test; live Relay is deferred to deployment.
3. **Child invocation at runtime:** confirm the shared worker image exposes `pixi run -e bunny` from the flow's staged manifest dir (the parent's `subprocess` cwd). If flows run from a staged copy, adjust `_run_child`'s cwd/`--manifest-path` accordingly.
