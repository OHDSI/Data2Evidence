# White Rabbit Scan Restore Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restore White Rabbit scans on `develop` by re-provisioning the WhiteRabbit dist into the dataflow-gen worker image, and make any future scan failure visible instead of presenting as an infinite spinner.

**Architecture:** Four independent changes. **Fix A** re-adds a standalone `whiterabbit_base` OCI stage to the worker Dockerfile and copies `/dist` to `/app/whiterabbit/dist`, restoring the exact layout `white_rabbit_plugin/types.py` already hardcodes. **Fix C** makes the flow task self-sufficient (`mkdir -p`, fail fast on a missing dist) and clears the shared CSV working directory so repeat scans cannot inherit stale tables. **Fix D** stops the scan-report download handler swallowing errors. **Fix E** fixes the progress dialog so poll failures and all Prefect terminal states are surfaced and the user is never trapped in the modal.

**Tech Stack:** Docker/BuildKit multi-stage, Python 3.12 + Prefect 3.6 + pytest (pixi-managed env), Deno + Express (white-rabbit function), React 18 + RTK Query + MUI + Vitest (flow UI app).

**Spec:** `trex/specs/2026-08-17-whiterabbit-dist-restore-design.md`

---

## Ordering rationale — read before starting

Tasks are ordered **D → E → C → A** deliberately, not by fix letter.

Fix A is what restores scans. Landing it last means the observability fixes (D, E) can be
verified against a **genuinely broken** system, which is the only cheap way to exercise the
failure paths. Once Fix A lands, you would have to deliberately break the image to test them.

Do not reorder without re-reading Task 12.

## Corrections to the source notes — do not re-derive these

Both attached notes claim the infinite "Pending" spinner is caused by
`scan-data.router.ts`'s bare `catch (error) {}`. **That is wrong**, and it was verified wrong by
endpoint tracing:

- `ScanDataRouter` is mounted at `/scan-report` (`plugins/functions/white-rabbit/src/routes.ts:15`),
  so Fix D's handler serves `GET /white-rabbit/api/scan-report/result-as-resource/:conversionId`.
- That endpoint is called **only** from `handleSaveReport`
  (`ScanProgressDialog.tsx:73-79`), behind a button that is `disabled={!scanCompleted || scanFailed}`.
  It is unreachable until a scan has already succeeded.
- The progress dialog polls a **different** endpoint: `getFlowRunStatus` →
  `white-rabbit/results/{flowRunId}` on the `jobplugins` base
  (`dataflow-slice.ts:319-329`), every 3 s.

So Fix D fixes the *Save report* download failing silently (a real bug), and **Fix E** is what
fixes the spinner. Keep both, but do not conflate them.

## Scope decisions

| Item | Decision |
| --- | --- |
| Fix A — worker Dockerfile OCI copy | **In scope** (Task 11) |
| Fix C — mkdir + fail-fast | **In scope** (Task 5) |
| Fix C2 — shared `csvfiles` cleanup | **In scope** (Task 7) — required for safety, see below |
| Fix D — `next(error)` | **In scope** (Task 1) |
| Fix E — progress dialog | **In scope** (Tasks 8-10), **flow app only** |
| Legacy `apps/mapping` ScanProgressDialog | **Out of scope** — team chose flow app only |
| Fix B / plugin-local provisioning | **Out of scope** — needs a `d2e-WhiteRabbit` release first |
| Upstream `OHDSI/WhiteRabbit` migration | **Out of scope** — upstream lacks `--generateWordReport` |
| `PIXI_PROJECT_ROOT` refactor of `types.py` | **Out of scope** — belongs with Fix B |
| Custom Express error middleware | **Out of scope** — built-in handler terminates the request |
| **`/app/downloads` regression** | **Out of scope — flagged, not fixed. See below.** |

### Why `csvfiles` cleanup is in scope, not optional

Verified chain:

- `SupabaseStorageAPI.download_file_to_path` writes `Path(filepath) / filename`
  (`plugins/flows/_shared_flow_utils/api/SupabaseStorageAPI.py:88`) — **flat, no node scoping**.
  `node_id` only selects the remote object.
- `tasks.py:165` passes the same `WHITERABBIT_CSV_DIR` for every node.
- There is no cleanup anywhere in `download_files_from_supabase_storage`.
- Scans run with `tables_to_scan="*"`, commented *"Scan all csv files in the working directory"*
  (`tasks.py:52`).
- The directory lives in an image layer, not a volume, so it persists for the container's life.

Consequence: every scan after the first includes CSVs left by prior scans **and by other ETL
nodes**, and those stale tables propagate into `scannedSchema` / "Link tables". This has been
unobservable since 18 Jul 2026 only because no scan completes at all — **Fix A re-exposes it**,
and it would silently corrupt the Task 12 verification (first scan clean, second scan wrong).

### `/app/downloads` — explicit out-of-scope note

`a96fde35` also deleted `mkdir -p /app/downloads`. Nothing in the tree recreates it, and
`plugins/flows/data_transformation/dataflow_ui_plugin/nodeutils/csvutils.py:60-62` still writes
there with no `mkdir`:

```python
downloads_dir = "/app/downloads"
csv_file_path = supabase_api.download_file_to_path(node_id, filename, downloads_dir)
```

Same failure class, same root-cause commit, **different plugin** (the dataflow-UI CSV node).
`SupabaseStorageAPI.py:77` and `StrategusResultsStorageAPI.py:75` also default to
`/app/downloads`; Strategus passes an explicit `work_dir` and is unaffected.

**Recommendation: file this as a separate issue, do not fold it into this PR.** Reasoning:

1. It is a different plugin and a different user-facing flow (dataflow CSV node, not White Rabbit),
   so it shares no code path with Fixes A/C/D/E and cannot be verified by Task 12's scan.
2. Its reachability has not been assessed — it is unknown whether the affected node path is
   exercised in practice, which changes its severity and therefore its urgency.
3. Bundling it widens this PR's blast radius from "restore one broken feature" to "audit every
   `/app/*` directory the deleted Dockerfile used to create", which needs its own sweep.

**This is a recommendation, not a decision.** If the team wants it folded in, it is a ~3-line
change (`Path(downloads_dir).mkdir(parents=True, exist_ok=True)` plus a test) and belongs as a
new task between Task 7 and Task 8.

