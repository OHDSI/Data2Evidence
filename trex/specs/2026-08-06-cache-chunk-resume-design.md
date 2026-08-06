# Cache creation — distribution-aware chunk planning, chunk-level resume, and fresh-copy override

- **Date:** 2026-08-06 (revised after implementation)
- **Issue:** https://github.com/OHDSI/Data2Evidence/issues/3033
- **Component:** `plugins/flows/base/create_cachedb_file_plugin`
- **Selected approach:** Option B (distribution-aware chunks + chunk-level resume), plus an
  operator-controlled fresh-copy override
- **Status:** **as-built.** The design was implemented on branch
  `claw/4a5319e3-0458-4676-a5f4-96b6cce89967`; 237 tests pass. This revision folds in the
  divergences that implementation and two review rounds forced. §14 lists every one of them with
  its reason, so the spec and the code no longer disagree.
- **Plan:** `trex/plans/2026-08-06-cache-chunking-resume.md`

---

## 1. Problem

`plan_chunks()` derived the number of chunks from the **span** of the chunk column, not from the
row count:

```
current = min_val
while current <= max_val:
    end = min(current + chunk_size - 1, max_val)
    chunks.append(f'"{chunk_col}" BETWEEN {current} AND {end}')
    current = end + 1
```

`len(chunks) == ceil((max_val - min_val + 1) / chunk_size)`. `row_count` was a parameter, consulted
only afterwards for a post-hoc sanity check. With BigQuery's fixed `chunk_size = 5_000_000` and a
hash-generated `INT64` surrogate key the span approaches the full `INT64` range, giving ~3.7e12 loop
iterations, each appending a predicate string. The worker exhausted memory **inside the planner,
before any row was copied**.

Three coupled defects had to be fixed together, because closing the first removes the escape hatch
the others relied on:

1. **The density guard could not detect this failure.** It tripped when
   `row_count / len(chunks) > 2 * chunk_size` — chunks that are too *dense*. Sparsity makes that
   ratio smaller, so the guard was silent in exactly the failing case.
2. **Every `plan_chunks` failure routed to an unbounded whole-table copy** via
   `CREATE OR REPLACE TABLE … AS <select>`. Three paths reached it: a missing `CHUNK_COLUMN_MAP`
   entry, the `int()` cast bail (any date or string chunk column), and the density guard. The team
   banned that fallback after it failed on a BigQuery table above ~900M rows.
3. **Progress was checkpointed per table, not per chunk.** `cleanup()` dropped the target on
   failure; `retries=3` sat on `create_schema_tables_task`, whose `timeout_seconds`
   (`cache_task_timeout`, default 10800s) covered the *entire schema loop*. A table that could not
   finish in one attempt restarted from chunk 0 on every retry and never converged.

Once resume exists, operators need a way to **deliberately discard** a resumable checkpoint — when
the previous failure left data they do not trust, or when a fix has landed and the partial result is
stale. That is `freshCopy` (§4.3).

### Verified constraints

- Source dialects for this plugin are exactly **Postgres and BigQuery** (`check_supported_dialects`;
  the only `case` arms in `attach_to_source_db`). HANA has its own plugin; DuckDB is target-only.
- `use_trex_connection` is hardcoded `True`, so the write path is always Trex pgwire → DuckDB with
  the source `ATTACH`ed as `<database_code>__srcdb`. The `if not options.use_trex_connection:`
  branch in `flow.py` is unreachable.
- At runtime `write_conn` is a **psycopg2 cursor**; in tests it is a **duckdb connection**. Both
  expose `execute()` then `fetchall()`/`fetchone()`, and nothing in `checkpoint.py` may use more
  than that shared surface.
- Planning queries run on a **separate direct SQLAlchemy connection to the source**
  (`read_conn.engine`), not through Trex.
- Both status tables are **ephemeral**: dropped after a successful schema copy, so they exist only
  between a failure and the next run.
- **One flow run can copy two schemas.** `create_results_cache_flow` re-enters `create_cache_flow`
  as a plain function call inside the *same* Prefect flow run, so it shares `flow_run.id`. Any
  run-scoped state must be keyed on `(flow_run_id, target_schema)`.
- Toolchain: Python 3.12, `duckdb==1.4.0`, `sqlalchemy==2.0.38`, `sqlalchemy-bigquery==1.14.1`,
  `prefect==3.6.10`, `pytest==9.0.3`.

