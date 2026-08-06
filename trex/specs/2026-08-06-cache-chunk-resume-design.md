# Cache creation — distribution-aware chunk planning, chunk-level resume, and fresh-copy override

- **Date:** 2026-08-06
- **Issue:** https://github.com/OHDSI/Data2Evidence/issues/3033
- **Component:** `plugins/flows/base/create_cachedb_file_plugin`
- **Selected approach:** Option B (distribution-aware chunks + chunk-level resume), plus an
  operator-controlled fresh-copy override
- **Status:** design agreed, not implemented

---

## 1. Problem

`plan_chunks()` in `chunk_utils.py` derives the number of chunks from the **span of the chunk
column**, not from the row count:

```
current = min_val
while current <= max_val:
    end = min(current + chunk_size - 1, max_val)
    chunks.append(f'"{chunk_col}" BETWEEN {current} AND {end}')
    current = end + 1
```

`len(chunks) == ceil((max_val - min_val + 1) / chunk_size)`. `row_count` is passed into the
function but used only for a post-hoc validation at lines 67-71. With BigQuery's fixed
`chunk_size = 5_000_000` and a hash-generated `INT64` surrogate key, the span approaches the full
`INT64` range, giving on the order of `3.7e12` loop iterations, each appending a predicate string.
The worker exhausts memory **inside the planner, before any row is copied**.

Three coupled defects must be fixed at the same time, because the chosen approach removes the
escape hatch the current code depends on:

1. **The density guard cannot detect this failure.** It trips when
   `row_count / len(chunks) > 2 * chunk_size` — chunks that are too *dense*. Sparsity makes that
   ratio smaller, so the guard is silent in exactly the failing case.
2. **Every `plan_chunks` failure routes to an unbounded whole-table copy.** `copy.py:340-344`
   falls back to `CREATE OR REPLACE TABLE … AS <select>`. Three paths reach it: a missing
   `CHUNK_COLUMN_MAP` entry, the `int()` cast bail at `chunk_utils.py:49-54` (any date or string
   chunk column), and the density guard. The team has ruled this fallback out after it failed on a
   BigQuery table above ~900M rows.
3. **Progress is checkpointed per table, not per chunk.** `cleanup()` (`copy.py:67-74`) drops the
   target table on failure; `retries=3` sits on `create_schema_tables_task`, whose
   `timeout_seconds` (`cache_task_timeout`, default 10800s) covers the *entire schema loop*. A
   table that cannot finish inside one attempt restarts from chunk 0 on every retry and never
   converges.

Once resume exists, operators need a way to **deliberately discard** a resumable checkpoint —
when the previous failure left data they do not trust, or when a fix has landed and the partial
result is stale. That is the new `freshCopy` requirement, specified in §4.3.

### Verified constraints

- Source dialects for this plugin are exactly **Postgres and BigQuery** (`check_supported_dialects`
  in `utils.py`; the only `case` arms in `attach_to_source_db`). HANA has its own plugin; DuckDB is
  target-only.
- `use_trex_connection` is hardcoded `True` (`types.py:121-122`), so the write path is always Trex
  pgwire → DuckDB with the source `ATTACH`ed as `<database_code>__srcdb`. The
  `if not options.use_trex_connection:` branch in `flow.py` is unreachable.
- Planning queries run on a **separate direct SQLAlchemy connection to the source**
  (`read_conn.engine`), not through Trex. This design keeps that split.
- The status table is **ephemeral**: `drop_cache_status_table` removes it after a successful schema
  copy (`copy.py:268`). It exists only between a failure and the next run.
- **One flow run can copy two schemas.** `create_cachedb_file_plugin` calls `create_cache_flow`,
  then conditionally `create_results_cache_flow`, which re-enters `create_cache_flow` with a
  different `schema_name` / target schema inside the *same* Prefect flow run (`flow.py:26-31`,
  `43-48`). Any run-scoped state must be keyed accordingly.
