# Pixi Process-Worker Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **STATUS: AWAITING REVIEW — do not execute until the plan is approved.**
> Revision 3: plugin delivery is part of the Prefect flow deployment itself — trex core uploads the plugin tarball to **trex's integrated Supabase storage (`@trex/storage`)** and attaches the artifact reference to every deployment; the worker provisions envs from those artifacts. Spans two repos (d2e + `../trex`).

**Goal:** Replace the seven per-flow-group Docker images with a single generic worker image running a Prefect **process** work pool, where each flow plugin ships its own lockfile-pinned pixi environment, delivered and provisioned **through the Prefect deployment record** — installing/updating a plugin never requires an image rebuild, and compose and k8s use one identical mechanism.

**Architecture:** The flow plugin npm package (which trex installs via tpm and registers via `core/server/plugin/flow.ts`) carries flow source + `pyproject.toml` + `pixi.lock` (+ `renv.lock` for R groups). At registration, trex core uploads the plugin tarball to its integrated `@trex/storage` (Supabase Storage served at `/storage-api`) and sets `job_variables.plugin_artifact = {path, sha256, name, version}` on every deployment it creates. On the worker, the launcher `run-flow.sh` (exec'd by the process worker *before* the Prefect engine starts) resolves its flow run → deployment → `plugin_artifact`, fetches the tarball from trex storage, verifies the shasum, extracts to **node-local disk**, provisions the env (`pixi install --frozen` + plugin `setup-*` tasks; marker-file dedup), then execs `prefect flow-run execute`. A provisioner loop pre-warms by listing deployments from the Prefect API so scheduled runs never pay first-fetch latency. The worker image pre-bakes envs for release-bundled plugins (keyed by the same sha markers) as a warm cache.

**Why this delivery mode (settles the earlier volume-vs-pull debate):** the deployment record couples artifact version to deployment atomically (a plugin update re-registers deployments pointing at the new tarball — no list reconciliation); no shared plugins volume anywhere (k8s needs no RWX; envs live on node-local disk, avoiding network-filesystem small-file pain); Prefect pull steps can't do this (they run inside the already-spawned subprocess, after the env must exist — the launcher runs before the engine, which is why it can); and trex's own storage keeps the mechanism platform-native with no external registry credentials on workers.

**Why pixi (and not uv):** a runtime-installed plugin must declare *everything* it needs — not just Python packages but R, a specific Java, nodejs, compilers, system libs. With uv, any non-Python dep forces a base-image change, re-coupling plugins to the image. pixi manifests carry conda-forge platform deps per plugin, provisionable into a running container. R *packages* (OHDSI + d2e forks, absent from conda-forge) remain renv-managed inside the pixi env (see A3).

**Tech Stack:** pixi (conda-forge + embedded uv), Prefect 3.x process worker, pyproject.toml manifests extended with `[tool.pixi.*]`, renv (retained for R packages), `@trex/storage` (embedded Supabase Storage), Docker/compose, Helm, GitHub Actions.

## Global Constraints

- Prefect server/worker: `prefecthq/prefect:3.6.10-python3.12`; **every flow env pins `prefect==3.6.10`** (bumped from today's 3.0.3 so engine and server match; keep each group's extras, e.g. `[docker,shell]`, `[dask,docker,shell]`). If a companion pin conflicts at `pixi lock` time (e.g. `prefect-shell==0.3.1`), bump it to the nearest compatible release and record it in the group's commit message.
- **Every group additionally pins** (found in Phase 0): `importlib-metadata==8.7.0` (prefect 3.6.x imports the backport in `workers/base.py` without declaring it; `opentelemetry-api>=1.43` no longer provides it transitively) and `psycopg2-binary==2.9.9` instead of 2.9.6 (first release with cp312 wheels; 2.9.6 compiles from source, which runtime-provisioned envs must never do). Per-group check after locking: `grep 'pypi: https.*\.tar\.gz' pixi.lock` must be empty (no sdists — binary-only envs).
- Python `==3.12.*` in every flow env; R `4.4.3` in R groups; Java 17 everywhere except hades (Java 11); duckdb `1.4.0`.
- Engine entrypoint: `prefect flow-run execute` (what all existing commands and CI use; also the 3.6.10 process worker's default).
- Process workers exec the command without a shell: commands must be plain argv (a `#!` script as argv[0] is fine; `bash -c '...'` is not).
- `pixi.lock` committed for every group and **shipped in the plugin tarball**; provisioning uses `--frozen` (no resolution); CI enforces lock freshness with `pixi lock --check`.
- Do not change flow/task logic. Do not change `parameter_openapi_schema` generation.
- Pixi version pinned via `ARG PIXI_VERSION` (use latest stable at implementation time; `0.49.0` is the placeholder — bump it; prefer `[tool.pixi.workspace]`, older pixi calls it `[tool.pixi.project]`). The same pin is used in CI lock checks, the worker image, and docs.
- Flow manifests live at `plugins/flows/<group>/pyproject.toml` (already exist for all 7 groups, uv-managed). We extend them in place; `uv.lock` files are deleted at cutover (Phase 4).
- npm tarballs have no `files` allowlist / `.npmignore` — everything in the staged package dir ships; a `prepack` step produces the self-contained layout (A7).

---

## Part A — Findings and decisions that shape the plan

### A1. trex-core involvement — VERIFIED against source (`../trex`), now includes in-scope trex changes

How it works today (verified):

- **Registration** (`core/server/plugin/flow.ts`): pool-type agnostic — waits for the pool by **name** (`GET /work_pools/{name}`), creates flow + deployment via REST, forwards `f.command` into `job_variables` when the manifest defines one (`flow.ts:223-225`). Always sends four docker-flavored job variables: `image`, `image_pull_policy`, `volumes`, `networks` (`flow.ts:208-213`) — the process-pool template accepts-and-ignores all four.
- **Install** (`plugins/tpm`): `trex_plugin_install` downloads the npm tarball, verifies the shasum, strips the `package/` prefix, and unpacks the full contents into `PLUGINS_PATH/@scope/<short-name>/`. **The verified `.tgz` itself is not retained** (unpacked from memory) — a small tpm change adds retention.
- **Discovery** (`core/server/plugin/plugin.ts`): scans `PLUGINS_DEV_PATH` + `PLUGINS_PATH` at boot; activation of a newly installed plugin requires a trex restart (`pendingRestart`). d2e-compat mirrors the registry into `trex.plugins` (jobplugins unaffected).
- **Storage** (`plugins/storage`, `@trex/storage`): Supabase Storage embedded as a trex function plugin (file or S3 backend, Postgres `storage` schema, JWT auth via `PGRST_JWT_SECRET`/`SERVICE_KEY`). **Shipped and enabled in the trex image** (`trex/Dockerfile:232` copies it into `plugins-dev`; verified live in a running trex at `/plugins/trex/storage-api/*` — 401 behind auth, and the copy commit `c1eb1d9f` is an ancestor of the trexsql sha d2e pins). Still labeled "feasibility test" with `FILE_STORAGE_BACKEND_PATH=/tmp/storage` (ephemeral) — Phase T.2 is production configuration, not bundling.

**In-scope trex-core changes (decision: delivery is part of the flow deployment — Phase T, repo `../trex`):**

1. **tpm**: retain the verified tarball at `<PLUGINS_PATH>/.tarballs/<name>-<version>.tgz` (+ recorded sha256) alongside extraction.
2. **flow.ts**: at flow-plugin registration, idempotently upload the retained tarball to `@trex/storage` (`flow-plugins/<name>/<version>.tgz`; skip if object exists with matching sha) and add `plugin_artifact: { path, sha256, name, version }` to `job_variables` of every deployment it creates. Registration must not fail hard if storage is unavailable — log + register without the ref (worker falls back to its baked cache).
3. **`@trex/storage`**: production configuration (it already ships enabled — A1): persistent `FILE_STORAGE_BACKEND_PATH` (trex data volume or S3 backend — the `/tmp/storage` default loses artifacts on restart), auto-provision the `flow-plugins` bucket, and a service-auth path for machine callers — the route sits behind `authContext`+`pluginAuthz` (trex HS256 session), so flow.ts (in-process) and the worker (service key / `PGRST_JWT_SECRET`-signed JWT) need a defined non-interactive auth story; plus a hardening pass on the "feasibility test" label.
4. Bundled plugins (extracted at image build, no install event): the trex image retains their `.tgz` files at the same `.tarballs/` location so flow.ts's upload path treats bundled and installed plugins identically.

**Consequence for rollout:** `PREFECT_POOL` is global to trex — per-flow incremental *cutover* is impossible. Verify each group via manually-registered pilot deployments in a parallel `process-pool` (the worker side needs no trex changes to be proven — Phase 0 stubs the artifact by hand), then flip the whole stack via env vars (instant rollback by flipping back).

### A2. Dependency inventory and grouping decision

Keep the existing **7 groups = 7 pixi projects** (one env per group; each group is one plugin package, the unit of install).

| Group | conda deps (`[tool.pixi.dependencies]`) | pypi deps (existing `[project.dependencies]`) | Outside pixi (assets / renv) |
|---|---|---|---|
| base (10 flows) | python 3.12, r-base 4.4.3, rpy2, openjdk 17, compilers, make, pkg-config | current list (prefect → 3.6.10, ibis 10, duckdb 1.4.0, shinylive, bigquery, …) minus rpy2 | renv.lock (95 pkgs: Achilles, DQD, d2e forks of DatabaseConnector/SqlRender); duckdb extensions (postgres_scanner, fts); postgres JDBC jar |
| data_management (1) | python 3.12, openjdk 17 | current list | Liquibase 4.5.0 tarball via `setup-assets` (not on conda-forge) |
| i2b2 (1) | python 3.12, openjdk 17, ant (fallback: `setup-assets`) | current list | i2b2-data v1.8.1.0001 tarball via `setup-assets` |
| loyalty_score (1) | python 3.12 | current list (scikit-learn 1.5.0, …) | — (pilot group) |
| search_embedding (1) | python 3.12 | current list (torch 2.6.0, transformers — pypi for parity; cpu-only torch is a later optimization) | duckdb extensions (+vss) via `setup-assets` |
| hades (2) | python 3.12, r-base 4.4.3, rpy2, openjdk 11, compilers, make, pkg-config | current list | renv.lock (280 pkgs: full HADES); `JAVA_TOOL_OPTIONS=-Xms1g -Xmx4g` via pixi activation env; GITHUB_PAT for GitHub installs |
| data_transformation (9) | python 3.12, r-base 4.4.3, rpy2, openjdk 17, nodejs, compilers, make, pkg-config (+xvfb if conda-forge has it — A6) | current list (ibis 11, dask extra, pydicom, …) | renv.lock (171 pkgs incl. ARTEMIS); WhiteRabbit dist; NLP CUI zip; fhir-transform npm (`setup-assets`); **NER — A4**. .NET SDK 6 dropped as unused (A6) |

Universal core shared by all 7 (dedupes via pixi cache hardlinks): httpx 0.27.2, ibis-framework[duckdb,postgres], pandas 2.2.2, prefect==3.6.10, **psycopg2-binary 2.9.6 → 2.9.9 in every group** (2.9.6 has no cp312 wheels — today's image builds silently compile it from source with gcc/libpq-dev; runtime-provisioned envs must not compile, and 2.9.9 is the first release with cp312 manylinux wheels — found at Task 0.2), pydantic 2.10.6, pyjwt 2.12.0, sqlalchemy 2.0.38.

**Principle:** per-plugin non-Python needs (Java version, node, ant, R itself) belong in the plugin's conda deps; assets ship in the tarball or are fetched by its `setup-assets` task with pinned URLs + checksums. The worker image carries only what conda-forge cannot provide.

### A3. R strategy — hybrid pixi + renv (do not attempt full conda R)

OHDSI R packages (Achilles, DQD, HADES, Strategus, ARTEMIS) and the d2e GitHub forks are **not on conda-forge**, and pixi has no CRAN/GitHub-R backend. Decision: pixi provides `r-base`, `rpy2`, `openjdk`, compilers per plugin; **renv.lock stays authoritative for R packages** (it already pins GitHub remotes by commit SHA), restored by the plugin's `setup-r` task into the pixi env's R library (`$PREFIX/lib/R/library`). R packages compile from source against the conda toolchain (Posit binaries target apt distros — do not rely on them).

Consequences: bundled R groups pre-warm at image build (compile cost in CI); a runtime-installed/updated R plugin pays the compile on each worker node at provisioning time (hades-scale: potentially >1h — measured at Task 2.2; future mitigation: prebuilt conda channel via rattler-build, see Follow-ups). System libs R packages need must come from conda-forge in the manifest (surfaced by the Phase 2 spike), not apt.

### A4. data_transformation NER layer — highest-risk env

Installs with `pip<24`, `--no-deps` model tarballs, git SHAs, conflicting pins ("cannot be pinned in uv.lock"). pixi's uv solver has no per-package `--no-deps`; the closure may not lock. Attempt a dedicated `ner` pixi environment (own solve-group, relaxed pins, git/url pypi deps). If it does not lock (Phase 3 spike), `ner_extract_plugin` **remains on Docker** (residual `docker-pool` worker + existing `flow-data-transformation` image), recorded in §Not-migrated.

### A5. HANA drivers — pixi `hana` environment, provisioned at runtime, never shipped

`sqlalchemy-hana`/`hdbcli` (SAP-licensed) are locked in `pixi.lock` as a pixi feature `hana` (groups base, data_management, search_embedding) but **never installed at image build or shipped in artifacts**. When `INSTALL_SQLALCHEMY_HANA=true`, provisioning also runs `pixi install --frozen -e hana`, and the worker entrypoint downloads the ngdbc JDBC jar once to a shared drivers dir. `run-flow.sh` picks `-e hana` vs default via `INSTALL_SQLALCHEMY_HANA`. Same legal posture as today's runtime `uv pip install`.

### A6. What stays in the worker image (and accepted consequences)

Worker image contents: pixi binary, the worker's own prefect 3.6.10 pixi env, launcher + provisioner scripts, the **baked warm cache** for release-bundled plugins (A7), and **xvfb via apt** — checked (2026-07-12): conda-forge has no X server package (only `pytest-xvfb`, a wrapper), so this one apt package remains; xvfb is needed only by `white_rabbit_plugin` (Java AWT headless display), and runtime installs of data_transformation therefore require a worker image that carries it (documented caveat). **.NET SDK 6 is NOT carried over**: added with the dataflow-UI FileNode (commit `954103456`) whose file-processing was removed before merge; nothing in the repo references dotnet (verified). Confirm with the FileNode author, then drop.

- **Per-run memory limits are lost** (were Docker-container settings). Mitigation: worker-level limits + Prefect work-pool concurrency limit. Flag to ops.
- Flow runs share the worker's filesystem/network identity. The docker.sock mount disappears (a security improvement).
- The `trex` volume mount on the worker remains **for duckdb data only** (`/app/duckdb_data` as flows expect); plugins no longer travel by volume.
- Flows imported at runtime via portal ("add flow from git/file") get the template's default command → base group env (mirrors today's k8s default of the `flow-base` image).
- Cold-start honesty: a run triggered before the provisioner has warmed a freshly-updated plugin provisions inline in the launcher — the run succeeds but pays fetch+install (long for R plugins). The deployment-listing pre-warm loop makes this rare.

### A7. Plugin delivery: deployment-attached artifacts (resolves the ordering problem)

Prefect pull steps are never involved. The artifact pointer rides on the deployment; content comes from `@trex/storage`; envs live on node-local disk. Identical on compose and k8s.

1. **Publish (trex, Phase T):** tpm retains the verified `.tgz`; flow.ts uploads it to `@trex/storage` (`flow-plugins/<name>/<version>.tgz`) and stamps `plugin_artifact {path, sha256, name, version}` into each deployment's job variables. Bundled plugins upload the same way at boot from their retained tarballs.
2. **Resolve (worker, every run):** `run-flow.sh <short-name>` reads `PREFECT__FLOW_RUN_ID` + `PREFECT_API_URL` from the subprocess env, fetches its deployment, and reads `plugin_artifact`. Cache hit (sha marker present under `/var/lib/d2e-flows/<name>/<sha>/`) → exec immediately. Miss → fetch from `TREX_STORAGE_URL` (auth: `TREX_STORAGE_SERVICE_KEY` env on the worker), verify sha256, extract, provision (`pixi install --frozen`, `-e hana` when gated, `setup-assets`/`setup-r` tasks), write marker, exec engine. No `plugin_artifact` (e.g. storage was down at registration) → fall back to the baked cache by short-name.
3. **Pre-warm (worker, background):** the provisioner loop lists deployments from the Prefect API (`POST /deployments/filter`) and provisions any `plugin_artifact` not yet cached — so scheduled runs after a plugin update don't pay the fetch. Multi-replica k8s: every replica runs the same loop against its local disk; no coordination needed (marker-file dedup per node; provisioning is idempotent).
4. **Baked warm cache (image build):** the worker image pre-provisions the release's bundled plugins into the same cache layout keyed by their tarball sha — so a fresh worker serves release plugins instantly and offline, and a runtime-updated plugin simply lands as a second sha next to it.

Tarball self-containment (**verified via npm pack dry-run**: today's tarball lacks the `flows/` prefix and `_shared_flow_utils`): a **`prepack` staging step** per group arranges `flows/<plugin>/`, vendors `_shared_flow_utils/`, and includes manifests + locks — the tarball is the single contract for tpm, storage, the worker cache, and the baked cache (built from the same staged output, byte-identical).

Worker layout:

```
/var/lib/d2e-flows/<short-name>/<sha256-prefix>/   # extracted artifact + .pixi env + .d2e-env-ready marker (node-local)
/opt/pixi/cache                                     # PIXI_CACHE_DIR (node-local; hardlink dedup across plugin envs)
/opt/worker/                                        # worker's own prefect 3.6.10 pixi env
/app/run-flow.sh  /app/provision-envs.sh  /entrypoint.sh
/app/inst/drivers/                                  # postgres jar; ngdbc lands here at runtime
/app/duckdb_data                                    # trex volume mount (data, not plugins)
```

**Compose interim note:** until Phase T lands, the pilot (Phase 0) proves the worker side by hand-uploading a tarball to storage (or any HTTP URL) and hand-patching a pilot deployment's `plugin_artifact` — the launcher/provisioner don't know the difference.

---

## Part B — Phased tasks

Phases 0–3 (d2e repo) are additive; Phase T (trex repo) can proceed in parallel after Phase 0; Phase 4 is the cutover (requires Phase T shipped in the trexsql image d2e consumes); Phase 5 is helm mechanics only.

**Branches:** `feat/pixi-process-worker` off `develop` (d2e); `feat/flow-plugin-artifacts` (trex).

---

### Phase 0 — Pilot: prove manifest + worker mechanism end-to-end with loyalty_score

#### Task 0.1: pixi manifest + lockfile for loyalty_score

**Files:**
- Modify: `plugins/flows/loyalty_score/pyproject.toml` (+ prepack staging script + package.json `scripts.prepack`)
- Create: `plugins/flows/loyalty_score/pixi.lock` (generated)

- [ ] **Step 1: Install pixi locally (pinned)**

```bash
curl -fsSL https://pixi.sh/install.sh | PIXI_VERSION=v0.49.0 bash   # bump to latest stable
pixi --version
```

- [ ] **Step 2: Bump prefect and extend pyproject.toml with pixi tables**

Change `"prefect[docker,shell]==3.0.3"` → `"prefect[docker,shell]==3.6.10"` (applies to every group later). Append:

```toml
[tool.pixi.workspace]
channels = ["conda-forge"]
platforms = ["linux-64"]

[tool.pixi.dependencies]
python = "3.12.*"

[tool.pixi.activation.env]
PYTHONPATH = "$PIXI_PROJECT_ROOT"
```

(`$PIXI_PROJECT_ROOT` interpolation must be verified — if unsupported, run-flow.sh exports `PYTHONPATH=$plugin_dir` instead; record which.)

- [ ] **Step 3: Generate the lockfile; verify pypi pickup**

```bash
cd plugins/flows/loyalty_score && pixi lock
grep -c "prefect" pixi.lock && grep -c "scikit-learn" pixi.lock   # both >0
```

If `pixi lock` did NOT consume `[project.dependencies]` (older pixi behavior), add `[tool.pixi.pypi-dependencies] loyalty-score = { path = ".", editable = false }` and re-lock. Record the variant — it applies to all 7 groups.

- [ ] **Step 4: Smoke the env**

```bash
pixi run --frozen --manifest-path plugins/flows/loyalty_score/pyproject.toml \
  python -c "import prefect, sklearn, sys; print(prefect.__version__, sys.prefix)"
```

Expected: `3.6.10 …/.pixi/envs/default`; second invocation instant (no solve/install output).

- [ ] **Step 5: prepack staging (verified needed — A7)**

Add `scripts.prepack` to the group package.json producing the self-contained layout, then verify:

```bash
cd plugins/flows/loyalty_score && npm pack --dry-run 2>&1 | tee /tmp/pack.txt
grep -E "pyproject.toml|pixi.lock|flows/loyalty_score_plugin/flow.py|_shared_flow_utils" /tmp/pack.txt  # all present
```

- [ ] **Step 6: Commit.**

#### Task 0.2: Generic worker image + launcher + provisioner

**Files:**
- Create: `services/alp-dataflow-gen-worker/Dockerfile.pixi` (becomes `Dockerfile` at cutover; old two-liner kept as `Dockerfile.docker-pool` for rollback)
- Create: `services/alp-dataflow-gen-worker/pyproject.toml` + `pixi.lock` (worker env: `prefect[docker]==3.6.10`)
- Create: `services/alp-dataflow-gen-worker/run-flow.sh`, `provision-envs.sh`, `entrypoint.sh`

**Interfaces:**
- Produces: `run-flow.sh <short-name>` — the universal per-deployment command; artifact cache `/var/lib/d2e-flows/<name>/<sha>/`; baked warm cache for bundled plugins.

- [ ] **Step 1: Worker's own pixi manifest** (`prefect[docker]==3.6.10`, conda python 3.12, conda-forge/linux-64) + lock.

- [ ] **Step 2: run-flow.sh** — resolution order:
  1. Query own deployment (`GET $PREFECT_API_URL/flow_runs/$PREFECT__FLOW_RUN_ID` → `deployment_id` → `GET /deployments/{id}`), read `job_variables.plugin_artifact`.
  2. Artifact present: ensure `/var/lib/d2e-flows/<name>/<sha>/` is provisioned (delegate to `provision-envs.sh --artifact <json>`; marker-file no-op when warm).
  3. Artifact absent: fall back to the baked cache dir for `<short-name>` (newest sha).
  4. `cd` into the plugin dir; pick env `hana` vs `default` by `INSTALL_SQLALCHEMY_HANA` + manifest feature presence; `exec pixi run --frozen -e $env --manifest-path ./pyproject.toml prefect flow-run execute`.

- [ ] **Step 3: provision-envs.sh** — modes: `--artifact <json>` (fetch from `TREX_STORAGE_URL` with `TREX_STORAGE_SERVICE_KEY`, sha256-verify, extract, `pixi install --frozen` [+ `-e hana` when gated], run `setup-assets`/`setup-r` tasks if defined in the manifest, write `.d2e-env-ready` marker) and `--watch` (poll `POST $PREFECT_API_URL/deployments/filter` every `PROVISION_INTERVAL` (30s), provision any uncached `plugin_artifact`).

- [ ] **Step 4: entrypoint.sh** — ngdbc download when `INSTALL_SQLALCHEMY_HANA=true` (retry/warn semantics as today's `install_hana_drivers.sh`), start `provision-envs.sh --watch &`, `exec "$@"`.

- [ ] **Step 5: Dockerfile.pixi** — ubuntu:24.04, pinned pixi binary, worker env, scripts, `plugins/flows/drivers` → `/app/inst/drivers/`; baked warm cache for the pilot: run the prepack staging for loyalty_score, place the staged tree at `/var/lib/d2e-flows/loyalty-score-flow/<sha>/`, `pixi install --locked` it, write the marker (same code path as runtime provisioning — one mechanism, two moments).

- [ ] **Step 6: Build and smoke**

```bash
docker build -f services/alp-dataflow-gen-worker/Dockerfile.pixi -t d2e-dataflow-gen-worker:pixi-local .
docker run --rm -w /var/lib/d2e-flows/loyalty-score-flow/<sha> d2e-dataflow-gen-worker:pixi-local \
  pixi run --frozen --manifest-path ./pyproject.toml \
  python -c "import flows.loyalty_score_plugin.flow, sys; print('OK', sys.prefix)"
```

- [ ] **Step 7: Commit.**

#### Task 0.3: Pilot pool + baked run + **artifact-delivered run** + trex-registration sanity check

**Files:**
- Modify: `docker-compose-local.yml` (pilot service `alp-dataflow-gen-worker-pixi`: process-pool create/start command, `PREFECT_API_URL`, `TREX_STORAGE_URL`/`TREX_STORAGE_SERVICE_KEY`, volume `trex:/app/duckdb_data`, network `data`)
- Create: `scripts/pixi-pilot/register_pilot_deployment.sh` (throwaway)

- [ ] **Step 1: Baked-cache verification.** Register a pilot deployment (`name: pixi_pilot`, entrypoint `flows.loyalty_score_plugin.flow.loyalty_score_plugin`, `work_pool_name: process-pool`, `job_variables: {command: "/app/run-flow.sh loyalty-score-flow"}` — no artifact ref). Trigger twice: both green, no solve/install output, run 2 PENDING→RUNNING <5s, log paths under `/var/lib/d2e-flows/loyalty-score-flow/`.

- [ ] **Step 2: THE POINT — artifact-delivered run without image rebuild.** Bump the plugin version, `npm pack`, hand-upload the tarball to any reachable HTTP endpoint (the d2e supabase-storage service works as a stand-in until `@trex/storage` lands — the launcher only sees a URL + sha), PATCH the pilot deployment's `job_variables.plugin_artifact = {path/url, sha256, name, version}`. Trigger: provisioner/launcher fetches, verifies, provisions on local disk (watch worker logs), run green; second run instant; the run's paths show the **new sha dir**, proving update-without-rebuild.

- [ ] **Step 3: trex-registration sanity check** (behavior verified in source — light check only): flip `PREFECT_POOL=process-pool`/`WORKPOOL_NAME` in `.env.local`, restart trex, confirm deployments register into the process pool with `command` intact and Prefect accepts the four ignored docker variables against the new template (Task 4.2's schema, seeded manually for the check). Unmigrated groups failing to *run* is expected. Revert. **[DEFERRED: needs a local d2e trex stack; the machine's running `alp` stack belongs to another session — do not disturb. Fold into the Phase 4 full-stack verification or run when the stack is free.]**

- [x] **Step 4: Commit.**

**Phase 0 RESULTS (2026-07-12, isolated pilot stack):** baked run executes flow code in the plugin's pixi env via the command override (fails at `database-credentials` block — expected without a seeded stack; full-green deferred to Phase 4's full-stack check); zero provisioning events on repeat runs; artifact loop proven end-to-end (version bump → tarball → deployment PATCH → watch-loop pre-warm → run from new sha dir, no rebuild/restart); scheduled→terminal ~16s. Findings folded into constraints: `importlib-metadata==8.7.0` needed in **every env incl. the worker's**; `psycopg2-binary` → 2.9.9; no-sdists lock check. Known wart: on CRASHED runs the worker tries to import the flow in its own env for `on_crashed` hooks and logs a `ModuleNotFoundError: flows` traceback — harmless (d2e flows define no such hooks), revisit if hooks are ever added.

---

### Phase T — trex repo: artifact publication as part of flow deployment (parallel from Phase 0)

**Repo:** `../trex`, branch `feat/flow-plugin-artifacts`. Deliverable: a trexsql image d2e can consume in Phase 4.

- [ ] **T.1 — tpm tarball retention:** after shasum verification, write the tarball to `<dest>/.tarballs/<name>-<version>.tgz` + `<...>.sha256` before unpacking (`plugins/tpm/src/npm/registry.rs`, `install_package`). Uninstall removes it. Unit tests alongside the existing install tests.
- [ ] **T.2 — `@trex/storage` production configuration** (already ships enabled at `/plugins/trex/storage-api/*` — A1): persistent storage path (`FILE_STORAGE_BACKEND_PATH` → trex data volume, not `/tmp/storage`) or S3 backend via env; auto-provision the `flow-plugins` bucket; define the machine-caller auth path (route is behind `authContext`+`pluginAuthz` — flow.ts uploads in-process, the worker downloads with a `PGRST_JWT_SECRET`/`SERVICE_KEY`-signed token); hardening pass on the feasibility-test code.
- [ ] **T.3 — flow.ts artifact stamping:** at registration, if a retained tarball exists for the plugin: HEAD the storage object; upload if missing/sha-mismatched; add `plugin_artifact {path, sha256, name, version}` to each deployment's `job_variables`. Storage unavailable → warn and register without the ref (worker falls back to baked cache). Config: storage base URL + service key from env; skip entirely when unset (backward compatible for non-d2e trex users).
- [ ] **T.4 — bundled tarball retention in image builds:** document/adjust so images that pre-extract plugins also keep the `.tgz` under `.tarballs/` (d2e's `Dockerfile.v2` plugin-artifacts step already has the files — keep instead of discard).
- [ ] **T.5 — integration test:** install a fixture flow plugin against a mock Prefect API; assert deployment body contains `plugin_artifact` and the object exists in storage with matching sha.

---

### Phase 1 — Pure-Python groups + HANA mechanism (d2e)

#### Task 1.1: manifests for i2b2, data_management, search_embedding

Same pattern as Task 0.1 (incl. prefect bump + prepack staging), plus per group:

- [ ] **i2b2** — conda `openjdk = "17.*"`, `ant = "*"` (verify `pixi search ant`; else `setup-assets`); `setup-assets` fetches i2b2-data v1.8.1.0001 (pinned URL + sha256).
- [ ] **data_management** — conda `openjdk = "17.*"`; `setup-assets` fetches Liquibase 4.5.0; hana feature:

```toml
[tool.pixi.feature.hana.pypi-dependencies]
sqlalchemy-hana = "==2.2.0"

[tool.pixi.environments]
default = { solve-group = "default" }
hana = { features = ["hana"], solve-group = "default" }
```

- [ ] **search_embedding** — conda python only; hana feature as above; `setup-assets` runs the duckdb-extensions download (postgres_scanner, fts, vss; script moves into the plugin).
- [ ] Lock + smoke each; extend the worker image's baked cache; pilot-verify `search_embedding_plugin` with `INSTALL_SQLALCHEMY_HANA=true` (provisioner installs hana env; flow run imports `hdbcli` — failed-connection against a dummy HANA dataset suffices).
- [ ] Commit per group.

---

### Phase 2 — R groups (d2e)

#### Task 2.1: SPIKE — R-in-pixi viability on the base group (timeboxed, 1 day)

- [ ] Conda deps: `r-base =4.4.3` (verify availability; nearest 4.4.x otherwise, record delta), `rpy2 >=3.5.13,<3.6`, `openjdk 17.*`, `compilers`, `make`, `pkg-config`, `libxml2`, `cairo`, `harfbuzz`, `fribidi`, `libgit2`, `libsodium`, `krb5`; remove rpy2 from pypi deps. Lock.
- [ ] `setup-r` task: `R CMD javareconf` → install renv from the Posit snapshot (2025-09-22) → `renv::restore(lockfile="renv.lock", library=.Library, prompt=FALSE)` (runs inside the env → conda R library).
- [ ] Acceptance: `Rscript -e 'library(Achilles); library(DatabaseConnector); library(rJava); .jinit()'` and an rpy2 round-trip (`SqlRender::render`) — both under `pixi run --frozen`.
- [x] **SPIKE PASSED (2026-07-12).** Full base renv.lock (95 pkgs incl. rJava, Achilles 1.7.2, DQD, d2e DatabaseConnector/SqlRender forks) restores into the conda env and the acceptance tests pass (`.jinit()` boots the JVM; rpy2 3.6.6 round-trips SqlRender). Validated recipe, applied to all three R groups: conda `r-base 4.4.3`, `rpy2 >=3.6,<3.7` (no 3.5.x conda build for r44 — bumped from pypi 3.5.13), `openjdk`, `compilers/make/pkg-config`, libs `libxml2(-devel), cairo, harfbuzz, fribidi, libgit2, libsodium, krb5, zlib, liblzma-devel, libarchive`, conda `packaging<25` (rpy2 chain vs ibis cap); activation env `LD_LIBRARY_PATH=$CONDA_PREFIX/lib/jvm/lib/server` (fixes rJava's "JNI programs run" check) + `RENV_CONFIG_PPM_ENABLED=FALSE` (source builds only). Host restore: ~46 min with a partially warm renv cache at nice-19/-j2; clean CI timing measured at Task 2.2.

#### Task 2.2: base group — productionize

- [x] **DONE (2026-07-12).** Baked cache gains base; in-image R acceptance passes; `dqd_plugin` and `create_cachedb_file_plugin` pilot runs execute flow code in the base env up to the platform-dependency boundary (`database-credentials` block — full-green needs the seeded stack, Phase 4). Clean base R restore inside the image build: **~15 min** (MAKEFLAGS=-j2). Additional finding: **fastapi pinned to 0.128.0 in every env** — 0.129+ router internals break prefect.server's `PrefectRouter` (ephemeral server / `prefect_test_harness`); 0.128.0 matches the prefecthq/prefect:3.6.10 pairing. Dockerfile restructured to per-group staging+provision layers so single-group changes don't re-run every renv restore. Demo-dataset green runs + artifact-path R timing: folded into Phase 4 full-stack verification. Ops note: hades/dt restores are validated on the host (nice-19/-j2) — the full 7-group image bake runs in CI (a 14GB shared dev machine can't host concurrent multi-GB builds; learned the hard way).

> **Execution note (2026-07-12):** per user direction, the hades and data_transformation renv restores are **validated in CI's image build** (identical `setup-r` execution per group layer) instead of on the shared 14GB dev machine. The R recipe itself is fully proven on base (Task 2.1/2.2); hades-specific risks addressed locally before deferring: renv cache cross-contamination (disabled per env) and the rJava/JAVA_TOOL_OPTIONS heap mismatch (rprofile_java.R via R_PROFILE_USER; `.jinit()` verified with a 4GB heap). First CI image build must be watched for hades/dt restore failures.

#### Task 2.3: hades group

- [ ] Same, with `openjdk = "11.*"`, activation env `JAVA_TOOL_OPTIONS = "-Xms1g -Xmx4g"` (verify via `.jinit()` heap check), `GITHUB_PAT` plumbed to `setup-r` (build-arg at image build; worker env for runtime provisioning — document), conda `+ glpk`, `sqlite`. Pilot-verify `cohort_generator_plugin`.

---

### Phase 3 — data_transformation (d2e)

#### Task 3.1: main env

- [ ] Manifest: conda `r-base 4.4.3`, `rpy2`, `openjdk 17.*`, `nodejs`, toolchain + Task 2.1 lib findings, xvfb if conda-forge has it (else worker-image apt, documented); pypi = current deps incl. all extras except NER; `ibis-framework==11.0.0` stays. `setup-r` (171 pkgs); `setup-assets`: WhiteRabbit dist, NLP CUI zip, `npm install` of `@synanetics/fhir-transform` via the env's nodejs. `RETICULATE_PYTHON` via activation env.
- [ ] Pilot-verify `data_load_plugin` + `white_rabbit_plugin` (exercises xvfb + WhiteRabbit + R).

#### Task 3.2: SPIKE — NER environment (timeboxed, 1 day)

- [x] **SPIKE RESULT (2026-07-12): the closure does NOT lock — proven unlockable by metadata.** `en_ner_bc5cdr_md 0.5.4` declares `spacy>=3.7.4,<3.8.0` while `en_core_med7_trf 1.1.0` declares `spacy>=3.8.14,<3.9.0` — mutually exclusive; no resolver can satisfy both. Today's image works only because `--no-deps` installs both models against spacy 3.8.2, violating both declarations.
- [x] **RESOLVED (2026-07-12): models-as-assets implemented.** The `ner` pixi environment is self-contained (`no-default-feature`: PyNER's chain needs numpy<2, which the old image's pip layer silently downgraded to; spacy resolves to 3.7.5 per scispacy's declared range — the old image force-installed 3.8.2 violating three declared ranges; now only med7's range stays violated, matching production runtime). Locked: prefect core + scispacy 0.5.5 + spacy 3.7.5 + spacy-transformers + torch-cpu 2.8.0 + nmslib(git) + PyNER 1.0.8 + en_core_web_sm. The two model packages install in `setup-assets` via pinned URL + sha256 with `pip --no-deps` into the ner env. `ner_extract_plugin` command: `/app/run-flow.sh data-transformation-flow ner` (launcher env override; packageutils preserves extending commands on regeneration). **No Docker carve-out needed — all 26 flows migrate.** Runtime NER validation (model load + a smoke extraction) rides the Phase 4 full-stack check.
- Original options record:
  1. **Models-as-assets:** lock the core NER env normally (spacy 3.8.2, scispacy, spacy-transformers, torch-cpu, nmslib git, PyNER git) in a `ner` feature, and install the two model packages in `setup-assets` via pinned URL + sha256 with `pip install --no-deps` into the env — deterministic parity with today's build-time behavior, moved to provisioning time. nmslib compiles from its git SHA at provisioning (compilers in the ner feature). Env is lockfile-managed except the two data-only model packages.
  2. **Docker carve-out:** `ner_extract_plugin` stays on a residual `docker-pool` + `flow-data-transformation` image (§Not-migrated).
  Follow-up either way: re-publish the models (or a PyNER meta-package) with corrected metadata so option 1 collapses into a plain lock.

---

### Phase 4 — Cutover (single flip; requires Phase T shipped in the consumed trexsql image)

#### Task 4.1: package.json commands via packageutils

- [ ] `packageutils.py`: every flow entry gets `"command": "/app/run-flow.sh <npm-short-name>"` (from package.json `name` without scope — matches tpm's extract naming and the artifact `name`). Keep emitting `image` unchanged (trex still sends it; template ignores it). Regenerate all 7 package.json files; diff shows only command additions. **Single revertable commit** (rollback depends on it).

#### Task 4.2: process-pool base job template in alp-dataflow-gen-init

- [ ] `customWorkpool.ts` gains `customProcessWorkpool`: variables schema = `env`/`name`/`labels`/`command`/`working_dir` (default `/app`)/`stream_output` **plus accepted-but-ignored `image`, `image_pull_policy`, `volumes`, `networks`** (trex always sends them — `flow.ts:208-213`) **plus `plugin_artifact` (object; read by the launcher via the deployment record, never templated)**; `job_configuration` maps only the process fields; `command` default = `DEFAULT_FLOW_COMMAND` env → `/app/run-flow.sh d2e-flows`.
- [ ] `seed.ts` selects template by new env `WORKPOOL_TYPE` (`process` → process template; else legacy docker template for rollback); `env.ts` adds `WORKPOOL_TYPE`, `DEFAULT_FLOW_COMMAND`.
- [ ] Verify field parity against `ProcessWorker.get_default_base_job_template()` on 3.6.10 (one docker run).

#### Task 4.3: compose + finalization

- [ ] Worker service: fat generic image; command creates/starts `${PREFECT_POOL:-process-pool} --type process` via the worker's pixi env; env `INSTALL_SQLALCHEMY_HANA`, `TREX_STORAGE_URL` (trex `/storage-api` route), `TREX_STORAGE_SERVICE_KEY`; volume `trex:/app/duckdb_data` only; `mem_limit: ${D2E_MEMORY_LIMIT:-16g}`; **docker.sock removed**; network `data`.
- [ ] trex service: bundle `@trex/storage` (registry/external-plugins), storage backend path on the trex volume; `PREFECT_POOL`/`WORKPOOL_NAME` default `process-pool`, `WORKPOOL_TYPE=process`, `DEFAULT_FLOW_COMMAND`; mark `PREFECT_DOCKER_NETWORK`/`PREFECT_DOCKER_VOLUMES`/`PLUGINS_IMAGE_TAG`/`PLUGINS_FLOW_CUSTOM_REPO_IMAGE_CONFIG`/`INSTALL_SQLALCHEMY` legacy-for-rollback; update the `docker-compose.yml:280-292` comment block.
- [ ] Delete per-group `uv.lock` files; retire `install_hana_drivers.sh`; update `plugins/flows/README.md` + `.github/instructions/flows.instructions.md`.
- [ ] Full local verification: `yarn clean && yarn local start`, `scripts/check-setupdemo-flow.mjs`, one flow per group via Admin Portal → Jobs, **one portal-driven plugin install** exercising tpm → storage upload → deployment stamping → worker provisioning end-to-end.

> **Phase 4 verification RESULT (2026-07-13, CI on PR #2881):** the full-stack check ran in CI rather than locally — **all test suites green on the process worker**: demosetup_dev (datamodel-create, cachedb, DQD/R flows, hybrid-search e2e incl. a live `search_embedding_plugin` run through the portal), demosetup_hana ×2 (runtime HANA driver top-up verified), http_duckdb, http_hana, regression. CI-journey fixes beyond the plan: `xz`/`libpq`/`cmake`/static-libv8/`expat` (fontconfig pkg-config chain) conda deps, `git` in the worker image, reticulate venv wrapper (reticulate rejects conda-structured envs — ARTEMIS), **hana pixi envs replaced by a pinned pip install into the default env** (a second prefix has an empty R library; renv restores only into default), runtime stamp-delta re-provisioning of baked dirs (launcher + entrypoint pre-warm), deploy CLI's legacy flow-base pull removed, `transformers==4.57.6` pinned (5.x changes embedding outputs; score-exact e2e assertions), and `R_MAKEVARS_USER=/dev/null` (host dotfile isolation). Remaining plan deltas: legacy flow-* image builds retired immediately instead of a rollback window (they can't build from pixi-shaped manifests; rollback = published :develop images), pilot compose service removed, `docker-compose-local.yml` added to test paths-filters. The trex-registration check (Step 3) is implicitly covered: deployments registered into the process pool with commands intact in every suite.

#### Task 4.4: CI

- [ ] `_pixi-lock-check.yml`: matrix over 7 groups + worker manifest; `prefix-dev/setup-pixi@v0` pinned to `PIXI_VERSION`; `pixi lock --check`. Gate on `plugins/flows/**` paths-filter.
- [ ] `build_images`: `d2e-dataflow-gen-worker` context → `.` (needs `plugins/flows` for the baked cache). Keep the 7 `flow-*` builds during the rollback window.
- [ ] `build_plugins`: tarball assertion step — each flow tarball contains `pyproject.toml`, `pixi.lock`, `flows/`, `_shared_flow_utils/`, and (R groups) `renv.lock`.
- [ ] Update `PREPULL_FLOW_IMAGES` and `_test-http-duckdb.yml`/`_test-http-hana.yml` (drop the `INSTALL_SQLALCHEMY` command override — HANA is provisioner-handled).

---

### Phase 5 — Helm chart (mechanics only; mechanism identical to compose)

- [ ] Worker: `d2e-dataflow-gen-worker:<tag>`, pool `--type process`; drop Job RBAC + `baseJobTemplate.json` configmap; envs + pixi cache on node-local storage (emptyDir or image); `TREX_STORAGE_URL`/`TREX_STORAGE_SERVICE_KEY`/`INSTALL_SQLALCHEMY_HANA` env; resources sized for concurrent runs. **No RWX/shared PVC needed for plugins** — artifacts arrive via storage; duckdb-data storage is a separate pre-existing concern. Multi-replica: each replica pre-warms independently (marker dedup per node).
- [ ] `ci/test-values.yaml` loses the k8s job template. Validate `helm_lint`/`kubeconform`. Flag to ops: per-run Job isolation gone; scaling = replicas.

---

## Rollout order & rollback

1. Phases 0–3 (d2e) merge behind no-op defaults (`PREFECT_POOL=docker-pool`); Phase T (trex) proceeds in parallel; old flow images keep building.
2. Phase 4 flips compose defaults once d2e consumes a Phase-T trexsql image. Deploy to develop.d2e.sg; watch a full setupdemo + DQD/DC cycle + one portal-driven plugin install/update.
3. **Rollback:** `PREFECT_POOL=docker-pool`, `WORKPOOL_TYPE=docker`, `WORKPOOL_NAME=docker-pool`, revert the Task 4.1 package.json commit, restore old worker command/image (`Dockerfile.docker-pool`), restart trex + worker. Flow images still on ghcr. trex's artifact stamping is inert on a docker pool (extra job_variable, ignored).
4. After 2 stable weeks: remove flow-image matrix entries, per-group Dockerfiles, `install_hana_drivers.sh`, `Dockerfile.docker-pool`, legacy trex envs.

## Not migrated (candidates — confirmed during execution)

- (none — `ner_extract_plugin` migrated via the models-as-assets ner environment, Task 3.2)
- No flows found flagged with image-provenance/compliance requirements.

## Open risks (ranked)

1. **`@trex/storage` production readiness** — shipped and enabled in the d2e-pinned trexsql image (verified), but feasibility-test grade: ephemeral `/tmp/storage` default, no `flow-plugins` bucket, machine-caller auth path undefined. Phase T.2 closes these; until then the worker mechanism is proven against a stand-in URL (Phase 0) and compose can run on the baked cache alone.
2. **R-in-conda viability** (A3) — gated at Task 2.1 spike; fallback breaks install-independence for R plugins and needs a user decision.
3. **Runtime R provisioning cost** — hades-scale renv restore per worker node at provisioning time (potentially >1h). Measured at Task 2.2; mitigation: prebuilt conda channel (Follow-ups).
4. **Cross-repo sequencing** — Phase 4 depends on a trexsql release containing Phase T; slips delay cutover but not Phases 0–3.
5. **NER closure lockability** (A4) — carve-out defined.
6. **pixi pyproject `[project.dependencies]` pickup + `$PIXI_PROJECT_ROOT` activation interpolation** — verified at Task 0.1 with written fallbacks.
7. Worker resource contention (no per-run limits) — ops sign-off on worker sizing + pool concurrency limit.
8. **prefect 3.0.3 → 3.6.10 bump** — engine-side changes (authtoken flow-run input, blocks/variables APIs in `_shared_flow_utils`) covered by per-group pilot runs; Docker-pool rollback unaffected.
9. Prefect server-side job-variable validation of the extended template (ignored docker vars + `plugin_artifact`) — covered by Task 0.3 Step 3.

## Follow-ups (out of scope)

- Prebuilt conda channel for OHDSI R packages via rattler-build (`generate-recipe cran` + GitHub-source recipes for the d2e forks) — moves R compiles into channel CI; makes R plugin provisioning fast.
- cpu-only torch for search_embedding (image/env size).
- Align `ibis-framework` versions across groups.
- Optional trex cleanup: stop sending docker-specific job variables for non-docker pools.
