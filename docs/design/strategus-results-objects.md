# Strategus Results Objects — Design

**Status:** approved (design), not yet implemented
**Date:** 2026-09-11
**Plugin:** `plugins/functions/strategus-analysis` (+ `strategus-analysis-init`)

## Problem

A Strategus flow run aggregates its analyses into a schema in the
`strategus_results` database. That is the only place results land. There is no
way to hand a researcher or an external client the results as a single
downloadable artifact, and no record of results as first-class objects.

The end goal is: a flow run compresses its results into a zip, registers it as a
stored object, and clients retrieve it as a zip on request.

## Scope of this cycle

This spec covers **only the results-object storage and retrieval API** inside the
`strategus-analysis` plugin.

**In scope**
- A new private bucket `strategus-results-store`
- A `strategus.results` table (migration in `strategus-analysis-init`)
- `StrategusResult` entity, service, and a `/strategus/results` router
- A slim Supabase Storage client local to this plugin
- Manifest/scope registration

**Out of scope (deliberately deferred)**
- Any change to `plugins/flows/hades/strategus_plugin/flow.py` or `nodes.py` —
  no zipping, no flow-side upload call. Flow integration gets its own spec.
- `plugins/functions/jobplugins` — the existing
  `/jobplugins/strategus-results/*` passthrough and its `strategus-results`
  bucket are left exactly as they are.
- `plugins/ui` — `UploadStrategusResultsDialog` keeps posting to jobplugins.

The two systems coexist: the existing bucket serves the manual-upload →
`upload-results-from-storage` flow path; the new bucket serves standalone
result objects. They share nothing, so neither can break the other.

## Key decision: results are independent objects

A result is **not** coupled to a study. No `study_id`, no `dataset_id`, no
foreign key, no upsert-on-study, no supersede-by-study. Each upload creates a
new object with its own uuid, and that uuid drives both the primary key and the
bucket path. Callers hold the id.

There is no update or overwrite. A newer result is simply another upload: a new
row, a new id, a new object. Earlier results are never mutated and their objects
are never removed, so every historical result stays downloadable by its id. The
newest result is the most recently created row — no column records supersession,
and nothing in the data links two rows as versions of the same thing.

This was chosen over a study-keyed model because results should be storable and
shareable without the plugin needing to know what produced them.

**Consequence to accept:** nothing in the system can answer "give me the results
for study X". Callers must retain result ids, or find them via the list
endpoint's `name` filter. If study lookup is later needed, a nullable,
non-FK `study_id` column plus a list filter is an additive change.

## Architecture

| Unit | Responsibility |
|---|---|
| `strategus-analysis-init/src/db/migrations/<ts>_create_strategus_results_table.ts` | Creates `strategus.results`; raw SQL against `env.PG_SCHEMA`, matching the existing migrations in that plugin |
| `src/results/entities/StrategusResult.ts` | TypeORM entity, registered in `src/db/datasource.ts` |
| `src/storage/SupabaseStorageClient.ts` | REST client over `services.supabaseStorage`, `Bearer SUPABASE_STORAGE_JWT_TOKEN`: `createBucket`, `upload`, `download` (returns the response stream), `delete` |
| `src/results/services.ts` | Validation, hashing, upload-then-insert ordering, compensating delete, stream-through on read |
| `src/results/routes.ts` | Express router, mounted at `/strategus/results` in `index.ts` |

### Why a local storage client, not the portal hop

`jobplugins` reaches storage through portal's
`/system-portal/supabase-storage/strategus-results/*`. Portal's download
base64-encodes the entire object
(`supabase.storage.controller.ts:201-228`), which would defeat binary streaming
and hold a 500MB zip in the heap twice over. The Supabase Storage API is plain
REST plus a bearer token, so a local client is roughly 80 lines and lets the
download endpoint pipe bytes straight through.

Cost: this plugin's manifest entry needs `SUPABASE_STORAGE_JWT_TOKEN`, and
`supabaseStorage` must be present in its `SERVICE_ROUTES`.

### Bucket

