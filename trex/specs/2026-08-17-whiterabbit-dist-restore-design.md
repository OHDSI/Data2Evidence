# Restore White Rabbit scans: re-provision the dist in the worker image

Date: 2026-08-17
Status: design agreed (Option 1 + Fix C + Fix D), implementation not started
Regressed in: `a96fde35` — "Pixi-managed flow plugin environments on a Prefect process worker (#2881)", merged 18 Jul 2026

## 1. Problem

White Rabbit scans launched from the Admin Portal ETL page have been non-functional on
`develop` since 18 Jul 2026. The flow fails server-side with:

```
FileNotFoundError: [Errno 2] No such file or directory: '/app/whiterabbit/config.ini'
```

The error names `config.ini`, but the missing thing is the **parent directory**.
`open(path, "w")` creates a file, never its parent.

`a96fde35` deleted `plugins/flows/data_transformation/Dockerfile` (182 lines), which was the
only thing that created `/app/whiterabbit` and populated it:

```dockerfile
FROM ghcr.io/data2evidence/whiterabbit:master AS whiterabbit_base
RUN mkdir -p ... /app/whiterabbit ... && mkdir -p /app/whiterabbit/csvfiles ...
COPY --chown=docker:docker --from=whiterabbit_base /dist /app/whiterabbit/dist
```

Flow assets are now provisioned by pixi via `setup_assets.sh`, which fetches over HTTP. The
WhiteRabbit dist exists only inside an OCI image, so the `COPY --from` could not be ported and
was dropped without replacement. `setup_assets.sh:6-9` records the decision as an OPEN ITEM
(migration plan Task 3.1). Nothing gates or warns on it at runtime.

The plugin still expects the old layout. `white_rabbit_plugin/types.py:6` hardcodes
`/app/whiterabbit`, and a repo-wide grep confirms it is the **only** match — a consumer with no
producer.

Two independent defects compound this:

- The failure mode is misleading (points at a config file that was never meant to exist yet).
- The failure is **invisible to users**: `scan-data.router.ts:63` swallows the error with a bare
  `catch (error) {}`, so the request never returns and the Scan Data dialog hangs on "Pending"
  forever, not dismissable with Escape.

## 2. Decision and scope

Three changes land together:

| ID | Change | Purpose |
| --- | --- | --- |
| **A** | Restore the OCI copy in the worker Dockerfile | Restores scans |
| **C** | `mkdir -p` + fail-fast precondition in `create_white_rabbit_settings` | Honest errors |
| **D** | `next(error)` in the `result-as-resource` handler | Kills the infinite spinner |

### 2.1 Why Option 1 (build-time OCI copy)

Two alternatives were evaluated and rejected for now:

- **Plugin-local fetch of a published tarball** (migration plan Task 3.1) is the correct
  long-term shape, but it is blocked on work in a *different repository*. The upstream
  `OHDSI/WhiteRabbit` release zips cannot be substituted: `data2evidence/d2e-WhiteRabbit` is not
  a fork or mirror of upstream — it descends from the SoftwareCountry/Arcadia Perseus
  web-service fork (`org.ohdsi:leporidae:0.10.7` vs upstream `1.0.0`) and carries D2E-only
  patches the plugin depends on. Most decisively, d2e commit `9c1a667` adds a
  `--generateWordReport` CLI flag to RabbitInAHat that upstream does not have, and
  `tasks.py:122` calls exactly that flag. Upstream's `RabbitInAHatMain` would fall through to
  GUI mode and hang. Unblocking this route requires building and publishing the patched dist
  from `d2e-WhiteRabbit` (last pushed Apr 2025).
- **An OCI fetch tool (`oras`/`skopeo`) in the provisioner** would keep the plugin-local
  decoupling without waiting on a release, but reintroduces the OCI dependency the migration set
  out to remove and adds registry-auth handling to a path that today only runs plain `curl`.

Option 1 uses the artifact that exists today, needs no cross-repo coordination, and restores
pre-regression behaviour exactly.

**Accepted trade-off, to be stated in the PR description:** this re-couples a *flow-plugin
asset* to the *worker image*, which the pixi migration explicitly set out to decouple — the
worker Dockerfile header states *"installing or updating a flow plugin never requires rebuilding
this image."* That invariant is knowingly broken for this one asset, and the Task 3.1 follow-up
supersedes it.

### 2.2 Pre-established facts that reduce this to "only the dist is missing"

- `openjdk = "17.*"` is already a dependency of the data_transformation pixi env
  (`pyproject.toml:104`), so the JVM is present. No dependency work.
- The worker image already installs `xvfb` (`Dockerfile:73`), with a comment at `:65` naming
  `white_rabbit_plugin` as the reason. The runtime dependency survived the migration.