---

## File Structure

**Modified:**

| File | Responsibility after change |
| --- | --- |
| `plugins/functions/white-rabbit/src/scan-data/scan-data.router.ts` | Scan-report HTTP routes; all three handlers now propagate errors |
| `plugins/flows/data_transformation/pyproject.toml` | Adds a `dev` dependency-group with pytest (matches sibling plugins) |
| `plugins/flows/data_transformation/pixi.lock` | Regenerated by `pixi lock` |
| `plugins/flows/data_transformation/white_rabbit_plugin/paths.py` | **NEW** — pure filesystem-precondition helpers, no Prefect import |
| `plugins/flows/data_transformation/white_rabbit_plugin/tasks.py` | Flow tasks; delegates filesystem preconditions to `paths.py` |
| `plugins/ui/apps/flow/src/features/flow/utils/scan-progress-state.ts` | **NEW** — pure Prefect-state classifier |
| `plugins/ui/apps/flow/src/components/Dialog/ScanProgressDialog/ScanProgressDialog.tsx` | Progress dialog; surfaces poll errors, handles all terminal states, never traps the user |
| `plugins/ui/apps/flow/vitest.config.ts` | **NEW** — test config |
| `plugins/ui/apps/flow/package.json` | Adds `test:unit` script + test devDependencies |
| `services/alp-dataflow-gen-worker/Dockerfile` | Worker image; provisions the WhiteRabbit dist |

**New tests:**

- `plugins/flows/data_transformation/white_rabbit_plugin/tests/__init__.py`
- `plugins/flows/data_transformation/white_rabbit_plugin/tests/test_paths.py`
- `plugins/ui/apps/flow/src/features/flow/utils/scan-progress-state.test.ts`

Rationale for the two new pure modules: `tasks.py` imports Prefect at module load, and
`ScanProgressDialog.tsx` needs a Redux store + MUI to render. Extracting the decision logic into
dependency-free modules makes the important behaviour unit-testable in milliseconds without
harnessing either framework.

---

## Task 1: Fix D — propagate errors from the scan-report download handler

**Files:**
- Modify: `plugins/functions/white-rabbit/src/scan-data/scan-data.router.ts:63`

This is a Deno package with no test harness and it is not in the
`plugin-function-tests.yml` matrix (which covers only `strategus-analysis`, `jobplugins`,
`dataset`). Adding Deno test infrastructure for a two-line change is not justified; verification
is `deno check` plus the Task 12 manual step.

- [ ] **Step 1: Read the current handler to confirm the exact text**

Run: `sed -n '44,66p' plugins/functions/white-rabbit/src/scan-data/scan-data.router.ts`

Expected: the handler ends with `} catch (error) {}` on line 63.

- [ ] **Step 2: Replace the empty catch**

Replace exactly:

```ts
        } catch (error) {}
```

with:

```ts
        } catch (error) {
          this.logger.error(
            `Error when getting scan report: ${JSON.stringify(error)}`
          );
          next(error);
        }
```

This matches the convention of the two sibling handlers in the same file (`:39-41` and
`:85-89`). `next` is already in the handler signature and was simply unused.

- [ ] **Step 3: Type-check the package**

Run: `cd plugins/functions/white-rabbit && deno check index.ts`
Expected: no errors. (If pre-existing unrelated errors appear, confirm they also appear on
`git stash` — do not fix them here.)

- [ ] **Step 4: Confirm no other empty catches remain in this file**

Run: `grep -n "catch (error) {}" plugins/functions/white-rabbit/src/scan-data/scan-data.router.ts`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add plugins/functions/white-rabbit/src/scan-data/scan-data.router.ts
git commit -m "fix(white-rabbit): propagate scan report download errors instead of swallowing them"
```

---

## Task 2: Add pytest to the data_transformation pixi environment

**Files:**
- Modify: `plugins/flows/data_transformation/pyproject.toml`
- Modify: `plugins/flows/data_transformation/pixi.lock` (generated)

`data_transformation` is the only flow plugin with committed tests
(`dataflow_ui_plugin/tests/`) but **no pytest dependency** — the `pytest` strings in its
`pixi.lock` are all optional-extra metadata (`extra == 'dev'`), not installed packages. Sibling
plugins (`base`, `hades`, `data_management`, `i2b2`, `loyalty_score`, `search_embedding`) all
declare it the same way, so follow that convention.

- [ ] **Step 1: Confirm pytest is genuinely absent**

Run: `grep -nE "^\s*\"pytest" plugins/flows/data_transformation/pyproject.toml`
Expected: no output.

Run: `grep -n "dependency-groups" plugins/flows/base/pyproject.toml`
Expected: shows the section to mirror (`base/pyproject.toml:40`).

- [ ] **Step 2: Add the dependency group**

In `plugins/flows/data_transformation/pyproject.toml`, insert immediately **before** the
`[tool.pixi.workspace]` section (currently line 94):

```toml
[dependency-groups]
dev = [
    "pytest==9.0.3",
]