- There is currently **no test package** for this plugin. `plugins/flows/` has `tests/` directories
  for `_shared_flow_utils`, `strategus_plugin`, `cohort_discovery_plugin`, and
  `dataflow_ui_plugin`, but not for `create_cachedb_file_plugin`.
- Toolchain (`plugins/flows/base/pyproject.toml`): Python 3.12, `duckdb==1.4.0`,
  `sqlalchemy==2.0.38`, `sqlalchemy-bigquery==1.14.1`, `google-cloud-bigquery==3.6.0`,
  `pytest==9.0.3` (dev group).

---

## 2. Goals

1. Chunk **count** is derived from row count and hard-capped, so the planner cannot allocate an
   unbounded list regardless of chunk-column distribution.
2. Chunk **size** is derived from the observed value distribution, so a bounded chunk count does
   not silently produce oversized chunks on skewed or sharded keys.
3. No code path performs an unbounded whole-table copy for a table at or above the small-table
   threshold.
4. A large table's copy **converges across retries**: work already done is not repeated.
5. An operator can **explicitly discard** a resumable checkpoint and start clean, without
   hand-editing the status table.
6. Every copied table is reconciled against the source row count before being marked complete.
7. BigQuery planning is scan-cost aware and observable.

---

## 3. Architecture

Four focused modules replace the current two-function arrangement.

```
copy.py                     orchestration: reset? -> plan -> checkpoint -> execute -> reconcile
  |
  +-- source_stats.py       dialect adapters; ALL source-side SQL lives here
  |     BigQuerySourceAdapter
  |     PostgresSourceAdapter
  |
  +-- chunk_utils.py        PURE planner: (ChunkStats, ChunkConfig) -> ChunkPlan
  |                         no database access, no I/O, fully unit-testable
  |
  +-- checkpoint.py         status tables, plan hashing, reset routine, fresh-copy arbitration
```

`chunk_utils.py` keeps its name — it is the file the issue names — but loses all I/O. Its only
responsibility becomes turning statistics into predicates.

### Connection roles

| Concern | Connection | Notes |
|---|---|---|
| Row counts, boundaries, column metadata | `read_conn.engine` (SQLAlchemy, direct to source) | Same as today |
| Chunk `DELETE`/`INSERT`, target DDL, resets | `write_conn` (psycopg2 → Trex pgwire → DuckDB) | Source attached as `<code>__srcdb` |
| Status tables | `write_conn` | Live in `<target_database>.<target_schema>` |

---

## 4. Interfaces and configuration semantics

### 4.1 `ChunkConfig`

| Field | Default | Meaning |
|---|---|---|
| `target_chunk_rows` | BigQuery 5_000_000; Postgres 1_000_000 | Desired rows per chunk |
| `max_chunks` | 2_000 | Hard cap on chunk count |
| `min_chunk_rows` | 100_000 | Floor; prevents thousands of tiny chunks |
| `small_table_threshold` | 500_000 | Below this, copy in one statement (existing behaviour) |
| `dry_run` | `false` | Plan and log only; execute and destroy nothing |

`copy_params.chunk_size` (`chunkSize`) continues to override `target_chunk_rows`. With
`max_chunks = 2000` and a 5M target, tables up to 10B rows chunk without raising chunk size.

### 4.2 Planner and adapter types

**`ChunkColumnCandidate`** — `name`, `kind` (`PARTITION` | `CLUSTER` | `PRIMARY_KEY` | `MAPPED_ID`),
`data_type`, `nullable`, `orderable`.

**`ChunkStats`** — `row_count`, `row_count_is_exact`, `column`, `boundaries` (ascending cut
values), `has_nulls`.

**`ChunkPlan`** — `plan_id` (hash), `strategy` (`SINGLE_STATEMENT` | `CHUNKED`), `column_name`,
`column_kind`, `predicates` (ordered SQL fragments), `estimated_rows_per_chunk`,
`includes_null_chunk`.

