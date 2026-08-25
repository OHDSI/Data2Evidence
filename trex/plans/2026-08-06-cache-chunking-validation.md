# Cache Chunking Validation and Merge — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Take the implemented Option B change (distribution-aware chunks, chunk-level resume, `freshCopy`) from a green local branch to a merged, real-source-validated fix for issue #3033.

**Architecture:** The build is done — this plan closes the three gaps that local DuckDB tests cannot close: the BigQuery cost guard that lives in shared DAO code, per-chunk scan observability, and end-to-end validation against a real Postgres and a real BigQuery source over the Trex pgwire path.

**Tech Stack:** Python 3.12, Prefect 3.6.10, DuckDB 1.4.0 over Trex pgwire (psycopg2), SQLAlchemy 2.0.38 + `sqlalchemy-bigquery` 1.14.1, pytest 9.0.3.

**Predecessor plan:** `trex/plans/2026-08-06-cache-chunking-resume.md` (all 17 tasks complete)
**Spec:** `trex/specs/2026-08-06-cache-chunk-resume-design.md`
**Issue:** https://github.com/OHDSI/Data2Evidence/issues/3033

---

## What is already done

Do not redo any of this. Read it before starting.

| Area | State |
|---|---|
| Pure planner (`chunk_utils.py`) | Row-count-derived count, capped at `max_chunks`; quantile boundaries; half-open predicates; explicit NULL chunk; `plan_id` hashed over the executed predicates |
| Guards | Degenerate plan (`interval_count < 2`), oversized NULL chunk (`> 3 × target`), oversized chunks (`> 5 × planned_chunk_rows`) all raise `PlannerError` |
| Adapters (`source_stats.py`) | BigQuery `__TABLES__` + `APPROX_QUANTILES`; Postgres `reltuples` with exact confirmation near the threshold; chunk-column priority partition → cluster → PK → mapped id, restricted to copied columns |
| Checkpointing (`checkpoint.py`) | `chunks_completed` high-water mark, `plan_id`, legacy-shape migration, `reset_table`, `clear_resume_point` |
| `freshCopy` | Discards non-`COMPLETE` tables only, once per `(flow_run_id, target_schema)`, `dryRun`-safe |
| Failure model | No error path drops the target; per-chunk timeout + retries; reconciliation before `COMPLETE` |
| Tests | 237 passing, prefect-free, in 3.6s |

**Baseline verification command** (run this first, every task assumes it is green):

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -q
```
Expected: `237 passed`

---

## What remains

Three things, in dependency order. Tasks 1–2 are code and can be done now. Tasks 3–5 need infrastructure access and are the release gate.

| Gap | Why it is still open |
|---|---|
| `maximum_bytes_billed` (spec AC11) | Requires touching `_shared_flow_utils/dao/daobase.py`, shared with every other BigQuery flow — a scope call nobody has made |
| `total_bytes_processed` per chunk (spec AC14) | The DuckDB BigQuery extension surfaces no job statistics; must come from BigQuery job history |
| Real-source validation (spec AC12, AC13) | Local DuckDB cannot exercise the psycopg2/pgwire path, BigQuery scan pruning, or a 900M-row copy |

---

## File structure

**Create**

| Path | Responsibility |
|---|---|
| `plugins/flows/base/create_cachedb_file_plugin/bq_job_stats.py` | Read `total_bytes_processed` from BigQuery job history for a time window; no prefect import |
| `plugins/flows/base/create_cachedb_file_plugin/tests/test_bq_job_stats.py` | Golden-string tests for its SQL |
| `trex/validation/2026-08-06-issue-3033-canary.md` | Filled-in canary results, committed as the release-gate evidence |

**Modify**

| Path | Change |
|---|---|
| `plugins/flows/_shared_flow_utils/dao/daobase.py` | Optional `maximum_bytes_billed` in the BigQuery SQLAlchemy connect args (Task 1) |
| `plugins/flows/base/create_cachedb_file_plugin/source_stats.py` | Pass the cap into planner queries (Task 1) |
| `plugins/flows/base/create_cachedb_file_plugin/copy.py` | Emit the post-table BigQuery bytes summary (Task 2) |
| `plugins/functions/alp-dataflow-gen-init/src/env.ts` + the four `CACHE_TASK_TIMEOUT` mirrors | `CACHE_MAX_BYTES_BILLED` (Task 1) |

**Import discipline (unchanged, load-bearing):** `errors.py`, `planner_types.py`, `chunk_utils.py`, `source_stats.py`, `checkpoint.py` and the new `bq_job_stats.py` must never import `prefect`. A test already enforces this — extend it in Task 2.

---

## Task 1: BigQuery cost guard (`maximum_bytes_billed`)

Spec AC11's second clause. Planner queries currently run uncapped: a misconfigured dataset could bill an unbounded scan before any guard fires.

**Files:**
- Modify: `plugins/flows/_shared_flow_utils/dao/daobase.py` (the `SupportedDatabaseDialects.BIGQUERY` arm of `create_sqlalchemy_connection_url`, ~line 279)
- Modify: `plugins/flows/base/create_cachedb_file_plugin/source_stats.py`
- Modify: `plugins/functions/alp-dataflow-gen-init/src/env.ts`, `docker-compose.yml`, `plugins/functions/package.json`, `plugins/functions/package.org.json`, `charts/d2e-services/templates/d2e-deployment.yaml`
- Test: `plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapter_sql.py`

**Scope decision to confirm before starting:** `create_sqlalchemy_connection_url` is shared with every BigQuery-reading flow. Make the cap **opt-in and default-off** so no other flow changes behaviour — a new keyword argument that only this plugin passes. Do not make it unconditional.

- [ ] **Step 1: Write the failing test**

In `tests/test_source_adapter_sql.py`:

```python
def test_bq_query_options_carry_the_byte_cap_when_configured():
    from create_cachedb_file_plugin.source_stats import bq_job_config

    assert bq_job_config(None) == {}
    assert bq_job_config(0) == {}
    assert bq_job_config(5_000_000_000) == {"maximum_bytes_billed": 5_000_000_000}