```

Version pinned to `9.0.3` to match every sibling plugin.

- [ ] **Step 3: Regenerate the lockfile**

Run: `pixi lock --manifest-path plugins/flows/data_transformation/pyproject.toml`
Expected: `pixi.lock` updated, exit 0.

This is mandatory: `.github/workflows/_pixi-lock-check.yml` runs
`pixi lock --check` for `plugins/flows/data_transformation` and fails the build if
`pyproject.toml` changed without regenerating the lock.

- [ ] **Step 4: Verify the lock check passes and no sdists were introduced**

Run: `pixi lock --check --manifest-path plugins/flows/data_transformation/pyproject.toml`
Expected: exit 0, reports the lock is up to date.

Run:
```bash
grep -E 'pypi: https.*\.tar\.gz' plugins/flows/data_transformation/pixi.lock | grep -vE 'lzstring-|pandasql-'
```
Expected: no output. (Any hit fails CI — flow envs must stay binary-only.)

- [ ] **Step 5: Confirm pytest now resolves in the env**

Run: `pixi run --manifest-path plugins/flows/data_transformation/pyproject.toml python -m pytest --version`
Expected: `pytest 9.0.3`

- [ ] **Step 6: Commit**

```bash
git add plugins/flows/data_transformation/pyproject.toml plugins/flows/data_transformation/pixi.lock
git commit -m "chore(data_transformation): add pytest to the plugin dev dependency group"
```

---

## Task 3: Fix C — write the failing test for filesystem preconditions

**Files:**
- Create: `plugins/flows/data_transformation/white_rabbit_plugin/tests/__init__.py`
- Create: `plugins/flows/data_transformation/white_rabbit_plugin/tests/test_paths.py`

The helper goes in a new `paths.py` with **no Prefect import**, so the test does not need
`prefect_test_harness`. Do not put these assertions in a test that imports `tasks.py`.

- [ ] **Step 1: Create the test package marker**

Create `plugins/flows/data_transformation/white_rabbit_plugin/tests/__init__.py` as an empty file.

```bash
touch plugins/flows/data_transformation/white_rabbit_plugin/tests/__init__.py
```

- [ ] **Step 2: Write the failing test**

Create `plugins/flows/data_transformation/white_rabbit_plugin/tests/test_paths.py`:

```python
import pytest

from white_rabbit_plugin.paths import (
    ensure_whiterabbit_dirs,
    require_whiterabbit_dist,
    clear_csv_working_dir,
)


def test_ensure_creates_both_directories(tmp_path):
    base = tmp_path / "whiterabbit"
    csv_dir = base / "csvfiles"

    ensure_whiterabbit_dirs(str(base), str(csv_dir))

    assert base.is_dir()
    assert csv_dir.is_dir()


def test_ensure_is_idempotent(tmp_path):
    base = tmp_path / "whiterabbit"
    csv_dir = base / "csvfiles"

    ensure_whiterabbit_dirs(str(base), str(csv_dir))
    ensure_whiterabbit_dirs(str(base), str(csv_dir))

    assert csv_dir.is_dir()


def test_require_dist_raises_runtime_error_when_missing(tmp_path):
    missing_bin = tmp_path / "whiterabbit" / "dist" / "bin"

    with pytest.raises(RuntimeError) as excinfo:
        require_whiterabbit_dist(str(missing_bin))

    # The whole point of this fix: name the dist, not config.ini.
    assert str(missing_bin) in str(excinfo.value)
    assert "config.ini" not in str(excinfo.value)


def test_require_dist_does_not_raise_when_present(tmp_path):
    bin_dir = tmp_path / "whiterabbit" / "dist" / "bin"
    bin_dir.mkdir(parents=True)

    require_whiterabbit_dist(str(bin_dir))


def test_clear_csv_working_dir_removes_only_csv_files(tmp_path):
    csv_dir = tmp_path / "csvfiles"
    csv_dir.mkdir()
    (csv_dir / "stale_one.csv").write_text("a,b\n1,2\n")
    (csv_dir / "stale_two.CSV").write_text("a,b\n3,4\n")
    (csv_dir / "ScanReport.xlsx").write_bytes(b"not a csv")

    removed = clear_csv_working_dir(str(csv_dir))

    assert removed == 2
    assert not (csv_dir / "stale_one.csv").exists()
    assert not (csv_dir / "stale_two.CSV").exists()
    assert (csv_dir / "ScanReport.xlsx").exists()


def test_clear_csv_working_dir_tolerates_missing_dir(tmp_path):
    assert clear_csv_working_dir(str(tmp_path / "nope")) == 0
```

- [ ] **Step 3: Run the test to verify it fails**

Run:
```bash
cd plugins/flows/data_transformation && \
  pixi run python -m pytest white_rabbit_plugin/tests/test_paths.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'white_rabbit_plugin.paths'`

- [ ] **Step 4: Commit the failing test**

```bash
git add plugins/flows/data_transformation/white_rabbit_plugin/tests/
git commit -m "test(white_rabbit_plugin): add failing tests for filesystem preconditions"
```

---

## Task 4: Fix C — implement `paths.py`

**Files:**
- Create: `plugins/flows/data_transformation/white_rabbit_plugin/paths.py`

- [ ] **Step 1: Write the implementation**

Create `plugins/flows/data_transformation/white_rabbit_plugin/paths.py`:

```python
"""Filesystem preconditions for the WhiteRabbit plugin.

Deliberately free of Prefect imports so these can be unit-tested without a
flow-run harness. The WhiteRabbit dist is provisioned into the
dataflow-gen-worker image (see services/alp-dataflow-gen-worker/Dockerfile);
these helpers make the flow tasks self-sufficient and make a misprovisioned
worker report itself clearly.
"""

from pathlib import Path


def ensure_whiterabbit_dirs(dir_path: str, csv_dir: str) -> None:
    """Create the WhiteRabbit working directories if they are absent.

    open(path, "w") creates a file but never its parent, which is why a missing
    directory previously surfaced as a FileNotFoundError naming config.ini.
    """
    Path(dir_path).mkdir(parents=True, exist_ok=True)
    Path(csv_dir).mkdir(parents=True, exist_ok=True)


def require_whiterabbit_dist(bin_path: str) -> None:
    """Fail fast, and honestly, when the WhiteRabbit distribution is absent."""
    if not Path(bin_path).exists():
        raise RuntimeError(
            f"WhiteRabbit distribution not found at {bin_path}. "
            "The dist is provisioned into the dataflow-gen-worker image from "
            "the whiterabbit OCI stage; a worker built without it cannot run "
            "scans."
        )


def clear_csv_working_dir(csv_dir: str) -> int:
    """Remove CSV files left in the shared scan working directory.

    Every node's CSVs are downloaded into this one flat directory and scans run
    with tables_to_scan="*", so without this a scan would report tables
    belonging to previous scans and to other ETL nodes. Only *.csv is removed:
    the directory is also the working folder WhiteRabbit writes ScanReport.xlsx
    into.

    Returns the number of files removed.
    """
    directory = Path(csv_dir)
    if not directory.is_dir():
        return 0

    removed = 0
    for entry in directory.iterdir():
        if entry.is_file() and entry.suffix.lower() == ".csv":
            entry.unlink()
            removed += 1
    return removed