- The virtual display is started **by the plugin itself**, not the image:
  `white_rabbit_plugin/flow.py:17-20` wraps the run in `xvfbwrapper.Xvfb(display=...)`, and
  `xvfbwrapper` is in the pixi env (`pyproject.toml:38`). There is no `DISPLAY`/`Xvfb`
  entrypoint wiring to restore.
- The worker runs as **root** — there is no `USER` directive in
  `services/alp-dataflow-gen-worker/Dockerfile` — so the old `chown docker:docker` / `chmod 711`
  dance is unnecessary.

## 3. Architecture

### 3.1 Fix A — worker Dockerfile

`services/alp-dataflow-gen-worker/Dockerfile` has a deliberate build topology: R-heavy stages
form a `FROM` lineage (`env-base` → `env-hades` → `env-data-transformation` → final) so each
heavy env exists once as native layers, with light python-only groups built in parallel stages
and `COPY`'d in. The header documents this at length; the change must not disturb it.

Two additions:

1. A **standalone top-level stage** declared near the other top-level `FROM`s (alongside
   `FROM ubuntu:24.04 AS staging` at :19 and `FROM ubuntu:24.04 AS runtime-base` at :60):

   ```dockerfile
   FROM ghcr.io/data2evidence/whiterabbit:master AS whiterabbit_base
   ```

   Deliberately **not** part of the heavy-env lineage. BuildKit pulls it concurrently with the
   other stages and only the copied layer reaches the final image.

2. In the **final stage** (`FROM env-data-transformation`, :121), beside the existing
   `COPY services/alp-dataflow-gen-worker/run-flow.sh /app/` at :126:

   ```dockerfile
   COPY --from=whiterabbit_base /dist /app/whiterabbit/dist
   RUN mkdir -p /app/whiterabbit/csvfiles
   ```

Placement in the final stage (not in `env-data-transformation`) keeps the expensive
data_transformation provisioning layer's cache key untouched by this change.

**Digest pinning.** `:master` is a floating tag on a package last published ~Jan 2025. The spec
recommends pinning by digest for a reproducible build:

```dockerfile
FROM ghcr.io/data2evidence/whiterabbit@sha256:bfebf252d3c69d1c9e5b195964f85732d539c23e68760e2c3d492a4a0265d124 AS whiterabbit_base
```

with the human-readable `:master` recorded in an adjacent comment. See open question Q1.

### 3.2 Fix C — filesystem preconditions in the plugin

`plugins/flows/data_transformation/white_rabbit_plugin/tasks.py`, in
`create_white_rabbit_settings`, before the `open(config_path, "w")` at :60:

```python
Path(WHITERABBIT_DIR_PATH).mkdir(parents=True, exist_ok=True)
Path(WHITERABBIT_CSV_DIR).mkdir(parents=True, exist_ok=True)
if not Path(WHITERABBIT_BIN_PATH).exists():
    raise RuntimeError(
        f"WhiteRabbit distribution not found at {WHITERABBIT_BIN_PATH}. "
        "The dist is provisioned into the dataflow-gen-worker image from the "
        "whiterabbit OCI stage; a worker built without it cannot run scans."
    )
```

`Path` is already imported (`tasks.py:2`). Both directories are created because
`INISettings.working_folder` (`types.py:71-74`) resolves to `WHITERABBIT_CSV_DIR` for
`SCAN_REPORT_FILES` and `WHITERABBIT_DIR_PATH` for `SCAN_REPORT_DB` — the scan's working folder
is one or the other depending on scan type, and both must exist.

This is intentionally redundant with the Dockerfile's `mkdir`. The image guarantees the
directories at build time; Fix C makes the task self-sufficient and converts the "dist absent"
case from a confusing `FileNotFoundError` about `config.ini` into a named, actionable error.

### 3.3 Fix D — error propagation in the white-rabbit function

`plugins/functions/white-rabbit/src/scan-data/scan-data.router.ts:63` ends the
`result-as-resource` handler with `catch (error) {}`. The handler already receives `next` in its
signature; `next` is simply unused. Both sibling handlers in the same file (:39-40 and :85-89)
log and then call `next(error)`. Match that convention:

```ts
} catch (error) {
  this.logger.error(
    `Error when getting scan report: ${JSON.stringify(error)}`
  );
  next(error);
}
```

Note on where `next(error)` lands: `main.ts` registers **no custom error-handling middleware**.
The error therefore reaches Express's built-in final handler, which responds `500` and ends the
request. That is sufficient — the defect is that the request never terminates at all, leaving
the client waiting. Adding a custom error middleware is out of scope (§7).

## 4. Interfaces and contracts

The contract between the worker image and the plugin is a **filesystem layout**, consumed
through three constants in `white_rabbit_plugin/types.py:6-8`:

| Constant | Value | Producer | Consumer |
| --- | --- | --- | --- |
| `WHITERABBIT_DIR_PATH` | `/app/whiterabbit` | Dockerfile (`COPY`/`mkdir`) + Fix C | `config.ini`, docx output, DB-scan working folder |
| `WHITERABBIT_BIN_PATH` | `/app/whiterabbit/dist/bin` | Dockerfile `COPY --from` | `whiteRabbit` (:84), `rabbitInAHat` (:122) |
| `WHITERABBIT_CSV_DIR` | `/app/whiterabbit/csvfiles` | Dockerfile `mkdir` + Fix C | CSV download target (:165), file-scan working folder |

The constants are **unchanged** by this work. Rebasing them onto `PIXI_PROJECT_ROOT` belongs to
the Task 3.1 follow-up, not here.

What the image stage supplies: the d2e WhiteRabbit image builds `/dist` with
appassembler-maven-plugin (flat repository layout), producing `dist/bin/whiteRabbit`,
`dist/bin/rabbitInAHat` (plus `.bat` variants) and a flat `dist/repo/*.jar` classpath. The
launcher scripts resolve `java` from `PATH`, which the pixi env supplies as OpenJDK 17.

HTTP contract touched by Fix D: `GET /white-rabbit/api/scan-data/result-as-resource/:conversionId`.
Success is unchanged (`200`, `application/octet-stream`). Failure changes from *no response* to
a terminated `5xx`.

## 5. Data flow

```
Portal (ETL page) ──> CSV upload ──> supabase-storage        [already works, unchanged]
        │
        └─ APPLY ──> white-rabbit function ──> Prefect flow "Run white rabbit"
                                                   │
                     flow.py: start Xvfb (xvfbwrapper)
                                                   │
                     download_csv_files ──> /app/whiterabbit/csvfiles      [CSV scans]
                                                   │
                     create_white_rabbit_settings                          [Fix C here]
                       ├─ mkdir -p dir + csvfiles
                       ├─ assert dist/bin exists  ──(absent)──> RuntimeError, named
                       └─ write /app/whiterabbit/config.ini
                                                   │
                     create_scan_report
                       └─ /app/whiterabbit/dist/bin/whiteRabbit -ini config.ini   [Fix A supplies this]
                                                   │
                     ScanReport.xlsx in working_folder ──> upload
                                                   │
Portal <── result-as-resource ────────────────────┘                        [Fix D here]
```

The break today is strictly at `create_white_rabbit_settings`. Upload and file listing are
confirmed working and are not touched.

## 6. Error handling

| Condition | Before | After |
| --- | --- | --- |
| Dist absent from image | `FileNotFoundError: '/app/whiterabbit/config.ini'` — points at the wrong artifact | `RuntimeError` naming `WHITERABBIT_BIN_PATH` and the provisioning source |
| Directory absent, dist present | Same misleading `FileNotFoundError` | Directory created; run proceeds |
| `config.ini` write fails for another reason (permissions, disk) | `FileNotFoundError` from the existing post-write check at :64-66 | Unchanged — still surfaces |
| Scan report fetch throws | Silently swallowed; request hangs; UI spins forever | Logged, `next(error)` → `500`; dialog reaches a terminal state |

Fix C's precondition is a **fail-fast**, deliberately raised before any file is written, so a
misprovisioned worker reports the real cause on the first task rather than midway through.

## 7. Non-goals

- **Fix B / migration Task 3.1** — plugin-local provisioning from a published dist. Tracked
  separately; requires a release cut from `data2evidence/d2e-WhiteRabbit` first.
- **Migrating to upstream `OHDSI/WhiteRabbit`** — blocked by the missing `--generateWordReport`
  patch (§2.1). Would require porting `9c1a667`, `4dfdbcf`, `7a1556f` onto 1.0.0.
- **Rebasing `types.py` onto `PIXI_PROJECT_ROOT`** — belongs with Fix B.
- **The Prefect worker crash** (`RuntimeError: Service exceeded error threshold`,
  `provision-envs: deployment poll failed (HTTP 500)`, observed 2026-08-17T05:00:53Z). A
  different failure; triaged separately. Restoring the dist is not assumed to fix it.
- **Custom Express error middleware** for the white-rabbit function. The built-in handler is
  sufficient to terminate the request.
- **The shared `csvfiles` working directory.** All scans write into one directory and WhiteRabbit
  scans `*` (all CSVs in the working folder), so concurrent or repeated scans can observe each
  other's files. Pre-existing behaviour, unchanged by this work, worth its own issue.
- **Multi-arch support.** The CI matrix that builds this image is `linux/amd64` only
  (`docker-build-push.yaml:287`), matching the whiterabbit image's only published variant.

## 8. Testing approach