def test_bq_byte_cap_rejects_negative_values():
    import pytest

    from create_cachedb_file_plugin.errors import PlannerError
    from create_cachedb_file_plugin.source_stats import bq_job_config

    with pytest.raises(PlannerError):
        bq_job_config(-1)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapter_sql.py -k byte_cap -v
```
Expected: FAIL — `ImportError: cannot import name 'bq_job_config'`

- [ ] **Step 3: Add the helper to `source_stats.py`**

```python
def bq_job_config(maximum_bytes_billed: int | None) -> dict:
    """Job options for a BigQuery planner query.

    Returns an empty dict when unset or zero, so the cap is strictly opt-in and
    other flows sharing the DAO are unaffected.
    """
    if maximum_bytes_billed is None or maximum_bytes_billed == 0:
        return {}
    if maximum_bytes_billed < 0:
        raise PlannerError(
            f"maximum_bytes_billed must be positive or zero, got {maximum_bytes_billed}"
        )
    return {"maximum_bytes_billed": maximum_bytes_billed}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_source_adapter_sql.py -k byte_cap -v
```
Expected: 2 passed

- [ ] **Step 5: Thread it through the DAO**

In `daobase.py`, add a keyword-only parameter `maximum_bytes_billed: int | None = None` to `create_sqlalchemy_connection_url`. In the BigQuery arm only, when it is set, add it to the returned `connect_args` so `sqlalchemy-bigquery` applies it as a default job config. Leave every other dialect arm byte-identical. Confirm no existing caller passes it:

```bash
grep -rn "create_sqlalchemy_connection_url" plugins/flows/ | grep -v node_modules
```

- [ ] **Step 6: Seed the environment variable**

Add `cache_max_bytes_billed: _env.CACHE_MAX_BYTES_BILLED || "0", // 0 disables the cap` to `env.ts` beside `cache_chunk_timeout`, and mirror `CACHE_MAX_BYTES_BILLED` (default `0`) at the four locations that already carry `CACHE_CHUNK_TIMEOUT`:

```bash
grep -rn "CACHE_CHUNK_TIMEOUT" --include=*.yml --include=*.yaml --include=*.json --include=*.ts . | grep -v node_modules
```
Expected: 5 hits. Add a sibling at each, matching that file's own syntax.

- [ ] **Step 7: Run the full suite and commit**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -q
cd "$(git rev-parse --show-toplevel)"
git add plugins/flows/_shared_flow_utils/dao/daobase.py \
        plugins/flows/base/create_cachedb_file_plugin/source_stats.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/test_source_adapter_sql.py \
        plugins/functions/alp-dataflow-gen-init/src/env.ts \
        docker-compose.yml plugins/functions/package.json \
        plugins/functions/package.org.json \
        charts/d2e-services/templates/d2e-deployment.yaml