**`SourceAdapter`** protocol — the only dialect seam: `count_rows`, `count_rows_exact`,
`list_chunk_candidates`, `column_boundaries`, `quote_table`, `quote_column`.

### 4.3 `freshCopy` — the fresh-copy override

**Surface.** A new optional field on `CreateCacheOptions`, following the existing camelCase-alias
convention used by `chunkSize`:

```
fresh_copy: Optional[bool] = Field(default=False, alias="freshCopy")
```

It is threaded into `CopyParameters` alongside `chunk_size`. No UI or API change beyond accepting
the new key; omitting it preserves today's behaviour exactly.

**Semantics.** When `freshCopy` is true, then **once per (flow run, target schema)**, before any
planning:

- every table whose status is **not** `COMPLETE` has its target table dropped and its status row
  deleted;
- tables whose status **is** `COMPLETE` are left untouched — they were reconciled against the
  source, so re-copying them is pure waste;
- the reset is logged at WARNING with the list of tables discarded and the row count discarded per
  table (a cheap `COUNT(*)` on the local DuckDB target before dropping);
- copying then proceeds normally, re-planning each discarded table from scratch.

**Why "once per (flow run, target schema)" is load-bearing.** `create_schema_tables_task` carries
`retries=3`. If the reset ran on every task attempt, attempt 2 would destroy the progress attempt 1
made, and the parameter would silently undo the convergence property this whole design exists to
provide. So the reset is recorded and arbitrated, not re-evaluated. The key is composite because
one flow run can copy two schemas — the datamart schema and then the results schema — and each
needs its own reset (`flow.py:43-48`).

**Arbitration record.** A second ephemeral table alongside the status table:

```
copy_run_status (
  flow_run_id      TEXT,
  target_schema    TEXT,
  reset_applied_at TIMESTAMP,
  PRIMARY KEY (flow_run_id, target_schema)
)
```

If `freshCopy` is true and no row exists for `(flow_run_id, target_schema)`, perform the reset and
insert the row. On any retry the row exists and the reset is skipped. Both tables are dropped
together after a successful schema copy.

**Interaction with the automatic `plan_id` reset.** A table is *already* reset automatically when
its recomputed `plan_id` differs from the stored one — for example because the operator changed
`chunkSize`, or because the source row count moved enough to change the chunk count. `freshCopy` is
therefore not needed for configuration changes; it exists for the case where the plan is identical
but the partial data is not trusted. Both paths call the same reset routine.

**Interaction with `dryRun`.** `dryRun` wins. With both set, nothing is dropped; the log reports
which tables *would* be discarded and how many rows that represents.

**Relationship to the "no implicit drops" rule.** §8 forbids error paths from dropping target
tables, because implicit drops are what make retries non-convergent. `freshCopy` is an *explicit,
operator-requested, logged* drop, scoped to non-`COMPLETE` tables. That distinction is deliberate,
and this is the only sanctioned drop in the design.

---

## 5. Planning algorithm

Given `(schema, table, adapter, config)`:

1. `row_count, is_exact = adapter.count_rows(...)`.
2. If `row_count < config.small_table_threshold` → `strategy = SINGLE_STATEMENT`, done. This path
   is bounded by the threshold and remains permitted.
3. `candidates = adapter.list_chunk_candidates(...)`; take the first orderable candidate. If none →
   `PlannerError(NO_CHUNK_COLUMN)` (see Decision D1).
4. `n_desired = ceil(row_count / config.target_chunk_rows)`;
   `n = clamp(n_desired, 1, config.max_chunks)`; then lower `n` until
   `row_count / n >= config.min_chunk_rows` (never below 1). If `n < n_desired`, log the raised
   effective chunk size.
   **This is the fix for the reported defect: chunk count now derives from `row_count` and is
   capped, never from the column span.**