`strategus-results-store`, private, created idempotently on plugin start
(HTTP 409 treated as success, exactly as portal's client does).

Object path: `{resultId}/{fileName}`.

## Data model — `strategus.results`

```
id            uuid PK            -- object identity; drives the bucket path
name          varchar NOT NULL   -- human-readable label
file_name     varchar NOT NULL
file_size     bigint  NOT NULL
checksum      varchar NOT NULL   -- sha256 hex of the zip
bucket        varchar NOT NULL
storage_path  varchar NOT NULL
metadata      jsonb   NULL       -- free-form, caller-supplied
created_at    timestamp NOT NULL DEFAULT now()
updated_at    timestamp NOT NULL DEFAULT now()
created_by    varchar NOT NULL DEFAULT 'system'
modified_by   varchar NOT NULL DEFAULT 'system'
```

Audit columns mirror `StrategusAnalysis`. There is no `status` column: rows are
inserted only after a successful upload and are never updated, so the column
would hold a single constant value. A `FAILED`/`DELETED` lifecycle can be added
later if the semantics ever require one.

## API

All routes mounted at `/strategus/results`.

| Method | Path | Request | Success |
|---|---|---|---|
| `POST` | `/` | multipart: `file` (.zip), `name` (required), `metadata` (optional JSON string) | `201` + metadata incl. `id` |
| `GET` | `/` | `?limit&offset&name=` | `200` array, `created_at DESC`, metadata only |
| `GET` | `/:id` | — | `200` metadata |
| `GET` | `/:id/download` | — | `200` `application/zip` |
| `DELETE` | `/:id` | — | `200` |

### Upload (`POST`)

1. Validate auth header, `file` present, `.zip` extension, size ≤ 500MB,
   `name` present, `metadata` parses as JSON if supplied.
2. Compute sha256 over the buffer.
3. `storage.upload(bucket, "{uuid}/{fileName}", buffer)`.
4. Insert the row.

Storage first, row second: a storage failure never leaves a dangling row. The
inverse risk — an orphan object when the insert fails — is handled by a
compensating `storage.delete` in the catch block.

### Download (`GET /:id/download`)

Looks up the row, fetches the object, and pipes the storage response body
directly to the Express response with `Content-Type: application/zip`,
`Content-Disposition: attachment; filename="<file_name>"` and `Content-Length`.
No base64, no full buffering.

### No update endpoint

Results are append-only. Supplying a newer result means calling `POST /` again,
which yields a new id and a new object; the previous result is untouched and
stays downloadable. Rows are therefore written exactly once and never modified.

### Delete (`DELETE /:id`)

Removes the object, then the row. A missing object is not an error — the row is
still removed, so the API cannot be left with an undeletable record.

### Validation and errors

Validation matches the existing `jobplugins` sibling: `.zip` extension required,
500MB cap, `multer` memory storage. `multer` must be added to this plugin's
`deno.json` imports; it is not there today.

| Code | Cause |
|---|---|
| `400` | missing file, non-zip, oversize, missing `name`, malformed `metadata` |
| `401` | no authorization header |
| `404` | unknown id |
| `502` | storage unreachable |
| `500` | anything else |

Response shape `{ message }` and `console.error` logging, matching the existing
routers in this plugin.

## Security

Routes require a bearer token and nothing more, matching every sibling route in
this plugin. The scopes `strategus.results.read`, `strategus.results.write` and
`strategus.results.delete` already exist in the roles manifest; registration is
new entries in `plugins/functions/package.json` (`trex.functions.scopes`) and
`scopes_paths.csv`.

**Known gap, accepted for this cycle:** any authenticated caller can read,
or delete any result object. There is no per-tenant or per-dataset
ownership check, because results are deliberately not tied to a study and no
such check exists in this plugin today. This is recorded in the knowledge base
as debt; closing it needs an ownership concept that this design does not
introduce.

## Testing

Test-first, mirroring `tests/analysis-service.test.ts` and
`tests/analysis-routes.test.ts`. Storage client and repository are stubbed; no
live Supabase in unit tests.

Service tests: happy-path upload; orphan-object compensation when the insert
fails; checksum correctness; delete with a missing object; list paging and
ordering.

Route tests: each validation branch returns the right code; download sets the
right headers; list applies `limit`/`offset`/`name`.

## Follow-up work (not this cycle)

1. **Flow integration** — zip `/tmp/{flow_run_id}/results` after
   `upload_strategus_results()` and POST it here. Decided already, pending its
   own spec: kernel mode, the node-graph flow and `upload-results-from-storage`
   all produce a zip; failure of the zip/upload step fails the flow run; the zip
   contains the results folder only.
2. **Authorization** — close the ownership gap above.
3. **Retention** — results are append-only and objects are never deleted on
   supersession, so the bucket grows unbounded. No retention policy exists.
4. **Version lineage** — nothing records that two results are successive
   versions of the same thing; "newest" is simply the most recent `created_at`.
   Adding a `previous_id` or a group id would be an additive change.