git commit -m "feat: cap bytes billed on BigQuery planner queries"
```
Expected: `239 passed`

---

## Task 2: Per-chunk BigQuery scan accounting

Spec AC14's third clause. Rows copied and elapsed time are already logged per chunk; `total_bytes_processed` is not, because the DuckDB BigQuery extension exposes no job statistics. Read it from BigQuery's own job history after the table finishes.

**Files:**
- Create: `plugins/flows/base/create_cachedb_file_plugin/bq_job_stats.py`
- Create: `plugins/flows/base/create_cachedb_file_plugin/tests/test_bq_job_stats.py`
- Modify: `plugins/flows/base/create_cachedb_file_plugin/copy.py`
- Modify: `plugins/flows/base/create_cachedb_file_plugin/tests/test_chunk_planner.py` (import-discipline test)

- [ ] **Step 1: Write the failing test**

`tests/test_bq_job_stats.py`:

```python
import pytest

from create_cachedb_file_plugin.bq_job_stats import bytes_billed_since_sql
from create_cachedb_file_plugin.errors import PlannerError


def test_job_history_query_is_scoped_to_the_region_and_window():
    sql = bytes_billed_since_sql("EU", "2026-08-06T10:00:00", "measurement")
    assert "`region-EU`.INFORMATION_SCHEMA.JOBS_BY_PROJECT" in sql
    assert "creation_time >= TIMESTAMP('2026-08-06T10:00:00')" in sql
    assert "measurement" in sql
    assert "SUM(total_bytes_processed)" in sql


def test_region_is_validated():
    with pytest.raises(PlannerError):
        bytes_billed_since_sql("EU`; DROP --", "2026-08-06T10:00:00", "measurement")


def test_bq_job_stats_does_not_import_prefect():
    import sys

    import create_cachedb_file_plugin.bq_job_stats  # noqa: F401

    assert not any(name == "prefect" or name.startswith("prefect.") for name in sys.modules)
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_bq_job_stats.py -v
```
Expected: FAIL — `ModuleNotFoundError: No module named 'create_cachedb_file_plugin.bq_job_stats'`

- [ ] **Step 3: Write `bq_job_stats.py`**

```python
"""Read BigQuery scan cost from job history. Must never import prefect.

The copy reads BigQuery through the DuckDB bigquery extension, which surfaces
no job statistics, so per-chunk bytes cannot be observed inline. Instead we ask
BigQuery afterwards what it billed for the jobs this table's copy produced.
"""

import re

from .errors import PlannerError

_REGION = re.compile(r"^[A-Za-z0-9-]+$")
_TIMESTAMP = re.compile(r"^[0-9T:\-\.]+$")


def bytes_billed_since_sql(region: str, since_iso: str, table: str) -> str:
    if not _REGION.match(region or ""):
        raise PlannerError(f"Unsafe BigQuery region for SQL generation: {region!r}")
    if not _TIMESTAMP.match(since_iso or ""):
        raise PlannerError(f"Unsafe timestamp for SQL generation: {since_iso!r}")
    if not re.match(r"^[A-Za-z_][A-Za-z0-9_$]*$", table or ""):
        raise PlannerError(f"Unsafe table name for SQL generation: {table!r}")
    return (
        "SELECT SUM(total_bytes_processed) AS total_bytes_processed, "
        "COUNT(*) AS job_count "
        f"FROM `region-{region}`.INFORMATION_SCHEMA.JOBS_BY_PROJECT "
        f"WHERE creation_time >= TIMESTAMP('{since_iso}') "
        "AND job_type = 'QUERY' AND state = 'DONE' "
        f"AND STRPOS(IFNULL(query, ''), '{table}') > 0"
    )
```

- [ ] **Step 4: Run test to verify it passes**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/test_bq_job_stats.py -v
```
Expected: 3 passed

- [ ] **Step 5: Call it after each BigQuery table and extend the discipline test**

In `copy.py`, in `copy_table_task`, after reconciliation succeeds and only when the source dialect is BigQuery and the copy was not a dry run, query the job history for the window starting when the table's copy began and log a single summary line: table name, chunk count, total bytes processed, and bytes per chunk. Wrap it so a failure logs a warning and never fails an otherwise-successful copy — this is observability, not correctness.

In `tests/test_chunk_planner.py`, add `create_cachedb_file_plugin.bq_job_stats` to the existing `test_planner_modules_do_not_drag_in_prefect`.

- [ ] **Step 6: Run the suite, parse-check, commit**