### 8.1 Fix C — unit tests (fully verifiable in-repo)

`white_rabbit_plugin/` has no `tests/` directory today; `dataflow_ui_plugin/tests/` is the
in-repo pattern to follow. Add `white_rabbit_plugin/tests/test_tasks.py` covering:

1. Dist absent → raises `RuntimeError` whose message contains the bin path, and **not**
   `FileNotFoundError`.
2. Directories absent, dist present (faked) → both directories created, `config.ini` written.
3. Directories already present → idempotent, no error (`exist_ok=True`).
4. `working_folder` resolves to `csvfiles` for `SCAN_REPORT_FILES` and to the base dir for
   `SCAN_REPORT_DB`.

**Implementation note for tests:** `tasks.py:13` imports the constants *by value*
(`from .types import WHITERABBIT_BIN_PATH, ...`), so tests must monkeypatch
`white_rabbit_plugin.tasks.WHITERABBIT_*`, not `types.*`, and point them at a `tmp_path`.

### 8.2 Fix D — see open question Q2

`plugins/functions/white-rabbit` is a **Deno** package (`deno.json`, no `package.json`). It
declares no `test` task and is **not** in the `plugin-function-tests.yml` CI matrix, which covers
only `strategus-analysis`, `jobplugins`, `dataset`. A unit test therefore requires adding test
infrastructure plus a matrix entry. Minimum bar without that: `deno check` on the changed file
and manual verification via §8.4.

### 8.3 Fix A — build-time verification (requires a docker host)

```bash
docker exec alp-dataflow-gen-worker ls /app/whiterabbit/dist/bin
# expect: whiteRabbit  whiteRabbit.bat  rabbitInAHat  rabbitInAHat.bat
docker exec alp-dataflow-gen-worker ls -d /app/whiterabbit/csvfiles
```

### 8.4 End-to-end (requires a docker host)

Restart the worker first — it exited at 2026-08-17T05:00:53Z (`docker start alp-dataflow-gen-worker`).

Admin Portal → ETL → add a White Rabbit node → *Configure White Rabbit* → *Scan data* → choose
**CSV files**, upload `plugins/ui/apps/mapping/sampleCSV/healthcare_dataset.csv`, **SCAN TABLES**,
select the file, **APPLY**.

Expected: the progress dialog reaches a terminal state instead of sitting on "Pending", and

```bash
docker logs alp-dataflow-gen-worker --since 5m | grep -E "Run white rabbit|FileNotFound"
```

shows the flow run completing rather than `Finished in state Failed`.

**Negative test for Fix D (do this while the dist is still absent, before Fix A lands):** trigger
a scan and confirm the dialog now surfaces a failure instead of spinning indefinitely. Once Fix A
lands, this path is hard to exercise without deliberately breaking the image.

### 8.5 Environment constraint

The agent sandbox has **no docker CLI and no docker socket** (`/var/run/docker.sock` absent).
`alp-dataflow-gen-worker` resolves at `172.19.0.7`, but the image cannot be rebuilt, exec'd into,
or restarted from inside it. §8.1 is verifiable in-sandbox; §8.3 and §8.4 require a docker host.
See open question Q3.

## 9. Risks

| Risk | Severity | Mitigation |
| --- | --- | --- |
| `ghcr.io/data2evidence/whiterabbit:master` is stale (published ~Jan 2025) and its old source URL `data2evidence/whiterabbit` now 404s (repo renamed `d2e-WhiteRabbit`) | Medium | Pin by digest (Q1); Fix B removes the dependency entirely |
| Re-couples plugin asset to worker image, violating a documented invariant | Medium | Accepted and documented in the PR description; superseded by Fix B |
| Image is `linux/amd64` only; a local `arm64` build could fail to resolve the stage | Low | CI is amd64-only. The dist is architecture-independent Java, so `--platform=linux/amd64` on the stage is a safe local-build guard if needed |
| GHCR pull credentials in CI | Low | The package is publicly listed and CI already authenticates to GHCR |
| Worker image grows by the dist (~100s of MB) | Low | Same size as pre-regression; single `COPY` layer in the final stage only |

## 10. Open questions for the team

- **Q1 — Pin the whiterabbit stage by digest, or keep the floating `:master` tag?**
  Recommendation: pin by digest (`sha256:bfebf252…`) with `:master` in a comment, for a
  reproducible build against a package that is no longer actively published.
- **Q2 — Fix D test coverage.** Add Deno test infrastructure to
  `plugins/functions/white-rabbit` and a `plugin-function-tests.yml` matrix entry, or ship the
  one-line fix with `deno check` plus manual verification only?
- **Q3 — Who runs the host-side rebuild and end-to-end verification?** The sandbox has no docker
  daemon (§8.5). Fix C is verifiable here; Fix A and the e2e scan are not.
