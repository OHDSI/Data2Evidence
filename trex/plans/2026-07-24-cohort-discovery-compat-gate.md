# Cohort Discovery — Compatibility / Runtime Gate Report

- **Date:** 2026-07-24
- **Verdict:** ✅ **PASS (empirically verified).** An isolated named Pixi env can run Hutch Bunny on Python 3.13 while the parent flow env stays on Python 3.12; both build and coexist. No application/product source was modified — all work was in a scratch dir (`/tmp/bunny-gate`).
- **Gate rule respected:** no product implementation performed; this is verification + report only.

---

## 1. Workspace & branch

- **Workspace:** `/tmp/devx-workspaces/00000000-0000-0000-0000-000000000001/0f556950-f1a8-47fe-84e2-c8b4ed0e3caf`
- **Branch:** `Zhimin-arya/data-2745_fix_update_metadata` @ `6418ba5f`
- **Status:** dirty with **unrelated** changes (`M package.json`, `M package-lock.json`; untracked `.claude/`, `.devx/`, `TREX.md`, `trex/`, etc.).
- ⚠️ **Blocker for implementation (not for this gate):** this is an unrelated feature branch. Cohort Discovery implementation must start on a **dedicated branch** (e.g. `Zhimin-arya/cohort-discovery-bunny`), not here.

## 2. Bunny version → exact commit

`git ls-remote --tags https://github.com/Health-Informatics-UoN/hutch-bunny.git 'v1.7.0*'`
- `v1.7.0` (annotated tag): `39305f807c1b042bc927566f3c646ac02d8b9de3`
- **Peeled commit `v1.7.0^{}` (the code): `a4121dc7a37660638763ed20b11d8882a7ab8edd`** ← pin to this.

## 3. Pixi availability & repo-supported provisioning

- **On host:** no `pixi` on PATH; host Python is **3.13.5 only** (no 3.12).
- **Repo-supported provisioning:** the dataflow worker image installs pixi — `services/alp-dataflow-gen-worker/Dockerfile` `ARG PIXI_VERSION=0.72.2`, downloaded from `github.com/prefix-dev/pixi/releases/.../pixi-x86_64-unknown-linux-musl`. `provision-envs.sh` is **lockfile-only** (`pixi install --frozen`); named envs are installed with `pixi install --frozen -e <name>` (the `ner` precedent, lines ~37-38). `git` is installed in the image specifically so pixi/uv can fetch **git** dependencies during provisioning.
- **Gate action:** downloaded pixi **0.72.2** (exact repo version) to `/tmp/bunny-gate/bin/pixi` — `pixi --version` → `pixi 0.72.2`. No PATH/product mutation.