```bash
cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -q
cd "$(git rev-parse --show-toplevel)"
python3 -c "import ast; ast.parse(open('plugins/flows/base/create_cachedb_file_plugin/copy.py').read()); print('parsed')"
git add plugins/flows/base/create_cachedb_file_plugin/bq_job_stats.py \
        plugins/flows/base/create_cachedb_file_plugin/copy.py \
        plugins/flows/base/create_cachedb_file_plugin/tests/
git commit -m "feat: report BigQuery bytes processed per copied table"
```
Expected: `242 passed`, then `parsed`

---

## Task 3: PostgreSQL validation against a real source (spec AC13)

The first task that leaves local DuckDB. This exercises the psycopg2/Trex-pgwire write path, which **no test has touched**.

**Files:** none — this is an execution-and-record task.

- [ ] **Step 1: Baseline the pre-change behaviour**

On a deployment still running the old code, run a full cache build for the `alpdev_pg` demo dataset and record per-table row counts:

```sql
SELECT table_name, (SELECT COUNT(*) FROM cachedb.cdmdefault.<table>) FROM ...
```
Capture the list into `trex/validation/2026-08-06-issue-3033-canary.md` under "Postgres baseline".

- [ ] **Step 2: Run a dry run on the new code**

Trigger the flow with `{"databaseCode": "alpdev_pg", "schemaName": "cdmdefault", "dryRun": true}`. Confirm from the logs: a plan line per table naming the chosen column and its kind, no target tables created, no index creation attempted, and a closing summary of how many tables planned cleanly. This specifically regression-tests the dry-run fix — before it, `copy_indexes` crashed on the first Postgres table.

- [ ] **Step 3: Run the real copy**

Trigger without `dryRun`. Confirm every table reconciles and per-table row counts match the Step 1 baseline exactly.

- [ ] **Step 4: Exercise resume**

Kill the flow mid-copy on the largest table. Inspect the checkpoint:

```sql
SELECT table_name, status, chunks_completed, chunks_total FROM cachedb.cdmdefault.table_copy_status;
```
Confirm the target table still exists with its partial rows (the old code dropped it). Rerun; confirm the log shows `Resuming '<table>' at chunk N/M`, that N is within one of the killed position, and that the final count matches the baseline.

- [ ] **Step 5: Exercise `freshCopy`**

With one table left `FAILED`, rerun with `{"freshCopy": true}`. Confirm the log names exactly the non-`COMPLETE` tables and the row counts discarded, that `COMPLETE` tables are untouched, and that the final counts still match. Then force a Prefect retry of `create_schema_tables_task` during a `freshCopy` run and confirm the second attempt **resumes** rather than wiping — the once-per-`(flow_run_id, target_schema)` guarantee is the subtlest thing in this change and this is the only place it is tested for real.

- [ ] **Step 6: Record and commit**

Fill in the Postgres section of `trex/validation/2026-08-06-issue-3033-canary.md`.

```bash
git add trex/validation/2026-08-06-issue-3033-canary.md
git commit -m "docs: record Postgres validation for the chunked cache copy"
```

---

## Task 4: BigQuery canary — the release gate (spec AC12)

**This gate decides whether the design holds.** The open question the spec flags: chunk predicates are evaluated by DuckDB against an ATTACHed BigQuery table, and whether that becomes a *pruned* Storage Read depends on the extension pushing the filter down and on the table's physical layout. If it does not prune, 180 chunks over a 900M-row table means 180 full reads.

**Files:** `trex/validation/2026-08-06-issue-3033-canary.md`

- [ ] **Step 1: Record the table's physical layout**

```sql
SELECT ddl FROM `<dataset>.INFORMATION_SCHEMA.TABLES` WHERE table_name = '<table>';
SELECT column_name, is_partitioning_column, clustering_ordinal_position, is_nullable
FROM `<dataset>.INFORMATION_SCHEMA.COLUMNS` WHERE table_name = '<table>'
ORDER BY ordinal_position;
```
Record whether the table is partitioned or clustered and on what.

- [ ] **Step 2: Dry run and check the chosen column**

Trigger with `{"dryRun": true}`. Record the plan line: chosen column, its kind, chunk count, estimated rows per chunk. Confirm the priority rule behaved — a partition column should be chosen over the surrogate id. **If the planner raises `PlannerError` here, that is a correct outcome, not a failure:** it means the chosen column is too low-cardinality or too NULL-heavy to chunk safely, and the fix is to pick a different column, not to weaken the guard. Record the message verbatim.

- [ ] **Step 3: Run the full copy of the >900M-row table**