---

## 2. Goals

1. Chunk **count** derives from row count and is hard-capped, so the planner cannot allocate an
   unbounded list regardless of chunk-column distribution.
2. Chunk **size** derives from the observed value distribution, so a bounded count does not silently
   produce oversized chunks on skewed or sharded keys.
3. No code path performs an unbounded whole-table copy at or above the small-table threshold.
4. A large table's copy **converges across retries**: work already done is not repeated.
5. An operator can **explicitly discard** a resumable checkpoint without hand-editing SQL.
6. Every copied table is reconciled against the source row count before being marked complete.
7. BigQuery planning is scan-cost aware and observable.

---

## 3. Architecture

```
copy.py                     orchestration: reset? -> plan -> checkpoint -> execute -> reconcile
  |
  +-- source_stats.py       dialect adapters; ALL source-side SQL lives here
  |     BigQuerySourceAdapter / PostgresSourceAdapter
  |
  +-- chunk_utils.py        PURE planner: (ChunkStats, ChunkConfig) -> ChunkPlan
  |
  +-- checkpoint.py         status tables, plan hashing, reset, fresh-copy arbitration
  |
  +-- planner_types.py      dataclasses and enums
  +-- errors.py             exception taxonomy
```

**Import discipline is load-bearing and enforced by a test.** `errors.py`, `planner_types.py`,
`chunk_utils.py`, `source_stats.py` and `checkpoint.py` must never import `prefect` — directly or
transitively. They take a `logger` argument instead of calling `get_run_logger()`. `sqlalchemy` and
`_shared_flow_utils.types` are imported lazily inside the adapter methods that need them, because
`_shared_flow_utils.types` itself imports prefect. This is what lets the suite run in a bare
virtualenv with only `pytest`, `duckdb` and `pydantic`.

### Connection roles

| Concern | Connection |
|---|---|
| Row counts, boundaries, NULL counts, column metadata | `read_conn.engine` (SQLAlchemy, direct to source) |
| Chunk `DELETE`/`INSERT`, target DDL, resets | `write_conn` (psycopg2 → Trex pgwire → DuckDB) |
| Status tables | `write_conn` |

---

## 4. Interfaces and configuration semantics

### 4.1 `ChunkConfig`

| Field | Default | Meaning |
|---|---|---|
| `target_chunk_rows` | BigQuery 5_000_000; else 1_000_000 | Desired rows per chunk |
| `max_chunks` | 2_000 | Hard cap on chunk count |
| `min_chunk_rows` | 100_000 | Floor; prevents thousands of tiny chunks |
| `small_table_threshold` | 500_000 | Below this, copy in one statement |
| `dry_run` | `false` | Plan and log only |

`__post_init__` rejects non-positive or non-integer values for the four bounds with `PlannerError`;
`resolve_target_chunk_rows` rejects a non-positive `chunkSize` override. Without this,
`chunkSize: 0` raised `ZeroDivisionError` at import-adjacent depth and `chunkSize: -1` silently
produced one unbounded chunk.

**`chunkSize` does not always win.** `min_chunk_rows` floors the effective chunk size, so any
override below 100_000 is absorbed. That is deliberate — thousands of tiny chunks cost more in
Prefect task overhead than they save — but it is a real limit on the knob.

Guard constants, all named in code:

| Constant | Value | Purpose |
|---|---|---|
| `MAX_NULL_CHUNK_MULTIPLE` | 3 | Reject a plan whose NULL chunk exceeds 3× target |
| `MAX_CHUNK_SIZE_MULTIPLE` | 5 | Reject a plan whose chunks exceed 5× the planned size |
| `SMALL_TABLE_CONFIRM_FACTOR` | 1.2 | Confirm an estimated count with an exact one near the threshold |
| `PLANNER_VERSION` | 2 | Mixed into `plan_id`; bump to invalidate every checkpoint |

### 4.2 Planner and adapter types

- `ColumnKind` — `PARTITION | CLUSTER | PRIMARY_KEY | MAPPED_ID`
- `ChunkStrategy` — `SINGLE_STATEMENT | CHUNKED`
- `ChunkColumnCandidate(name, kind, data_type, nullable)`
- `ChunkStats(row_count, row_count_is_exact, column, boundaries, null_count)`
- `ChunkPlan(plan_id, strategy, column_name, column_kind, predicates, estimated_rows_per_chunk, includes_null_chunk)`