```

- [ ] **Step 2: Run the tests to verify they pass**

Run:
```bash
cd plugins/flows/data_transformation && \
  pixi run python -m pytest white_rabbit_plugin/tests/test_paths.py -v
```
Expected: PASS — 6 passed.

- [ ] **Step 3: Commit**

```bash
git add plugins/flows/data_transformation/white_rabbit_plugin/paths.py
git commit -m "feat(white_rabbit_plugin): add filesystem precondition helpers"
```

---

## Task 5: Fix C — wire preconditions into `create_white_rabbit_settings`

**Files:**
- Modify: `plugins/flows/data_transformation/white_rabbit_plugin/tasks.py:13` (imports)
- Modify: `plugins/flows/data_transformation/white_rabbit_plugin/tasks.py:56-60` (before the write)

- [ ] **Step 1: Add the import**

After the existing line 13:

```python
from .types import WHITERABBIT_BIN_PATH, WHITERABBIT_CSV_DIR, WHITERABBIT_DIR_PATH  
```

add:

```python
from .paths import ensure_whiterabbit_dirs, require_whiterabbit_dist
```

- [ ] **Step 2: Insert the preconditions before the config write**

Locate this block (currently `tasks.py:56-61`):

```python
    config_path = f"{WHITERABBIT_DIR_PATH}/config.ini"

    logger.debug(f"Writing file config.ini to {config_path}...")
    
    with open(config_path, "w") as configfile:
        config.write(configfile)
```

Replace it with:

```python
    config_path = f"{WHITERABBIT_DIR_PATH}/config.ini"

    ensure_whiterabbit_dirs(WHITERABBIT_DIR_PATH, WHITERABBIT_CSV_DIR)
    require_whiterabbit_dist(WHITERABBIT_BIN_PATH)

    logger.debug(f"Writing file config.ini to {config_path}...")
    
    with open(config_path, "w") as configfile:
        config.write(configfile)
```

Order matters: create the directories first (both are needed —
`INISettings.working_folder` at `types.py:71-74` resolves to `WHITERABBIT_CSV_DIR` for
`SCAN_REPORT_FILES` and `WHITERABBIT_DIR_PATH` for `SCAN_REPORT_DB`), then fail fast on a
missing dist **before** writing any file.

- [ ] **Step 3: Verify the module still imports**

Run:
```bash
cd plugins/flows/data_transformation && \
  pixi run python -c "import white_rabbit_plugin.tasks; print('ok')"
```
Expected: `ok`

- [ ] **Step 4: Re-run the paths tests (regression check)**

Run:
```bash
cd plugins/flows/data_transformation && \
  pixi run python -m pytest white_rabbit_plugin/tests/ -v
```
Expected: PASS — 6 passed.

- [ ] **Step 5: Commit**

```bash
git add plugins/flows/data_transformation/white_rabbit_plugin/tasks.py
git commit -m "fix(white_rabbit_plugin): create working dirs and fail fast on a missing dist"
```

---

## Task 6: Fix C2 — write the failing test for CSV cleanup wiring

**Files:**
- Modify: `plugins/flows/data_transformation/white_rabbit_plugin/tests/test_paths.py`

`clear_csv_working_dir` already exists and is tested (Task 3/4). This task tests that the
download task actually *calls* it. `download_files_from_supabase_storage` is a Prefect `@task`,
so call its `.fn` attribute to invoke the undecorated function without a flow harness.

- [ ] **Step 1: Append the failing test**

Add to the end of `plugins/flows/data_transformation/white_rabbit_plugin/tests/test_paths.py`:

```python
def test_download_task_clears_stale_csvs_before_downloading(tmp_path, monkeypatch):
    """A scan must not inherit CSVs from a previous scan or another node."""
    from white_rabbit_plugin import tasks

    csv_dir = tmp_path / "csvfiles"
    csv_dir.mkdir()
    (csv_dir / "from_a_previous_scan.csv").write_text("a\n1\n")

    monkeypatch.setattr(tasks, "WHITERABBIT_CSV_DIR", str(csv_dir))

    downloaded = []

    class FakeSupabaseAPI:
        def list_files(self, node_id):
            return [{"name": "current.csv", "type": "CSV"}]

        def download_file_to_path(self, node_id, filename, filepath):
            downloaded.append((filename, filepath))
            (csv_dir / filename).write_text("b\n2\n")

    result = tasks.download_files_from_supabase_storage.fn(
        "node-1", FakeSupabaseAPI()
    )

    assert result is True
    assert downloaded == [("current.csv", str(csv_dir))]
    assert (csv_dir / "current.csv").exists()
    assert not (csv_dir / "from_a_previous_scan.csv").exists()
```

- [ ] **Step 2: Run the test to verify it fails**

Run:
```bash
cd plugins/flows/data_transformation && \
  pixi run python -m pytest white_rabbit_plugin/tests/test_paths.py::test_download_task_clears_stale_csvs_before_downloading -v
```
Expected: FAIL — `assert not (csv_dir / "from_a_previous_scan.csv").exists()` fails, because the
stale file is still present.

- [ ] **Step 3: Commit the failing test**

```bash
git add plugins/flows/data_transformation/white_rabbit_plugin/tests/test_paths.py
git commit -m "test(white_rabbit_plugin): add failing test for stale CSV cleanup"
```

---

## Task 7: Fix C2 — clear the CSV working directory before downloading

**Files:**
- Modify: `plugins/flows/data_transformation/white_rabbit_plugin/tasks.py:13` (imports)
- Modify: `plugins/flows/data_transformation/white_rabbit_plugin/tasks.py:149-170` (`download_files_from_supabase_storage`)

- [ ] **Step 1: Extend the import added in Task 5**

Change:

```python
from .paths import ensure_whiterabbit_dirs, require_whiterabbit_dist
```

to:

```python
from .paths import (
    clear_csv_working_dir,
    ensure_whiterabbit_dirs,
    require_whiterabbit_dist,
)
```

- [ ] **Step 2: Clear the directory before the download loop**

In `download_files_from_supabase_storage`, locate:

```python
    logger = get_run_logger()
    files_uploaded = supabase_api.list_files(node_id)