5. `raw = adapter.column_boundaries(column, n)` → up to `n + 1` quantile endpoints. Sort,
   deduplicate, drop the outer endpoints, yielding interior cut points `b_1 … b_k`, `k <= n - 1`.
   **This is the fix for skew: chunk size follows the value distribution, so a bounded chunk count
   cannot silently produce a 300M-row chunk on offset-sharded keys.**
6. Build half-open predicates:
   - `col < b_1`
   - `col >= b_i AND col < b_(i+1)` for `i = 1 … k-1`
   - `col >= b_k`
   - if `k == 0` (single distinct value or degenerate distribution) → one predicate `col IS NOT NULL`
7. If the column is nullable, append `col IS NULL`. Rows with a NULL chunk column are otherwise
   matched by no predicate and silently lost — the current `BETWEEN` formulation has this bug.
8. `plan_id = sha256(dialect, schema, table, column, n, boundaries, planner_version)`.

The density guard is **deleted**: tied boundaries collapse during deduplication, which is the
correct handling of a dense non-unique column, so the guard has nothing left to detect and is one
of the three routes to the banned fallback. The `int()` cast is **deleted**: any orderable type
participates, which is what allows a BigQuery partitioning date column to be the chunk column.

### Planner invariants (asserted in code and tests)

- `len(predicates) <= max_chunks + 1` (the `+1` is the NULL chunk).
- Predicates are pairwise disjoint.
- The union covers the column domain, including NULL.
- Planning performs no database access and allocates memory proportional to `n`, not to the span.

---

## 6. Data flow

### Per schema

1. Create the status table and `copy_run_status` if absent; run legacy-shape detection (§9).
2. If `freshCopy` and no arbitration row exists for `(flow_run_id, target_schema)` → reset all
   non-`COMPLETE` tables, insert the arbitration row, log what was discarded.
3. Determine tables to copy; filter out those already `COMPLETE`.
4. For each table, run the per-table flow below.
5. On success for all tables, drop both ephemeral tables.

### Per table

1. `mark_in_progress`.
2. `stats = adapter.collect(schema, table)`.
3. `plan = plan_chunks(stats, config)`.
4. `checkpoint = read_checkpoint(write_conn, table)`.
5. If `checkpoint.plan_id == plan.plan_id` → resume from `checkpoint.chunks_completed`; otherwise →
   reset this table, `chunks_completed = 0`, store the new `plan_id`.
6. Ensure the target exists: `CREATE TABLE IF NOT EXISTS … AS SELECT … WHERE 1=0`.
7. For `i` in `chunks_completed … len(predicates) - 1`:
   a. `DELETE FROM <target> WHERE <predicate_i>`
   b. `INSERT INTO <target> SELECT <cols> FROM <srcdb>.<schema>.<table> WHERE <predicate_i>`
   c. `UPDATE <status> SET chunks_completed = i + 1`
   d. log rows copied, elapsed, and on BigQuery `total_bytes_processed`
8. Reconcile the source count against the target `COUNT(*)`. Mismatch → `ReconciliationError`.
9. `mark_complete`.

Under `dryRun`, steps 6-9 and the per-schema step 2 reset are skipped; the plan and the would-be
reset are logged.

---

## 7. Dialect behaviour

### BigQuery

| Concern | Approach | Cost |
|---|---|---|
| Row count | `SELECT SUM(row_count) FROM \`<project>.<dataset>.__TABLES__\` WHERE table_id = '<table>'` | Free, no scan; exact for tables |
| Row count (views / external) | `COUNT(*)` with `maximum_bytes_billed` | One scan |
| Candidates | `INFORMATION_SCHEMA.COLUMNS`: `is_partitioning_column`, `clustering_ordinal_position`, `is_nullable`, `data_type` | Free |
| Boundaries | `SELECT APPROX_QUANTILES(<col>, <n>) FROM <table>` | One single-pass column scan |
| Reconciliation | `__TABLES__.row_count` (see Decision D4) | Free |