`SourceAdapter` surface — the only dialect seam: `count_rows`, `count_rows_exact`,
`pick_chunk_column(schema, table, allowed_columns=None)`, `column_boundaries`, `count_nulls`,
and `collect(schema, table, config, logger, allowed_columns=None) -> ChunkStats`.

### 4.3 `freshCopy` — the fresh-copy override

**Surface.** Two new optional fields on `CreateCacheOptions`, following the existing camelCase-alias
convention used by `chunkSize`:

```
fresh_copy: Optional[bool] = Field(default=False, alias="freshCopy")
dry_run:    Optional[bool] = Field(default=False, alias="dryRun")
```

Both are threaded into `CopyParameters`. Omitting them reproduces today's behaviour exactly.

**Semantics.** When `freshCopy` is true, then **once per (flow run, target schema)**, before any
planning:

- every table whose status is **not** `COMPLETE` has its target table dropped and its status row
  deleted;
- tables whose status **is** `COMPLETE` are left untouched — they were reconciled against the
  source, so re-copying them is waste;
- the reset is logged at WARNING with the tables discarded and the row count discarded per table;
- copying proceeds normally, re-planning each discarded table from scratch.

**Why "once per (flow run, target schema)" is load-bearing.** `create_schema_tables_task` carries
`retries=3`. If the reset ran on every attempt, attempt 2 would destroy the progress attempt 1 made,
and the parameter would silently undo the convergence property this design exists to provide. The
reset is therefore recorded and arbitrated, not re-evaluated. The key is composite because one flow
run copies the datamart schema and then the results schema, and each needs its own reset.

**Arbitration record** — a second ephemeral table:

```
copy_run_status (
  flow_run_id      TEXT,
  target_schema    TEXT,
  reset_applied_at TIMESTAMP,
  PRIMARY KEY (flow_run_id, target_schema)
)
```

**Scope limit worth stating plainly:** `apply_fresh_copy` can only see tables that *have* a status
row. After a fully successful run the bookkeeping is dropped, so `freshCopy` on a healthy cache is a
no-op. It discards failed work, not a finished cache; rebuilding a good cache means deleting it.

**Interaction with the automatic `plan_id` reset.** A table is already reset automatically when its
recomputed `plan_id` differs from the stored one — for example because `chunkSize` changed.
`freshCopy` exists for the case where the plan is identical but the partial data is not trusted.
Both paths call `reset_table`.

**Interaction with `dryRun`.** `dryRun` wins: nothing is dropped, the discard set is reported, and
the once-per-run token is **not** consumed.

**Relationship to the "no implicit drops" rule.** §8 forbids error paths from dropping targets,
because implicit drops are what make retries non-convergent. `freshCopy` is an explicit,
operator-requested, logged drop scoped to non-`COMPLETE` tables — the only sanctioned drop in the
design, alongside the bounded `SINGLE_STATEMENT` replace.

---

## 5. Planning algorithm

Given `(schema, table, adapter, config, allowed_columns)`:

1. `row_count, is_exact = adapter.count_rows(...)`. If the count is an estimate and falls below
   `small_table_threshold * SMALL_TABLE_CONFIRM_FACTOR`, confirm it with `count_rows_exact`.
2. If `row_count < small_table_threshold` → `SINGLE_STATEMENT`, done.
3. Pick the chunk column, restricted to `allowed_columns` when a snapshot `table_filter` narrows the
   copied columns. No candidate → `PlannerError`.
4. `n_desired = ceil(row_count / target_chunk_rows)`; `n = clamp(n_desired, 1, max_chunks)`; then
   lower `n` until `row_count / n >= min_chunk_rows`. **Count comes from rows and is capped, never
   from the column span** — this is the fix for the reported defect.
5. Fetch boundaries — `APPROX_QUANTILES` on BigQuery, `percentile_disc`/`pg_stats` on Postgres —
   then **thin them to at most `n + 1` values**, keeping the first and last and spreading the rest
   evenly. Without thinning, `n` is computed and then ignored and the cap does not bind.