```

Replace with:

```python
    logger = get_run_logger()

    # Every node downloads into this one flat directory and the scan runs with
    # tables_to_scan="*", so leftovers from a previous scan (or another node)
    # would silently appear as extra tables in this scan's report.
    removed = clear_csv_working_dir(WHITERABBIT_CSV_DIR)
    if removed:
        logger.info(f"Removed {removed} stale CSV file(s) from {WHITERABBIT_CSV_DIR}")

    files_uploaded = supabase_api.list_files(node_id)
```

- [ ] **Step 3: Run the test to verify it passes**

Run:
```bash
cd plugins/flows/data_transformation && \
  pixi run python -m pytest white_rabbit_plugin/tests/ -v
```
Expected: PASS — 7 passed.

- [ ] **Step 4: Commit**

```bash
git add plugins/flows/data_transformation/white_rabbit_plugin/tasks.py
git commit -m "fix(white_rabbit_plugin): clear stale CSVs before a file scan"
```

---

## Task 8: Fix E — add Vitest to the flow app

**Files:**
- Create: `plugins/ui/apps/flow/vitest.config.ts`
- Modify: `plugins/ui/apps/flow/package.json`

The flow app has no test runner. `apps/concept-mapping` is the React precedent to copy — and
critically, its `vitest.config.ts` carries a comment explaining that a **callback-form**
`vite.config.ts` must be invoked with a `configEnv` before merging. The flow app's
`vite.config.ts` is also callback-form (`defineConfig(({ command, mode }) => ...)`), so use the
concept-mapping shape, **not** the `apps/jobs` shape.

- [ ] **Step 1: Create the Vitest config**

Create `plugins/ui/apps/flow/vitest.config.ts`:

```ts
import { fileURLToPath } from "node:url";
import { mergeConfig, defineConfig, configDefaults } from "vitest/config";
import viteConfig from "./vite.config";

// vite.config.ts exports a callback-form config, so it must be invoked with a
// configEnv before merging — mergeConfig cannot merge a function directly.
// Same constraint as apps/concept-mapping.
export default defineConfig((configEnv) =>
  mergeConfig(
    viteConfig(configEnv),
    defineConfig({
      test: {
        globals: true,
        environment: "jsdom",
        exclude: [...configDefaults.exclude],
        root: fileURLToPath(new URL("./", import.meta.url)),
      },
    })
  )
);
```

No `setupFiles` entry: the tests added in this plan are pure-logic tests with no DOM assertions,
so `@testing-library/jest-dom` is not needed.

- [ ] **Step 2: Add the test script**

In `plugins/ui/apps/flow/package.json`, in `"scripts"`, after the `"clean"` entry, add:

```json
    "test:unit": "vitest"
```

Remember to add a comma to the preceding `"clean"` line.

- [ ] **Step 3: Add the test devDependencies**

In `plugins/ui/apps/flow/package.json`, in `"devDependencies"`, add:

```json
    "jsdom": "^24.0.0",
    "vitest": "^4.0.18",
```

Versions match `apps/concept-mapping` so the workspace resolves a single copy.

- [ ] **Step 4: Install and verify the runner starts**

Run: `cd plugins/ui && bun install`
Expected: completes without errors.

Run: `cd plugins/ui/apps/flow && bunx vitest run`
Expected: exits reporting "No test files found". That is success — the runner is wired up.

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/flow/vitest.config.ts plugins/ui/apps/flow/package.json plugins/ui/bun.lockb plugins/ui/package.json
git commit -m "chore(flow-ui): add vitest to the flow app"
```

(If `bun install` did not modify `plugins/ui/bun.lockb` or `plugins/ui/package.json`, drop those
paths from the `git add`.)

---

## Task 9: Fix E — write the failing test for the Prefect state classifier

**Files:**
- Create: `plugins/ui/apps/flow/src/features/flow/utils/scan-progress-state.test.ts`

The dialog currently treats only `Completed`, `Failed`, and `Crashed` as terminal
(`ScanProgressDialog.tsx:113-127`). Prefect also produces `Cancelled` and `TimedOut`, which
today poll forever.

- [ ] **Step 1: Write the failing test**

Create `plugins/ui/apps/flow/src/features/flow/utils/scan-progress-state.test.ts`:

```ts
import { describe, expect, test } from "vitest";
import {
  classifyFlowState,
  MAX_CONSECUTIVE_POLL_ERRORS,
} from "./scan-progress-state";

describe("classifyFlowState", () => {
  test("Completed is terminal and successful", () => {
    expect(classifyFlowState("Completed")).toEqual({
      terminal: true,
      failed: false,
      progress: 100,
    });
  });

  test.each(["Failed", "Crashed", "Cancelled", "TimedOut"])(
    "%s is terminal and failed",
    (state) => {
      const result = classifyFlowState(state);
      expect(result.terminal).toBe(true);
      expect(result.failed).toBe(true);
    }
  );

  test.each(["Scheduled", "Pending", "Running", "Paused", "Cancelling"])(
    "%s is not terminal",
    (state) => {
      const result = classifyFlowState(state);
      expect(result.terminal).toBe(false);
      expect(result.failed).toBe(false);
    }
  );

  test("known in-progress states carry a progress value", () => {
    expect(classifyFlowState("Pending").progress).toBe(25);
    expect(classifyFlowState("Running").progress).toBe(50);
  });

  test("an unknown state is treated as non-terminal with no progress", () => {
    expect(classifyFlowState("SomeFutureState")).toEqual({
      terminal: false,
      failed: false,
      progress: undefined,
    });
  });

  test("poll error tolerance is a small positive number", () => {
    expect(MAX_CONSECUTIVE_POLL_ERRORS).toBeGreaterThan(0);
    expect(MAX_CONSECUTIVE_POLL_ERRORS).toBeLessThanOrEqual(5);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd plugins/ui/apps/flow && bunx vitest run src/features/flow/utils/scan-progress-state.test.ts`
Expected: FAIL — cannot resolve `./scan-progress-state`.

- [ ] **Step 3: Commit the failing test**

```bash
git add plugins/ui/apps/flow/src/features/flow/utils/scan-progress-state.test.ts
git commit -m "test(flow-ui): add failing tests for Prefect scan state classification"
```

---

## Task 10: Fix E — implement the state classifier