Record wall clock, chunk count, whether it completed inside the per-chunk timeout, and whether reconciliation passed.

- [ ] **Step 4: The pruning verdict**

From the Task 2 summary line and BigQuery job history, compare bytes processed per chunk against the table's full size:

```sql
SELECT SUM(size_bytes) FROM `<dataset>.__TABLES__` WHERE table_id = '<table>';
```

- **Per-chunk bytes ≈ total/chunk_count** → predicates prune. Record PASS.
- **Per-chunk bytes ≈ total** → predicates do **not** prune. Record FAIL and apply the spec's §7 mitigation: raise `chunkSize` for that table so the chunk count — and so the number of repeated scans — drops, trading restart granularity for cost. Re-measure and record both numbers.

- [ ] **Step 5: Confirm convergence**

The original failure was non-convergence, not slowness. Kill the copy of the 900M-row table partway and rerun. Confirm it resumes rather than restarting at chunk 0. This is the single most important observation in the whole validation — it is the behaviour the issue is actually about.

- [ ] **Step 6: Record and commit**

```bash
git add trex/validation/2026-08-06-issue-3033-canary.md
git commit -m "docs: record BigQuery canary results for the chunked cache copy"
```

---

## Task 5: Open the pull request

**Files:** none.

- [ ] **Step 1: Confirm the branch is green and clean**

```bash
cd plugins/flows/base && PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -q
cd "$(git rev-parse --show-toplevel)" && git status --short
```
Expected: all tests pass, no output from `git status`.

- [ ] **Step 2: Confirm no unbounded copy survives**

```bash
grep -rn "CREATE OR REPLACE TABLE\|determine_chunk_size" plugins/flows/base/create_cachedb_file_plugin/*.py
```
Expected: no hits. The only whole-table `CREATE TABLE … AS SELECT` left is in the `SINGLE_STATEMENT` branch, which `plan_chunks` reaches only below `small_table_threshold`.

- [ ] **Step 3: Rebase onto current develop and re-run**

`develop` has moved since this branch started. Rebase, resolve, and re-run the suite before pushing.

- [ ] **Step 4: Push and open the PR**

The PR body should carry: the issue link, the root cause in two sentences (span-derived chunk count → 3.7e12 predicates → planner OOM), the three coupled defects fixed, the `freshCopy` semantics including the once-per-run guarantee, and the canary results from Task 4. Reference `trex/specs/2026-08-06-cache-chunk-resume-design.md` and both plan files, which ship on the branch.

Branch naming and commit hygiene: no AI/assistant attribution anywhere in commits, branch name, PR title or body.

- [ ] **Step 5: Flag the deferred decisions in the PR description**

Carry forward the spec's §13 decisions so reviewers see them rather than discovering them: D1 (fail-fast when no chunk column exists), D2 (a `PlannerError` aborts the schema), D3 (BigQuery `target_chunk_rows` stays 5,000,000), D4 (reconciliation reads `__TABLES__`, which is eventually consistent for streaming inserts), D5 (`freshCopy` spares `COMPLETE` tables).

---

## Verification summary

| Spec AC | Covered by |
|---|---|
| 1–10 | Already green — 237 tests on the branch |
| 11 — bytes-billed cap | Task 1 |
| 12 — BigQuery canary | Task 4 |
| 13 — Postgres regression | Task 3 |
| 14 — per-chunk logging | Rows and elapsed already done; bytes processed in Task 2 |

## Self-review notes

- **Spec coverage.** Every acceptance criterion maps to a task or is already green. The three gaps named in the predecessor plan's "Open items" section (§`maximum_bytes_billed`, D4 reconciliation source, CI invocation) are addressed by Task 1, Task 5 Step 5, and — for CI — noted below as the one genuine remaining unknown.
- **Type consistency.** `bq_job_config` and `bytes_billed_since_sql` are the only new symbols; both are defined here and referenced only in the tasks that define them.
- **Known unknown, not a placeholder.** `.github/workflows/plugin-ci.yml` is a stub on this branch, so nobody has been able to confirm how the real workflow runs Python plugin tests. Whoever has access to the release-branch workflow should add `create_cachedb_file_plugin/tests/` to it; the suite is self-contained and needs only `pytest`, `duckdb` and `pydantic`.

## Execution handoff

1. **Subagent-Driven (recommended)** for Tasks 1–2, which are ordinary code.
2. Tasks 3–5 need real infrastructure and credentials and cannot run from this sandbox — they need a human with deployment access.