**Chunk-column priority: partitioning column → first clustering column → `CHUNK_COLUMN_MAP`
surrogate ID.** This is the scan-cost lever. Chunk predicates are evaluated by DuckDB against the
attached BigQuery table; whether they become a pruned Storage Read depends on the extension pushing
the filter down *and* on the table's physical layout. OMOP tables on BigQuery are conventionally
partitioned on dates and clustered on `person_id`, not on `measurement_id`, so chunking on the
surrogate ID risks one full read per chunk.

Planner queries carry `maximum_bytes_billed`; every chunk logs `total_bytes_processed`.

**Mitigation if pruning does not occur** (confirmed on the canary, AC12): raise `target_chunk_rows`
for that table so the chunk count — and therefore the number of repeated scans — drops. This trades
restart granularity for cost and is a configuration change, not a code change.

Replacing `COUNT(*)` with `__TABLES__` removes one billed scan; `APPROX_QUANTILES` adds one. Net
planning cost per large table is approximately unchanged.

### PostgreSQL

| Concern | Approach | Cost |
|---|---|---|
| Row count (planning) | `SELECT reltuples::bigint FROM pg_class WHERE oid = …::regclass` | Free estimate |
| Row count (exact, when the estimate is within 20% of `small_table_threshold`) | `COUNT(*)` | One scan |
| Candidates | single-column integer PK via `pg_index`/`pg_attribute`, then `CHUNK_COLUMN_MAP`; `attnotnull` for nullability | Free |
| Boundaries (fast path) | `pg_stats.histogram_bounds` when statistics are fresh and buckets suffice | Free |
| Boundaries (exact path) | `SELECT unnest(percentile_disc(<fractions>) WITHIN GROUP (ORDER BY col)) FROM <table>` | Ordered scan, index-only on the PK |
| Reconciliation | `COUNT(*)` | One scan |

Chunk-column priority: single-column integer primary key → `CHUNK_COLUMN_MAP`. Predicates on the PK
are index-backed, so each chunk is a cheap range scan. Postgres has no partition-pruning concern
equivalent to BigQuery's.

`freshCopy` behaves identically on both dialects — it only touches target-side state in DuckDB.

---

## 8. Failure, retry, and error handling

| Error | Trigger | Behaviour |
|---|---|---|
| `PlannerError` | No orderable chunk-column candidate; boundary query failed; row count unavailable | Table marked `FAILED`, target and checkpoint preserved, exception raised (Decision D2) |
| `ChunkCopyError` | A chunk `DELETE`/`INSERT` failed | Retry that chunk with exponential backoff, 3 attempts; on exhaustion mark `FAILED`, preserve target and checkpoint |
| `ReconciliationError` | Source count ≠ target count after all chunks | Mark `FAILED`, preserve the target for inspection, log the exact delta |
| `FreshCopyResetError` | The reset could not drop a target or write the arbitration row | Abort the schema copy before any planning; never proceed with a half-applied reset |

Rules holding for every path:

- **No error path drops the target table.** The `DROP TABLE` in `cleanup()` is removed; `cleanup`
  becomes "mark FAILED and preserve state". The only sanctioned drop is the explicit `freshCopy`
  reset (§4.3).
- **`timeout_seconds` moves off `create_schema_tables_task`** onto a per-chunk timeout plus a
  per-table budget, so one large table can no longer consume the whole schema's allowance and a
  timeout no longer discards completed chunks.
- **Prefect retries are safe by construction.** The task-level `retries=3` now resumes rather than
  restarts, and the `freshCopy` arbitration row guarantees the reset is not re-applied on retry.
- Errors log table, chunk index, predicate, and plan id, so failures are diagnosable from logs
  alone.

### Idempotency

Each chunk is `DELETE FROM <target> WHERE <predicate>` then
`INSERT INTO <target> SELECT … WHERE <predicate>`. DuckDB over pgwire autocommits per statement, so
the `DELETE`, the `INSERT`, and the counter update are three separate transactions. Both failure
windows are handled by construction:

- Crash **between `DELETE` and `INSERT`** → chunk `i` is empty; the rerun replays chunk `i`.
- Crash **between `INSERT` and the counter update** → chunk `i` is copied but recorded as
  incomplete; the rerun replays chunk `i`, and the leading `DELETE` removes the previous copy before
  reinserting. No duplicates.
- Predicates are pairwise disjoint, so chunk `i`'s `DELETE` never removes chunk `j`'s rows.
- The NULL chunk uses `col IS NULL` on both sides, symmetric with the value chunks.

Idempotency assumes a stable source for the duration of a copy. Concurrent source mutation is a
non-goal, partially mitigated by the `plan_id` restart rule.

### Checkpoint and resume semantics

`table_copy_status` gains four columns:

```
table_name       TEXT PRIMARY KEY
status           TEXT            -- IN_PROGRESS | COMPLETE | FAILED
started_at       TIMESTAMP
completed_at     TIMESTAMP
plan_id          TEXT            -- new
chunks_total     INTEGER         -- new
chunks_completed INTEGER         -- new: monotone high-water mark
rows_expected    BIGINT          -- new: source count captured at plan time
```

Chunks execute in plan order, so a single high-water mark suffices; no per-chunk bitmap. A `plan_id`
mismatch forces a full restart of that table, because mixing predicates from two plans could
duplicate or drop rows. `COMPLETE` is written only after reconciliation passes. Resume granularity
is one chunk.

---

## 9. Compatibility and migration

Because both ephemeral tables are dropped after a successful schema copy (`copy.py:268`), the only
compatibility case is state left behind by a **failed pre-upgrade run**.

Handling: on startup, inspect the status table's columns. If the new columns are absent, drop and
recreate it in the new shape and treat every table as not-started. This is safe — the old code
dropped target tables on failure, so there is no partial data worth preserving — and it is logged.
`copy_run_status` simply does not exist yet and is created. No versioned migration script and no
data migration are required.

Other compatibility notes:

- `freshCopy` defaults to `false`; omitting it reproduces today's behaviour. No breaking change to
  the flow's parameter contract.
- `chunkSize` keeps its meaning (overrides `target_chunk_rows`).
- The small-table path (`row_count < 500_000` → single `CREATE TABLE AS SELECT`) is unchanged, so
  the large majority of OMOP tables behave exactly as before.
- Caches produced before and after the change are identical in content; only the process differs.
- `CHUNK_COLUMN_MAP` in `filter.py` is retained as the lowest-priority candidate source; it is not
  re-derived here.
- `create_cdw_validation_config_plugin` shares `create_schema_tables_task` and therefore inherits
  the new behaviour; it does not expose `freshCopy`, which defaults to `false`.

---

## 10. Test approach

New package `plugins/flows/base/create_cachedb_file_plugin/tests/` with `__init__.py` and a
`README.md`, matching the layout of `cohort_discovery_plugin/tests`. `pytest==9.0.3` is already in
the `dev` dependency group.

**`test_chunk_planner.py` — pure, no database.** The centrepiece.

| Case | Assertion |
|---|---|
| Hash-uniform `INT64` across the full range | **Regression for #3033**: completes quickly, `len(predicates) <= max_chunks + 1`, bounded memory |
| Offset-sharded keys (clusters at 1e12 / 2e12 / 3e12) | No chunk's estimated rows exceeds 2× target |
| Dense sequential IDs | Chunk count ≈ `row_count / target` |
| Heavy ties on a non-unique column | Boundaries deduplicate; predicates stay disjoint |
| All-NULL / mixed-NULL column | NULL chunk present; NULL rows counted exactly once |
| Single distinct value | One `IS NOT NULL` predicate |
| Empty table, `row_count = 1` | No crash; `SINGLE_STATEMENT` |
| Either side of `small_table_threshold` | Correct strategy |
| `DATE` and `STRING` chunk columns | Planned, not rejected |
| `n_desired > max_chunks` | Clamped; effective chunk size logged |
| `min_chunk_rows` floor | `n` reduced accordingly |