**Files:**
- Create: `plugins/ui/apps/flow/src/features/flow/utils/scan-progress-state.ts`

- [ ] **Step 1: Write the implementation**

Create `plugins/ui/apps/flow/src/features/flow/utils/scan-progress-state.ts`:

```ts
/**
 * Pure classification of Prefect flow-run state names for the Scan Data
 * progress dialog. Kept dependency-free so it is unit-testable without a
 * Redux store or a rendered component.
 */

export const FLOW_STATE_PROGRESS: Record<string, number> = {
  Scheduled: 10,
  Late: 10,
  Pending: 25,
  AwaitingRetry: 25,
  Running: 50,
  Retrying: 50,
  Paused: 50,
  Cancelling: 75,
  Completed: 100,
  Failed: 100,
  Crashed: 100,
  Cancelled: 100,
  TimedOut: 100,
};

const TERMINAL_SUCCESS = "Completed";

/**
 * Prefect terminal failure states. The dialog previously handled only Failed
 * and Crashed, so Cancelled and TimedOut runs left it polling forever.
 */
const TERMINAL_FAILURE = new Set([
  "Failed",
  "Crashed",
  "Cancelled",
  "TimedOut",
]);

/** Consecutive poll failures tolerated before the dialog gives up and reports. */
export const MAX_CONSECUTIVE_POLL_ERRORS = 3;

export interface ScanStateClassification {
  terminal: boolean;
  failed: boolean;
  progress: number | undefined;
}

export function classifyFlowState(stateName: string): ScanStateClassification {
  const progress = FLOW_STATE_PROGRESS[stateName];

  if (stateName === TERMINAL_SUCCESS) {
    return { terminal: true, failed: false, progress };
  }
  if (TERMINAL_FAILURE.has(stateName)) {
    return { terminal: true, failed: true, progress };
  }
  return { terminal: false, failed: false, progress };
}
```

- [ ] **Step 2: Run the tests to verify they pass**

Run: `cd plugins/ui/apps/flow && bunx vitest run src/features/flow/utils/scan-progress-state.test.ts`
Expected: PASS — all tests green.

- [ ] **Step 3: Commit**

```bash
git add plugins/ui/apps/flow/src/features/flow/utils/scan-progress-state.ts
git commit -m "feat(flow-ui): add Prefect scan state classifier"
```

---

## Task 11: Fix E — make the progress dialog surface failures and never trap the user

**Files:**
- Modify: `plugins/ui/apps/flow/src/components/Dialog/ScanProgressDialog/ScanProgressDialog.tsx`

Four defects being fixed, all verified in the current file:

1. `catch (e) { console.error(...) }` at `:134-136` swallows poll errors; the interval keeps
   firing forever with no user-visible change.
2. Only `Completed`/`Failed`/`Crashed` are terminal (`:113-127`).
3. `Back` is `disabled={!scanCompleted || loading}` (`:178`), so when polling errors the user
   cannot leave the modal at all.
4. `log` shows the raw `state_name` and goes stale on an unmapped state.

- [ ] **Step 1: Replace the local progress map with the shared classifier**

Delete this block (currently `:29-34`):

```tsx
const FLOW_STATE_MAP = {
  Scheduled: 10,
  Pending: 25,
  Running: 50,
  Completed: 100,
};
```

Add to the import block, after the `useLazyGetScanReportQuery` import group:

```tsx
import {
  classifyFlowState,
  MAX_CONSECUTIVE_POLL_ERRORS,
} from "~/features/flow/utils/scan-progress-state";
```

- [ ] **Step 2: Add poll-error state**

After the existing declaration:

```tsx
  const [log, setLog] = useState<string>("");
```

add:

```tsx
  const [pollError, setPollError] = useState<string>("");
  const pollErrorCountRef = useRef(0);
```

- [ ] **Step 3: Reset the new state in `handleClear`**

Change `handleClear` from:

```tsx
  const handleClear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setLog("");
    setProgress(0);
    setScanCompleted(false);
  }, []);
```

to:

```tsx
  const handleClear = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    setLog("");
    setProgress(0);
    setScanCompleted(false);
    setScanFailed(false);
    setPollError("");
    pollErrorCountRef.current = 0;
  }, []);
```

`setScanFailed(false)` is added because the old `handleClear` left `scanFailed` set, so
re-opening the dialog after a failed scan kept "Save report" and "Link tables" disabled.

- [ ] **Step 4: Rewrite `fetchScanProgress`**

Replace the whole callback (currently `:109-137`) with:

```tsx
  const fetchScanProgress = useCallback(async () => {
    try {
      const status = await getFlowRunStatus(scanId).unwrap();

      pollErrorCountRef.current = 0;
      setPollError("");

      const { terminal, failed, progress: statePercent } = classifyFlowState(
        status.state_name,
      );

      if (terminal) {
        setScanCompleted(true);
        setScanFailed(failed);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      }

      setLog(status.state_name);
      if (statePercent !== undefined) {
        setProgress(statePercent);
      }
    } catch (e) {
      pollErrorCountRef.current += 1;
      console.error("Failed to fetch scan progress", e);

      if (pollErrorCountRef.current >= MAX_CONSECUTIVE_POLL_ERRORS) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        setPollError(
          "Lost contact with the scan job. It may still be running — " +
            "close this dialog and check the flow run status.",
        );
      }
    }
  }, [scanId]);
```

A single transient failure no longer aborts the dialog; three consecutive ones stop the polling
and say so. Note the interval is **not** restarted after `pollError` — the user gets an explicit
exit rather than an indefinite retry.

- [ ] **Step 5: Surface the error and stop trapping the user**

Change the log line (currently `:172`) from:

```tsx
        <div className="scan-progress-dialog__log">{log}</div>
```

to:

```tsx
        <div className="scan-progress-dialog__log">{pollError || log}</div>
```

Change the `Back` button (currently `:174-180`) from:

```tsx
        <Button
          onClick={handleBack}
          variant="outlined"
          disabled={!scanCompleted || loading}
        >
          Back
        </Button>
```

to:

```tsx
        <Button
          onClick={handleBack}
          variant="outlined"
          disabled={loading}
        >
          Back
        </Button>
```