### Network (sandbox)
- pixi binary download: **200** (76 MB, full).
- PyPI (`/simple/numpy/`): **200**. PyPI (`/simple/hutch-bunny/`): **404** → **Bunny is not published to PyPI**; it is a **git** dependency (matches the brief's `hutch-bunny.git@v1.7.0`).
- conda-forge repodata: reachable (**200**; large file, needs a longer timeout).

## 4. Empirical feasibility test (scratch `/tmp/bunny-gate`)

Scratch `pyproject.toml` — default (3.12) + isolated `bunny` (3.13) with **git-sourced** Bunny:

```toml
[tool.pixi.dependencies]
python = "3.12.*"
[tool.pixi.feature.bunny.dependencies]
python = "3.13.*"
[tool.pixi.feature.bunny.pypi-dependencies]
hutch-bunny = { git = "https://github.com/Health-Informatics-UoN/hutch-bunny.git", tag = "v1.7.0" }
[tool.pixi.environments]
default = { solve-group = "default" }
bunny   = { features = ["bunny"], no-default-feature = true }
```

Commands + results (both exit **0**):
- `pixi install -e bunny` → built; `pixi run -e bunny python --version` → **Python 3.13.14**
- `pixi install -e default` → built; `pixi run -e default python --version` → **Python 3.12.13**
- **Both environments coexist** (separate `solve-group`s; `bunny` is `no-default-feature`), exactly the `data_transformation` `ner` pattern. The 3.13 Bunny stack and the 3.12 parent stack **do not co-resolve**.
- Bunny imports on 3.13: `import hutch_bunny` → OK (`SMOKE-OK`).

## 5. Verified Bunny v1.7.0 API surface (introspected in the built 3.13 env)

- `hutch_bunny.core.settings.DaemonSettings(...)` — pydantic-settings. **Required (no default): `DATASOURCE_DB_SCHEMA`, `TASK_API_BASE_URL`, `TASK_API_USERNAME`, `TASK_API_PASSWORD`, `COLLECTION_ID`.**
  - `DATASOURCE_DB_DRIVERNAME` pattern `^(postgresql|mssql|duckdb|snowflake-connector-python)$` (default `postgresql`); DuckDB via `DATASOURCE_DUCKDB_PATH_TO_DB`.
  - `TASK_API_TYPE: Optional[Literal['a','b']]` — **only a=availability, b=distribution** (no `c`).
  - `TASK_API_ENFORCE_HTTPS: bool = True`, `LOW_NUMBER_SUPPRESSION_THRESHOLD=10`, `ROUNDING_TARGET=10`, `POLLING_INTERVAL/INITIAL_BACKOFF/MAX_BACKOFF`.
- `hutch_bunny.core.upstream.task_api_client.TaskApiClient(settings: DaemonSettings)` ✅
- `hutch_bunny.core.upstream.polling_service.PollingService(client, task_handler: Callable, settings)` and **`poll_for_tasks(self, max_iterations: int | None = None)`** ✅ — `max_iterations=1` confirmed.
- `hutch_bunny.core.db.get_db_client() -> BaseDBClient` ✅ (module is `core.db`, **not** `core.db_manager`); clients include `DuckDBClient`, `SyncDBClient`, `Snowflake/Trino/AzureManagedIdentity`.
- `hutch_bunny.core.upstream.task_handler.handle_task` and `hutch_bunny.core.execute_query.execute_query` — modules **exist** (import only failed under introspection because constructing `Settings` at import time rejected a non-HTTPS `TASK_API_BASE_URL`; see below).

## 6. Findings that correct/refine the implementation plan

1. **Bunny is a git dependency, not PyPI.** The plan's `[tool.pixi.feature.bunny.pypi-dependencies] hutch-bunny = "*"` must become a **git source pinned to `tag = "v1.7.0"`** (or `rev = "a4121dc7a37660638763ed20b11d8882a7ab8edd"`). Verified working above.
2. **Bunny `Settings` validate env at import time.** Importing `core.execute_query` / `core.upstream.task_handler` / `core.db` constructs `Settings`, which **fails unless `DATASOURCE_*` + `TASK_API_*` + `COLLECTION_ID` are already set.** → confirms the Option A ordering is mandatory: the **parent must set all env before the child imports Bunny**. The `bunny_runner` must not import Bunny at module top-level before env is in place.
3. **`TASK_API_ENFORCE_HTTPS=true` by default** → a non-HTTPS relay URL raises a validation error. For an internal/http relay, the parent must pass `TASK_API_ENFORCE_HTTPS=false`.
4. **`DATASOURCE_DB_SCHEMA` is required even for DuckDB** (has no default). Parent must always set it.
5. **`TASK_API_TYPE` domain is `a|b` only** in v1.7.0 — update any "a/b/c" reference.
6. **DB client factory is `hutch_bunny.core.db.get_db_client()` (no args)** — plan's `_bunny_api.build_db_client` should simply call it (drop the `SyncDBManager` guess).

## 7. Residual items before/at implementation (not gate blockers)

- **`pixi.lock` generation:** runtime provisioning is `--frozen`; a committed lockfile covering both envs must be generated by a resolve step (network-enabled env or the worker image build). The scratch build proves resolvability; the committed lock is an implementation step.
- **Dedicated branch** (see §1).
- **Bunny→DBDao attribute mapping** (`CacheDBCredentialsType` DuckDB path field) still to be pinned from `_shared_flow_utils` at implementation time (parent side, 3.12).

## 8. Reproduction commands

```bash
# commit for the pin
git ls-remote --tags https://github.com/Health-Informatics-UoN/hutch-bunny.git 'v1.7.0*'
# pixi (exact repo version), scratch only
curl -fsSL https://github.com/prefix-dev/pixi/releases/download/v0.72.2/pixi-x86_64-unknown-linux-musl -o /tmp/bunny-gate/bin/pixi && chmod +x /tmp/bunny-gate/bin/pixi
# build both envs from the scratch pyproject (see §4)
cd /tmp/bunny-gate && ./bin/pixi install -e bunny && ./bin/pixi install -e default
./bin/pixi run -e bunny   python --version   # -> 3.13.14
./bin/pixi run -e default python --version   # -> 3.12.13
```

**Conclusion:** the isolated-Pixi-env approach is **empirically viable**; proceeding past the gate to implementation is unblocked once a dedicated branch exists. Plan corrections in §6 should be applied to `2026-07-24-cohort-discovery-bunny.md` before Tasks 1/5/6 are executed.