**Property tests.** Generate synthetic distributions, materialise them in an in-memory DuckDB
table, evaluate every predicate, and assert that per-predicate counts sum exactly to the total
including NULLs. This mechanically proves disjointness and totality.

**`test_source_adapter_sql.py`.** Golden-string assertions on the SQL each adapter emits, per
dialect — so BigQuery SQL is covered in CI without credentials.

**`test_checkpoint.py`** (real local DuckDB file): plan-id match resumes; plan-id mismatch truncates
and restarts; a legacy-shape status table is detected and recreated; a simulated crash between
`INSERT` and the counter update replays exactly one chunk and still reconciles.

**`test_fresh_copy.py`** — dedicated, because the failure modes are subtle:

| Case | Assertion |
|---|---|
| `freshCopy=false` with a `FAILED` table | Resumes from `chunks_completed`; nothing dropped |
| `freshCopy=true` with a `FAILED` table | Target dropped, status row deleted, copy restarts at chunk 0 |
| `freshCopy=true` with a `COMPLETE` table | Table untouched and still skipped |
| **`freshCopy=true` across a task retry** | Reset applied exactly once; attempt 2 resumes attempt 1's progress rather than wiping it |
| `freshCopy=true` with datamart + results schemas in one flow run | Both schemas reset; one arbitration row each |
| `freshCopy=true` with `dryRun=true` | Nothing dropped; discard set reported |
| Reset fails mid-way | `FreshCopyResetError`; no planning or copying occurs |

**`test_copy_integration.py`.** ~2M synthetic rows with a deliberately sparse chunk column, copied
end to end and reconciled; a second run kills the copy mid-way and asserts resume correctness.
Postgres source via the existing CI database service if available, otherwise DuckDB-as-source
exercising the same orchestration.

**BigQuery.** No live CI test — CI has no credentials. Adapter SQL is covered by golden tests; the
manual canary (AC12) must be run before release.

---

## 11. Acceptance criteria