Back is now always available unless a "Link tables" request is genuinely in flight. This is the
fix for "cannot be dismissed with Escape; only a page reload escapes it".

- [ ] **Step 6: Stop re-arming the interval after a poll error**

Change the polling effect (currently `:144-157`) guard from:

```tsx
    if (open && scanId !== "" && !scanCompleted) {
```

to:

```tsx
    if (open && scanId !== "" && !scanCompleted && !pollError) {
```

and add `pollError` to the dependency array, so it reads:

```tsx
  }, [open, scanId, scanCompleted, pollError, fetchScanProgress]);
```

Without this, `fetchScanProgress` changing identity would restart the interval that the catch
block just cleared.

- [ ] **Step 7: Verify the classifier tests still pass and types check**

Run: `cd plugins/ui/apps/flow && bunx vitest run`
Expected: PASS — all tests green.

Run: `cd plugins/ui/apps/flow && bunx tsc --noEmit -p tsconfig.json`
Expected: no new errors. If pre-existing unrelated errors appear, confirm they also appear on
`git stash` — do not fix them here.

- [ ] **Step 8: Verify the dead local map is gone**

Run: `grep -n "FLOW_STATE_MAP" plugins/ui/apps/flow/src/components/Dialog/ScanProgressDialog/ScanProgressDialog.tsx`
Expected: no output.

- [ ] **Step 9: Commit**

```bash
git add plugins/ui/apps/flow/src/components/Dialog/ScanProgressDialog/ScanProgressDialog.tsx
git commit -m "fix(flow-ui): surface scan poll failures and stop trapping users in the dialog"
```

---

## Task 12: Fix A — restore the WhiteRabbit dist in the worker image

**Files:**
- Modify: `services/alp-dataflow-gen-worker/Dockerfile`

Do this **after** Tasks 1-11 so the observability fixes were exercised against a broken system.

- [ ] **Step 1: Add the source stage**

Insert immediately **before** the existing line 19 (`FROM ubuntu:24.04 AS staging`):

```dockerfile
# WhiteRabbit dist (Java) for data_transformation's white_rabbit_plugin.
# Standalone stage, deliberately NOT part of the heavy-env FROM lineage, so
# BuildKit pulls it concurrently and only the copied layer reaches the final
# image. Pinned by digest: :master is a floating tag on a package last
# published ~Jan 2025, and the plugin depends on d2e-only patches
# (rabbitInAHat --generateWordReport) that upstream OHDSI/WhiteRabbit lacks.
FROM ghcr.io/data2evidence/whiterabbit@sha256:bfebf252d3c69d1c9e5b195964f85732d539c23e68760e2c3d492a4a0265d124 AS whiterabbit_base

```

- [ ] **Step 2: Copy the dist in the final stage**

In the final stage (`FROM env-data-transformation`, currently line 121), immediately after:

```dockerfile
COPY plugins/flows/drivers /app/inst/drivers/
```

add:

```dockerfile
# white_rabbit_plugin resolves /app/whiterabbit (white_rabbit_plugin/types.py).
# csvfiles is the working dir CSV scans download into and WhiteRabbit writes
# ScanReport.xlsx into. No chown needed: this image has no USER directive.
COPY --from=whiterabbit_base /dist /app/whiterabbit/dist
RUN mkdir -p /app/whiterabbit/csvfiles
```

Placement in the **final** stage, not in `env-data-transformation`, keeps the expensive
data_transformation provisioning layer's cache key untouched.

- [ ] **Step 3: Verify the digest resolves before building**

Run:
```bash
docker manifest inspect ghcr.io/data2evidence/whiterabbit@sha256:bfebf252d3c69d1c9e5b195964f85732d539c23e68760e2c3d492a4a0265d124
```
Expected: a manifest JSON listing a `linux/amd64` platform.

If this fails with a "manifest unknown" or auth error, **stop and report** — the fallback is the
floating `:master` tag, but confirm with the team before switching, since the digest pin was a
deliberate decision.

- [ ] **Step 4: Build the worker image**

Run:
```bash
docker build -f services/alp-dataflow-gen-worker/Dockerfile -t alp-dataflow-gen-worker:wr-test .
```
Expected: build succeeds. This is a long build (heavy R/pixi stages); expect tens of minutes on a
cold cache.

- [ ] **Step 5: Verify the layout inside the built image**

Run:
```bash
docker run --rm alp-dataflow-gen-worker:wr-test ls /app/whiterabbit/dist/bin
```
Expected: includes `whiteRabbit` and `rabbitInAHat`.

Run:
```bash
docker run --rm alp-dataflow-gen-worker:wr-test ls -d /app/whiterabbit/csvfiles
```
Expected: `/app/whiterabbit/csvfiles`

- [ ] **Step 6: Commit**

```bash
git add services/alp-dataflow-gen-worker/Dockerfile
git commit -m "fix(dataflow-worker): restore the WhiteRabbit dist in the worker image"
```

---

## Task 13: End-to-end verification

**Files:** none — verification only.

Requires a docker host. This cannot be run from inside the agent sandbox (no docker CLI, no
`/var/run/docker.sock`).

- [ ] **Step 1: Restart the worker**

The worker exited (code 1, not OOM) at `2026-08-17T05:00:53Z` with
`RuntimeError: Service exceeded error threshold` / `provision-envs: deployment poll failed
(HTTP 500)`. That is a **separate** Prefect deployment-poll defect; do not assume this work fixes it.

Run: `docker start alp-dataflow-gen-worker`
Expected: container running. Confirm with `docker ps | grep dataflow-gen-worker`.

- [ ] **Step 2: Confirm the dist is present in the running worker**

Run: `docker exec alp-dataflow-gen-worker ls /app/whiterabbit/dist/bin`
Expected: includes `whiteRabbit` and `rabbitInAHat`.

- [ ] **Step 3: Run a CSV scan through the portal**

Navigate to `https://localhost:41100/d2e/portal/systemadmin/etl` (admin / `Updatepassword12345`).

Admin Portal → ETL → add a White Rabbit node → *Configure White Rabbit* → *Scan data* → choose
**CSV files** → upload `plugins/ui/apps/mapping/sampleCSV/healthcare_dataset.csv` →
**SCAN TABLES** → select the file → **APPLY**.

