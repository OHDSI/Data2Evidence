# Issue #2877 — `source` type dataset gets an unusable `cache_id`

- **Issue:** [OHDSI/Data2Evidence#2877](https://github.com/OHDSI/Data2Evidence/issues/2877) — "Adding `source` type dataset should set databaseCode as cacheid"
- **Track:** light (scoped fix, no new subsystem, no schema change)
- **Status:** implemented — steps 1–5 landed with unit tests (see §5 for the one divergence)

## Root cause

`type: 'source'` datasets get a `cache_id` pointing at a DuckDB catalog that is never created.

The cacheId default rule branches only on **dialect**, never on **type**:

```ts
// dataset.entity.ts:86-90 (duplicated in dataset-command.service.ts:99-105 and :175-181)
if (this.dialect === 'hana') this.cacheId = this.databaseCode
else if (this.id)           this.cacheId = sanitizeIdForCacheId(this.id)
```

`plugins/functions/dataset/index.ts:236` never sends a `cacheId`, so a non-HANA `source`
dataset always lands on the second branch. But cache files are only built for
`type === 'webapi'` — `syncDatasetToWebApi` returns early otherwise
(`dataset-command.service.ts:1134`). For a `source` dataset the cache belongs to its
*child* cache dataset, not to the source row. So the source row ends up naming a catalog
nobody creates.

That breaks things two ways:

1. **The databaseCode fallback is suppressed.** Every consumer resolves
   `dataset.cacheId ?? dataset.databaseCode`:
   - `plugins/functions/analytics-svc/src/api/controllers/dbsvc.ts:12`
   - `plugins/functions/analytics-svc/src/middleware/StudyDbCredential.ts:168`
   - `plugins/functions/d2e-webapi/src/dao/trex.dao.ts:62`
   - `plugins/functions/terminology-svc/src/api/portal-api.ts:84`
   - `plugins/functions/parquet-export/index.ts:556`

   A bogus-but-non-null `cacheId` means the `?? databaseCode` branch never fires, so
   queries hit a nonexistent catalog instead of the source DB.

2. **trex is told to attach a file that does not exist.**
   `trexApiService.attach({ cacheIds: [<bogus>] })` at `dataset-command.service.ts:182`.

### Corroboration

The migration that introduced the column backfills exactly the value the issue asks for:

```sql
-- plugins/functions/portal-init/src/db/migrations/1778417559068-add-dataset-cache-id.ts
UPDATE "portal"."dataset" SET "cache_id" = "database_code" WHERE "cache_id" IS NULL
```

So legacy rows already use `database_code` semantics while every new non-HANA row uses
`sanitizeIdForCacheId(id)`. Two incompatible conventions in one column.

## Plan

### 1. Single resolver, replacing three copies

**File:** `plugins/functions/portal/src/dataset/entity/dataset.entity.ts`

Add `resolveCacheId({ dialect, type, id, databaseCode })` next to `sanitizeIdForCacheId`.

Rule:
- `databaseCode` when `dialect === 'hana'` **or** `type === SourceDatasetType.SOURCE`
- otherwise `sanitizeIdForCacheId(id)`

Call it from `applyCacheIdDefault()` (`:81-91`).

### 2. Use it on both write paths

**File:** `plugins/functions/portal/src/dataset/command/dataset-command.service.ts`

Replace with calls to the same resolver:
- `:99-105` — the hand-mirrored block that exists because TypeORM `.insert()` skips `@BeforeInsert`
- `:175-181` — the `attach()` fallback

This removes the drift risk between the value stored in the DB and the value handed to trex.

### 3. Fix snapshot inheritance

**File:** `plugins/functions/portal/src/dataset/command/dataset-command.service.ts:505`

Currently:

```ts
cacheId: sourceDataset.cacheId ?? sanitizeIdForCacheId(sourceDatasetId),
```

Once the source row holds `databaseCode`, the cache dataset would inherit it and the cache
file would be written to the source catalog — `create_cachedb_file_plugin/flow.py:73` writes
to `options.cache_id or options.database_code`.

Change it to derive from the **snapshot's own** id: `sanitizeIdForCacheId(snapshotId)`.

### 4. Backfill migration

**New file:** `plugins/functions/portal-init/src/db/migrations/`

```sql
UPDATE portal.dataset
SET cache_id = database_code
WHERE type = 'source'
  AND dialect <> 'hana'
  AND cache_id IS DISTINCT FROM database_code;
```

Repairs `source` datasets already created since the column landed. Data-only, no schema
change. Remember to register it in `plugins/functions/portal-init/src/db/migration-data-source.ts`.

### 5. Cache-file write target (DIVERGENCE from the approved plan — added during implementation)

**File:** `plugins/functions/jobplugins/src/controllers/CachedbController.ts`
**New file:** `plugins/functions/jobplugins/src/utils/cacheWriteTarget.ts`

Step 3 alone would have regressed the datamart cache path. `CachedbController.createCachedbFileFlowRun`
resolved the cache-file write target from the **source** row:

```ts
const dataset = await portalServerApi.getDataset(params.datasetId); // the SOURCE dataset
const cacheId = dataset.cacheId ?? databaseCode;                    // -> write target
```

Both call sites (`plugins/functions/dataset/index.ts:376` and `:483`) pass the source
dataset id as `datasetId` and the cache dataset id as `cacheDatasetId`, and the flow writes
to `options.cache_id or options.database_code`
(`plugins/flows/base/create_cachedb_file_plugin/flow.py:73`), naming the `.duckdb` file after it.

So after steps 1–3 the source row holds `databaseCode`, and the cache file would have been
written to a catalog named after the source connection's own trex alias, while the cache
dataset row pointed at `sanitize(snapshotId)` — a catalog nobody wrote. Extracted the
resolution into `resolveCacheWriteTarget(sourceDataset, cacheDataset)`, which prefers the
**cache** dataset's `cache_id` and falls back to the source-derived value for legacy rows.

## Verification

- **Unit** — `plugins/functions/portal/src/dataset/command/dataset-command.service.spec.ts`
  currently has zero `cacheId` coverage. Assert the resolver returns:
  - `databaseCode` for `source` / postgres
  - `databaseCode` for hana
  - sanitized id for `omop` / `study`

  Plus: assert `attach()` is called with the same cacheId that was inserted.
- **End-to-end** — via the `testing-d2e-flows` skill against the running stack. Create a
  postgres `source` dataset plus its cache dataset, assert `portal.dataset.cache_id =
  database_code` on the source row and the sanitized snapshot id on the cache row, then
  confirm a query through analytics-svc reaches the source DB instead of erroring on a
  missing catalog.
- **TypeCheck** on the portal plugin.

## Open questions (defaults chosen, not blocking)

- **`type: 'fhir'`** — the other `SourceDatasetType` (`plugins/functions/dataset/const.ts:30-33`).
  FHIR datasets get `databaseCode: env.FHIR_DATABASE_CODE` and `dialect: duckdb`
  (`plugins/functions/dataset/index.ts:239-241`), so the same argument plausibly applies.
  The issue names only `source`, so this plan scopes to `source`.
- **Step 4's backfill** — whether existing broken rows should be repaired in this PR or
  handled separately. This plan includes it; it is the difference between fixing new
  datasets and fixing the ones already present in affected environments.

## Notes

- No documentation currently specifies what `cache_id` should be for a `source` dataset —
  the rule lives only in code comments. Worth a short doc note under
  `docs/website/docs/2-admin_guide/1-datasets/` alongside the fix.
- Related derivation sites left unchanged by this plan, but worth knowing about:
  `plugins/functions/portal/src/webapi/webapi-source.api.ts:145,171` and
  `plugins/flows/base/dqd_plugin/flow.py:22-26` (Python re-implementation of
  `sanitizeIdForCacheId`).