6. Build half-open predicates: `col < b1`; `col >= bi AND col < bi+1`; `col >= bk`; plus an explicit
   `col IS NULL` chunk when the column is nullable. Outer endpoints are dropped (a `col < min` chunk
   is always empty). **Chunk size follows the distribution** — this is the fix for skew.
7. **Three rejection guards**, each raising `PlannerError` rather than degrading:
   - *degenerate*: fewer than 2 interval predicates — the column is too low-cardinality to chunk on,
     and a single `IS NOT NULL` predicate is an unbounded copy wearing a `CHUNKED` label;
   - *oversized NULL chunk*: `null_count > MAX_NULL_CHUNK_MULTIPLE * target_chunk_rows`. A NULL chunk
     cannot be split — every row has the same key — so the only correct response is to reject and
     tell the operator to choose a different chunk column;
   - *oversized chunks*: `estimated_rows_per_chunk > MAX_CHUNK_SIZE_MULTIPLE * planned_chunk_rows(...)`.
8. `plan_id = sha256(PLANNER_VERSION, dialect, schema, table, column, strategy, predicates)`.

The old density guard and the `int()` cast are both **deleted**. Ties collapse during boundary
deduplication, which is the correct handling of a dense non-unique column, and dropping the cast
lets a BigQuery partitioning date column be the chunk column.

### Planner invariants (asserted in code and in tests)

- `len(predicates) <= max_chunks + 1` (the `+1` is the NULL chunk).
- Predicates are pairwise disjoint and cover the column domain including NULL.
- Planning performs no database access and allocates memory proportional to `n`, not to the span.

---

## 6. Data flow

**Per schema:** ensure the status tables (with legacy-shape detection) → if `freshCopy` and no
arbitration row for `(flow_run_id, target_schema)`, reset every non-`COMPLETE` table and record the
token → filter out `COMPLETE` tables → copy each table → on full success drop both status tables.

**Per table:** collect stats → plan → read checkpoint → resume from `chunks_completed` when
`plan_id` matches, otherwise `reset_table` → `mark_in_progress` → create the target shell with
`CREATE TABLE IF NOT EXISTS` (**`IF NOT EXISTS` is essential** — a resume must keep the rows it
already copied) → for each remaining chunk `DELETE` then `INSERT` then record progress → reconcile →
`mark_complete`.

Under `dryRun` the plan is logged and nothing is created, copied, dropped or indexed.

---

## 7. Dialect behaviour

### BigQuery

| Concern | Approach | Cost |
|---|---|---|
| Row count | `SUM(row_count)` from `` `<dataset>.__TABLES__` `` | Free |
| Row count (views / external) | `COUNT(*)` fallback when `__TABLES__` is NULL | One scan |
| Candidates | `INFORMATION_SCHEMA.COLUMNS` — partitioning, clustering ordinal, nullability, type | Free |
| Boundaries | `APPROX_QUANTILES(col, n)` | One column scan |
| NULL count | `COUNT(*) WHERE col IS NULL`, only when the catalog says nullable | One column scan |

**Chunk-column priority: partitioning column → lowest-ordinal clustering column → `CHUNK_COLUMN_MAP`
surrogate id**, with a non-nullable candidate preferred *within* a tier. This is the scan-cost lever:
OMOP tables on BigQuery are conventionally partitioned on dates and clustered on `person_id`, not on
`measurement_id`, so chunking on the surrogate id risks one full read per chunk.

Identifiers follow the plugin's existing convention — the `schema` value is the dataset and the
connection supplies the project, so tables are written `` `dataset.table` ``.

**Chunk predicates use double-quoted identifiers.** They are evaluated by **DuckDB** against the
ATTACHed BigQuery table and never sent to BigQuery as SQL, so double quotes are correct and
backticks would be wrong. Three separate reviewers have now flagged this as a bug; it is not. There
is a comment in `build_predicates` recording why.

### PostgreSQL

| Concern | Approach | Cost |
|---|---|---|
| Row count | `pg_class.reltuples` estimate, confirmed exactly near the threshold | Free / one scan |
| Candidates | single-column integer PK via `pg_index`/`pg_attribute`, then `CHUNK_COLUMN_MAP` | Free |
| Boundaries | `pg_stats.histogram_bounds` fast path, else `percentile_disc` | Free / ordered scan |
| NULL count, reconciliation | `COUNT(*)` | One scan each |