Expected: the progress dialog advances and reaches a terminal state (not stuck on "Pending").

- [ ] **Step 4: Confirm the flow run succeeded**

Run: `docker logs alp-dataflow-gen-worker --since 5m | grep -E "Run white rabbit|FileNotFound|RuntimeError"`
Expected: the flow run completes; no `FileNotFoundError`, no `Finished in state Failed`.

- [ ] **Step 5: Verify the CSV cleanup fix (the second-scan trap)**

Run a **second** scan on a **different** White Rabbit node with a different CSV file.

Expected: the second scan's report contains only the second node's table. Before Task 7 this
would have included the first scan's table too.

Confirm in the logs:
Run: `docker logs alp-dataflow-gen-worker --since 5m | grep "stale CSV"`
Expected: a line like `Removed 1 stale CSV file(s) from /app/whiterabbit/csvfiles`.

- [ ] **Step 6: Verify Fix E — the user can escape a stalled scan**

This exercises the exact hang the notes reported, without breaking the image.

```bash
docker stop alp-dataflow-gen-worker
```

Start a scan from the portal. The flow run is created but never picked up, so Prefect reports
`Pending`/`Scheduled` indefinitely.

Expected: the **Back** button is enabled and closes the dialog. Before Task 11 all three buttons
were disabled and only a page reload escaped.

Then restore the worker:
```bash
docker start alp-dataflow-gen-worker
```

- [ ] **Step 7: Record the results**

Note in the PR description: whether the scan completed, the second-scan cleanup result, and the
Back-button behaviour with the worker stopped.

---

## Task 14: Ship the branch

- [ ] **Step 1: Commit the spec and this plan**

```bash
git add trex/specs/2026-08-17-whiterabbit-dist-restore-design.md trex/plans/2026-08-17-whiterabbit-scan-restore.md
git commit -m "plan: restore White Rabbit scans"
```

- [ ] **Step 2: Confirm the full test suite passes**

Run:
```bash
cd plugins/flows/data_transformation && pixi run python -m pytest white_rabbit_plugin/tests/ -v
```
Expected: 7 passed.

Run:
```bash
cd plugins/ui/apps/flow && bunx vitest run
```
Expected: all green.

- [ ] **Step 3: Review the full diff**

Run: `git diff develop... --stat`
Expected: only these files —
`services/alp-dataflow-gen-worker/Dockerfile`,
`plugins/functions/white-rabbit/src/scan-data/scan-data.router.ts`,
`plugins/flows/data_transformation/pyproject.toml`,
`plugins/flows/data_transformation/pixi.lock`,
`plugins/flows/data_transformation/white_rabbit_plugin/{paths.py,tasks.py}`,
`plugins/flows/data_transformation/white_rabbit_plugin/tests/*`,
`plugins/ui/apps/flow/{package.json,vitest.config.ts}`,
`plugins/ui/apps/flow/src/features/flow/utils/scan-progress-state{.ts,.test.ts}`,
`plugins/ui/apps/flow/src/components/Dialog/ScanProgressDialog/ScanProgressDialog.tsx`,
`trex/specs/…`, `trex/plans/…`.

- [ ] **Step 4: Open the PR**

The description must state:

1. **What broke and when** — `a96fde35` (18 Jul 2026) deleted the plugin Dockerfile that copied
   the dist; scans have been broken on `develop` since.
2. **The accepted architectural trade-off** — Fix A re-couples a flow-plugin asset to the worker
   image, which the pixi migration explicitly decoupled ("installing or updating a flow plugin
   never requires rebuilding this image"). This is knowingly temporary; migration plan Task 3.1
   (publish the dist from `data2evidence/d2e-WhiteRabbit`, fetch it in `setup_assets.sh`)
   supersedes it and should delete the `whiterabbit_base` stage.
3. **The correction to the original triage** — the infinite spinner was *not* caused by
   `scan-data.router.ts`; the progress dialog polls `jobplugins/white-rabbit/results/:id` and
   swallowed its own errors client-side. Both were fixed.
4. **Known follow-ups not in this PR** — the `/app/downloads` regression in
   `dataflow_ui_plugin/nodeutils/csvutils.py`, the legacy `apps/mapping` copy of
   ScanProgressDialog, and the separate Prefect deployment-poll worker crash.

---

## Self-Review

**Spec coverage.** Every section of `2026-08-17-whiterabbit-dist-restore-design.md` maps to a
task: §3.1 → Task 12; §3.2 → Tasks 3-5; §3.3 → Task 1; §8.1 → Tasks 2-7; §8.3/§8.4 → Task 13.
Two spec statements are **superseded by this plan** and must be corrected when the spec is next
touched: §6's claim that Fix D makes the dialog reach a terminal state, and §8.4's "negative test
for Fix D" — both rest on the endpoint confusion documented above. The spec also lists the shared
`csvfiles` directory as a non-goal; this plan promotes it to Tasks 6-7.

**Placeholder scan.** No TBD/TODO. Every code step contains complete code. Every command has an
expected result.

**Type consistency.** `classifyFlowState` returns `{terminal, failed, progress}` in Task 10 and
is destructured with exactly those names in Task 11. `MAX_CONSECUTIVE_POLL_ERRORS` is exported in
Task 10 and imported in Task 11. `ensure_whiterabbit_dirs(dir_path, csv_dir)`,
`require_whiterabbit_dist(bin_path)`, and `clear_csv_working_dir(csv_dir)` are defined in Task 4
and called with matching arity in Tasks 5 and 7. `clear_csv_working_dir` returns an `int` in
Task 4 and is used as a count in both Task 6's assertion and Task 7's log line.

## Open items requiring team input

1. **Task 12 Step 3** — if the pinned digest does not resolve, confirm whether to fall back to
   the floating `:master` tag.
2. **`/app/downloads`** — confirm the recommendation to file it separately (see Scope decisions).
3. **CI coverage** — this plan adds test runners but wires neither into CI. The flow app's Vitest
   suite has no workflow (`apps/concept-mapping` and `apps/jobs` tests are also un-CI'd), and
   `data_transformation`'s pytest suite has no workflow either. Adding both is a small, separate
   change; confirm whether it belongs here.