1. Planning a table whose chunk column is hash-distributed across the `INT64` range completes and
   yields at most `max_chunks + 1` chunks. *(Direct regression for #3033.)*
2. No code path issues an unbounded whole-table copy for a table at or above
   `small_table_threshold`.
3. For every distribution in the test matrix, no chunk's actual row count exceeds 3× the target.
4. Killing the flow mid-table and rerunning resumes within one chunk of the kill point, and the
   final target row count equals the source row count exactly.
5. Reconciliation runs for every copied table, including tables with NULL chunk-column values; a
   mismatch fails the table rather than marking it complete.
6. No failure path drops the target table; the checkpoint survives a failure.
7. `freshCopy=true` discards target data and checkpoints for non-`COMPLETE` tables only, logs what
   was discarded, and restarts those tables at chunk 0.
8. `freshCopy=true` applies its reset **exactly once per (flow run, target schema)**; a Prefect task
   retry after a partial fresh copy resumes rather than wiping.
9. `freshCopy` omitted or `false` reproduces pre-change resume behaviour exactly.
10. Dry-run prints the plan — column, kind, rationale, chunk count, boundary summary, estimated rows
    per chunk — and, when combined with `freshCopy`, the would-be discard set; it executes and
    destroys nothing.
11. BigQuery planning costs at most one billed full-column scan per large table, and every planner
    query carries `maximum_bytes_billed`.
12. **Canary gate (manual, pre-release):** on the affected BigQuery dataset, run dry-run, then a full
    copy of the >900M table. Record per-chunk `total_bytes_processed`. If it approximates the
    full-table byte size, chunk predicates are not pruning; apply the §7 mitigation and record the
    result before closing the issue.
13. Postgres regression: a full synpuf cache build produces the same per-table row counts as before.
14. Per-chunk logs include rows copied, elapsed time, and — on BigQuery — `total_bytes_processed`.

---

## 12. Non-goals

- Parallel chunk execution. DuckDB permits one writer per database file and the Trex path is a
  single pgwire connection.
- The `EXPORT DATA` → GCS Parquet path (Option C). Tracked separately; revisit only if the canary
  shows chunk predicates do not prune and the bill is prohibitive.
- Keyset-walk chunking. Rejected for this issue: on BigQuery `ORDER BY … LIMIT` per chunk sorts the
  remaining rows unless the table is clustered on that column.
- Per-table or per-chunk granularity for `freshCopy`. It is a run-level switch; finer control is not
  requested and would multiply the arbitration cases.
- A `freshCopy` variant that also discards `COMPLETE` tables — deleting and rebuilding the cache
  already covers a full rebuild (Decision D5).
- HANA (separate plugin) and DuckDB-as-source.
- Index and FTS behaviour (`copy_indexes`, `fts.py`).
- Reviving the unreachable `use_trex_connection == False` branch in `flow.py`.
- Re-deriving `CHUNK_COLUMN_MAP` from actual primary keys.
- Changing the default value of `cache_task_timeout`. This design relocates where the timeout
  applies; tuning the number is an operations decision.
- Concurrent source mutation during a copy.

Dead code removed in passing, because it sits inside functions being rewritten: the unreachable
`LIMIT/OFFSET` tuple branch in `create_select_query` (`copy.py:383-394`) and the duplicate
`row_count > 100_000_000` arm in `determine_chunk_size` (`chunk_utils.py:14-16`).

Observed but explicitly **out of scope**: `CopyParameters.limit_statement` is set to `"LIMIT 0"` by
`create_cdw_validation_config_plugin` (`flow.py:179`) but is never read by `create_select_query`, so
that flow appears to copy full tables rather than empty ones. This should be filed as its own issue
rather than folded in here.

---

## 13. Decisions pending team confirmation

Each has a definite value chosen so the spec is implementable as written; each should be confirmed
before implementation starts.

- **D1 — Large table with no usable chunk column (either dialect).** Chosen: fail fast with a
  diagnostic listing the columns inspected and why each was rejected. The unbounded single copy is
  banned, so this branch needs an explicit destination. On BigQuery the only alternative found —
  `MOD(FARM_FINGERPRINT(TO_JSON_STRING(t)), n)` pseudo-chunking — costs one full scan per chunk and
  is not recommended. On Postgres a keyset walk would work but expands scope.
- **D2 — Scope of a `PlannerError`.** Chosen: preserve current behaviour and raise, aborting the
  schema copy. The alternative (skip, continue, report at the end) yields a partial cache and is a
  product decision.
- **D3 — BigQuery `target_chunk_rows` default.** Chosen: keep 5,000,000. Revisit after AC12.
- **D4 — BigQuery reconciliation source.** Chosen: `__TABLES__.row_count` (free). It is eventually
  consistent for tables with recent streaming inserts; if the affected datasets use the streaming
  API this must switch to a billed `COUNT(*)`.
- **D5 — `freshCopy` scope.** Chosen: non-`COMPLETE` tables only. If the team also wants a variant
  that rebuilds `COMPLETE` tables, that is a third value (an enum `resume | failed | all`) rather
  than a change to this one, and should be requested explicitly.
- **D6 — `freshCopy` naming and exposure.** Chosen: `freshCopy` on `CreateCacheOptions`, settable by
  whoever triggers the flow. If it should be restricted to admins, or surfaced in the portal UI
  rather than only the flow parameters, that is a product decision not covered here.

The issue body itself could not be read from this environment (`gh` is unauthenticated here), so
this spec is grounded in the repository code and the team's written direction rather than the issue
text. If #3033 carries acceptance criteria beyond §11, reconcile them against this document before
implementation.