The estimate confirmation is not optional. A table analysed while empty and then bulk-loaded reports
`reltuples = 0`, and PG ≤ 13 reports `0` for a never-analysed table — which would route a 900M-row
table straight into the `SINGLE_STATEMENT` branch this design exists to prevent.

---

## 8. Failure, retry, and error handling

| Error | Trigger | Behaviour |
|---|---|---|
| `PlannerError` | No usable chunk column; degenerate, NULL-heavy or oversized plan; bad config | Table `FAILED`, target and checkpoint preserved, raised — except under `dryRun`, where it is logged per table and the run continues |
| `ChunkCopyError` | A chunk `DELETE`/`INSERT` failed | Prefect retries the chunk with backoff; on exhaustion the table is `FAILED` with its **resume point intact** |
| `ReconciliationError` | Source count ≠ target count | Table `FAILED`, target preserved, **resume point cleared** so the next run replans |
| `FreshCopyResetError` | A reset could not be applied | Abort before any planning; never proceed half-reset |

Rules that hold everywhere:

- **No error path drops the target table.** `mark_failed` is an upsert that writes status only. The
  old `cleanup()` dropped the target, and that is precisely what made retries restart from chunk 0.
- **The resume point is cleared on reconciliation failure only.** Without this the table parks in a
  state where `chunks_completed == chunks_total`, every rerun copies zero chunks and re-fails
  identically — reintroducing the never-converges pathology in a new place. On `ChunkCopyError` the
  resume point is exactly what we want to keep, so it is preserved.
- **The timeout budget lives on the chunk.** `cache_chunk_timeout` (new, default 3600s) replaces the
  schema-wide `cache_task_timeout` on `create_schema_tables_task`, so one large table can no longer
  consume the whole schema's allowance and a timeout no longer discards completed chunks. Both
  `Variable.get` calls pass an explicit default so a worker whose variables were never re-seeded
  degrades instead of failing at import.

### Idempotency

Each chunk is `DELETE FROM <target> WHERE <predicate>` then `INSERT … WHERE <predicate>`. DuckDB
over pgwire autocommits per statement, so the delete, the insert and the progress update are three
transactions. Both crash windows are safe by construction:

- Crash between `DELETE` and `INSERT` → the chunk is empty; the rerun replays it.
- Crash between `INSERT` and the progress update → the chunk is copied but recorded as incomplete;
  the rerun replays it, and the leading `DELETE` removes the previous copy first. No duplicates.
- Predicates are disjoint, so one chunk's `DELETE` never touches another's rows.

Idempotency assumes a stable source for the duration of a copy.

### Checkpoint and resume semantics

`table_copy_status` carries `table_name, status, started_at, completed_at, plan_id, chunks_total,
chunks_completed, rows_expected`. Chunks execute in plan order, so a single high-water mark
suffices — no per-chunk bitmap. `plan_id` mismatch forces a full restart of that table, because
mixing predicates from two plans could duplicate or drop rows. `COMPLETE` is written only after
reconciliation passes. Resume granularity is one chunk.

---

## 9. Compatibility and migration

Both status tables are dropped after a successful schema copy, so the only compatibility case is
state left by a **failed pre-upgrade run**. `ensure_status_tables` introspects the status table's
columns; if the new ones are absent it logs a WARNING, drops and recreates it, and treats every
table as not-started. Safe, because the old code dropped target tables on failure anyway. Under
`dryRun` it logs what it *would* migrate and skips both the drop and the creates.

`information_schema` is queried unqualified with a `table_catalog` predicate: DuckDB rejects a
catalog-qualified `information_schema.columns`, and the unqualified form is valid Postgres too.

Other notes: `freshCopy` and `dryRun` default false, so no behaviour changes for existing callers;
`chunkSize` keeps its meaning; the small-table path is unchanged, so most OMOP tables behave exactly
as before; caches produced before and after are identical in content.

---

## 10. Test approach

`plugins/flows/base/create_cachedb_file_plugin/tests/` — 237 tests, running in a bare virtualenv
with `pytest`, `duckdb` and `pydantic`, in ~3.5s. Three layers:

**Pure** — `test_chunk_planner.py`, `test_source_adapter_sql.py`, `test_source_adapters.py`,
`test_checkpoint.py`, `test_fresh_copy.py`, `test_options.py`. Planner behaviour, golden-string
assertions on both dialects' SQL (so BigQuery SQL is covered without credentials), adapter
orchestration driven by stubbing the two statement-executing methods, checkpoint CRUD, and the
`freshCopy` matrix — including the retry case that proves a second `apply_fresh_copy` in the same
flow run returns `[]` and does not wipe the retry's own progress.

**Property** — `test_planner_properties.py` builds a real DuckDB table per distribution
(dense sequential, hash-uniform INT64, offset-sharded, heavy ties, single value) × null fraction,
evaluates every predicate, and asserts per-predicate counts sum exactly to the total including NULLs
and that no row matches two predicates. This mechanically proves disjointness and totality.

**Integration** — `test_copy_integration.py`, 200k sparse offset-sharded rows through the real
primitives: full copy reconciles; and a kill simulated *between* the `INSERT` and the progress
update replays exactly one chunk without duplicating. Verified non-tautological by mutation —
removing the leading `DELETE` makes it fail with a 10k-row surplus.

**Structural** — `test_copy_structure.py` with `copy_source.py` helpers. `copy.py` imports prefect
and cannot be imported here, so the control flow that must hold in it — what `dryRun` must not do,
which exception clears the resume point — is asserted by parsing the module with `ast`. Used only
where behaviour cannot be reached by running it; anything expressible as pure logic was extracted
into `chunk_utils` helpers and tested directly.

**BigQuery has no live CI test** — CI has no credentials. Its SQL is covered by golden strings and
the canary in §11 is the release gate.

---

## 11. Acceptance criteria

| # | Criterion | Status |
|---|---|---|
| 1 | Hash-distributed INT64 key yields ≤ `max_chunks + 1` chunks | met |
| 2 | No unbounded whole-table copy at or above `small_table_threshold` | met |
| 3 | No chunk grossly exceeds the target across skewed distributions | met via the §5 guards |
| 4 | Kill mid-table → resume within one chunk, exact final count | met |
| 5 | Reconciliation for every copied table incl. NULL rows | met |
| 6 | No failure path drops the target; checkpoint survives | met |
| 7 | `freshCopy` discards only non-`COMPLETE` tables and logs it | met |
| 8 | `freshCopy` resets once per (flow run, target schema) | met |
| 9 | `freshCopy` omitted reproduces pre-change behaviour | met |
| 10 | `dryRun` destroys nothing and does not consume the token | met |
| 11 | BigQuery planning ≤ one billed full-column scan per large table | met for tables; a view costs more (see §13 D4) |
| 12 | **Canary (manual, release gate)** | **not run** |
| 13 | Postgres regression: synpuf per-table row counts unchanged | not run |
| 14 | Per-chunk logs: rows copied, elapsed, `total_bytes_processed` | partially met — see §14 |

**Criterion 12 in full.** On the affected BigQuery dataset: run `dryRun` and record the plan for the
>900M table; run the full copy; capture per-chunk `total_bytes_processed` from BigQuery job history.
If it approximates the full-table byte size, chunk predicates are not pruning — apply the §7
mitigation (raise `chunkSize` for that table to cut the number of repeated scans) and record the
result before closing the issue.

---

## 12. Non-goals

- Parallel chunk execution. DuckDB permits one writer per file and the Trex path is one connection.
- The `EXPORT DATA` → GCS Parquet path (Option C). Revisit only if the canary shows no pruning.
- Keyset-walk chunking — on BigQuery `ORDER BY … LIMIT` per chunk sorts the remaining rows unless
  the table is clustered on that column.
- Per-table or per-chunk granularity for `freshCopy`; it is a run-level switch.
- A `freshCopy` variant that also discards `COMPLETE` tables (§13 D5).
- HANA (separate plugin) and DuckDB-as-source.
- Index and FTS behaviour beyond skipping them under `dryRun`.
- Reviving the unreachable `use_trex_connection == False` branch.
- Re-deriving `CHUNK_COLUMN_MAP` from actual primary keys.
- Changing the default `cache_task_timeout`.
- Concurrent source mutation during a copy.

Observed but out of scope: `CopyParameters.limit_statement` is set to `"LIMIT 0"` by
`create_cdw_validation_config_plugin` and never read by `create_select_query`, so that flow appears
to copy full tables; and that same entrypoint reads `options.database_code`/`schema_name` against a
model that declares `databaseCode`/`schemaName` with no aliases, so it raises before it gets there.
Both predate this work and want their own issue.

---

## 13. Decisions pending team confirmation

- **D1 — Large table with no usable chunk column.** Chosen: fail fast with a diagnostic listing the
  columns inspected and why each was rejected. The unbounded copy is banned, so the branch needs an
  explicit destination; `MOD(FARM_FINGERPRINT(…), n)` pseudo-chunking costs a full scan per chunk.
- **D2 — Scope of a `PlannerError`.** Chosen: raise and abort the schema copy (except under
  `dryRun`). Skip-and-continue would yield a partial cache and is a product decision.
- **D3 — BigQuery `target_chunk_rows`.** Chosen: 5,000,000. Revisit after the canary.
- **D4 — BigQuery reconciliation source.** Chosen: the free `__TABLES__` count. It is eventually
  consistent for tables with recent streaming inserts; if those datasets use the streaming API this
  must switch to a billed `COUNT(*)`, or reconciliation will produce false failures.
- **D5 — `freshCopy` scope.** Chosen: non-`COMPLETE` tables only. A variant that also rebuilds
  `COMPLETE` tables would be a second value (`resume | failed | all`), not a change to this one.
- **D6 — `maximum_bytes_billed`.** **Not implemented.** Applying it means touching
  `_shared_flow_utils/dao/daobase.py`, shared with every other BigQuery flow. Confirm whether that
  shared change is acceptable, or whether the adapter should open its own client for planner queries.

---

## 14. Divergences from the pre-implementation design

Recorded so the spec and the code agree. Each was forced by implementation or by review.

1. **Boundary thinning added.** The original algorithm computed `resolve_chunk_count` and never used
   it, so `max_chunks` did not bind and the cap was decorative. `_thin_boundaries` caps boundaries at
   `n + 1`, keeping the first and last.
2. **`plan_id` hashes predicates and strategy, not boundaries.** Hashing boundaries was both unsound
   (flipping `nullable` changed the predicate count but not the id — a collision in the very key
   whose job is to detect that) and over-sensitive (it hashed the two outer endpoints that
   `build_predicates` discards, so appending rows invalidated a checkpoint whose predicates were
   byte-identical).
3. **Three rejection guards added** (degenerate, oversized NULL chunk, oversized chunks). The
   original design had none; review demonstrated a single `IS NOT NULL` predicate on a 900M-row
   table, a 19× NULL chunk, and a 3-distinct-value column producing two 450M-row chunks — all of
   which passed every original check.
4. **The chunk-size guard compares against `planned_chunk_rows`, not `target_chunk_rows`.** Comparing
   against the raw target would reject every plan where `max_chunks` legitimately binds, and the
   operator has no recourse there.
5. **`allowed_columns` added.** A snapshot `table_filter` can exclude the chosen chunk column, making
   every chunk's `DELETE` reference a column the target lacks.
6. **Postgres estimate confirmation added** (`SMALL_TABLE_CONFIRM_FACTOR`). `reltuples` can read 0 on
   a large table.
7. **`mark_failed` became an upsert.** Planning happens before `mark_in_progress`, so a
   `PlannerError` used to update zero rows and record nothing.
8. **`clear_resume_point` added** for `ReconciliationError` only.
9. **`dryRun` hardened** — skips `copy_indexes` (it crashed on any source with a primary key), does
   not migrate a legacy status table, and tolerates `PlannerError` per table so an operator sees
   every unplannable table rather than only the first.
10. **`ChunkConfig.__post_init__` validation added.**
11. **`Decimal` handling tightened** — rendered with `format(value, "f")`, non-finite rejected;
    scientific notation typed as `DOUBLE` in DuckDB, the exact hazard floats are rejected for.
12. **`normalise_boundaries` wraps `TypeError` in `PlannerError`** so mixed boundary types stay
    inside the taxonomy.
13. **`total_bytes_processed` is not logged.** The DuckDB BigQuery extension surfaces no job
    statistics, so it cannot be obtained on this path and was not faked. Rows copied and elapsed
    time are logged per chunk; bytes must come from BigQuery job history during the canary. This is
    why criterion 14 is *partially* met.
14. **Structural (`ast`-based) tests introduced** for `copy.py`, which cannot be imported without
    prefect.
