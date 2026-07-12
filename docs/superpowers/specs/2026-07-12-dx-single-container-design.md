# DevX in the single d2e trex container

**Date:** 2026-07-12
**Branch:** p-hoffmann/dx
**Status:** Approved

## Goal

Collapse the dx overlay's dedicated `trex-dx` node: the `-with-dx` d2e-trex
image serves the DevX editor from the same `alp-trex` container that runs d2e.
The overlay shrinks from five services (`trex-dx`, `trex-dx-postgres`,
`trex-dx-postgrest`, `trex-dx-init`, `devx-workspaces-init`) to two
(`trex-dx-init`, `trex-dx-postgres`), and DevX moves from its own origin
(`http://localhost:9001`) to the portal origin (`https://localhost:41100`).

## Why this is possible now

Three facts, verified against `~/code/trex` (b9409136) and the
`ghcr.io/ohdsi/trexsql-dx:sha-bcc2221a…` base:

1. **One trexas serves both cores' behavior.** `applyD2eCompat(app)` mounts
   d2e routes on the Express app *before* `Plugins.initPlugins(app)` mounts
   plugins (including devx from `PLUGINS_DEV_PATH`). Compat adds d2e routes;
   it does not replace the canonical core. A second trexas instance is
   unnecessary — and would inherit `D2E_COMPAT=true` anyway, since trexas has
   no per-service env (`TrexServerConfig` carries no env field).
2. **`data_node` defaults to `true`** (`plugins/db/src/config.rs`,
   `plugins/pool/src/lib.rs`). `alp-trex` is already a data node; it never ran
   trex's core-schema migrations only because `SCHEMA_DIR`/`DATABASE_URL` were
   never set. The overlay comment "d2e's node can't execute the migration"
   described the stale migration extension baked into the old `sha-2f0e…`
   base — fixed in `sha-bcc2221a…` (which supersedes the local
   `trexsql-dx:fixed` overlay workaround).
3. **PostgREST runs in-process.** The `@trex/postgrest` plugin replaced the
   sidecar (upstream `f2f5be8b` cutover, `6297f39b` removed sidecar mode); it
   is configured purely via `PGRST_*` env vars.

Postgres itself stays a container: trex has no embedded Postgres, and the
core-schema migrations (better-auth tables, `authenticator` role, DEK
wrapping) are real PL/pgSQL. The dedicated `trex-dx-postgres` keeps trex's
migrations away from d2e's minerva database — its roles (`authenticator`,
`anon`, `supabase_admin`) are cluster-global and would collide with
supabase-storage state in minerva.

## Changes

### 1. `services/trex/Dockerfile.v2`

Remove `RUN cp -a /usr/src/core /usr/src/trex-core` and its comment block.
With one trexas there is no second core to serve. Keep the parameterized
`ARG BASE_IMAGE` (default: the plain trexsql base pinned by develop; the
`-with-dx` CI build and the dx overlay's `build:` pass the trexsql-dx base).

### 2. `docker-compose-dx.yml`

Rewrite header comment to describe the merged topology. Services:

- **`trex` (override, merged over the base compose):**
  - `image`: `…d2e-trex:${DOCKER_TAG_NAME:-develop}-with-dx`; the `build:`
    section (context `./services/trex`, `BASE_IMAGE` = trexsql-dx pin,
    `PLUGINS_FROM_REGISTRY`) moves here from the deleted `trex-dx`.
  - `depends_on` (adds to base): `trex-dx-init` completed,
    `trex-dx-postgres` healthy.
  - `env_file`: `./secrets/root.env`, `./secrets/derived.env`
    (both `required: false`; supplies `TREX_ROOT_KEY`, `PGRST_JWT_SECRET`,
    better-auth secrets).
  - `volumes` (adds): `devx-workspaces:/tmp/devx-workspaces`,
    `trex-dx-claude-config:/root/.claude`,
    `trex-dx-gh-config:/root/.config/gh`. The d2e container runs as root, so
    configs mount under `/root` (no `HOME` override) and no chown init is
    needed.
  - `environment` (adds):
    - `DATABASE_URL=postgres://postgres:${TREX_DX_POSTGRES_PASSWORD:-mypass}@trex-dx-postgres:5432/testdb`
      (engine attaches it as `_config`)
    - `SCHEMA_DIR=/usr/src/core/schema` (data node runs core migrations)
    - `PGRST_DB_URI=postgres://authenticator:authenticator_pass@trex-dx-postgres:5432/testdb`,
      `PGRST_DB_SCHEMAS=public`, `PGRST_DB_ANON_ROLE=anon`,
      `PGRST_DB_PRE_REQUEST=public.postgrest_pre_request`,
      `PGRST_OPENAPI_SERVER_PROXY_URI=https://localhost:41100/trex/rest/v1`
    - `BETTER_AUTH_URL=https://localhost:41100/trex`
    - `PLUGINS_DEV_PATH=/usr/src/plugins-dev` (devx plugin lives there in the
      dx base)
    - `TREX_WEB_NAV_EXTRA='[{"path":"/devx","label":"DevX","plugin":"devx"}]'`
    - `GITHUB_CLIENT_ID`, `DEVX_ENCRYPTION_KEY` passthroughs
    - Pool sizing: `TREX_POOL_SIZE`, `TREX_PG_CONNECTION_LIMIT`,
      `TREX_POOL_LEASE_TIMEOUT_MS` — must satisfy
      `TREX_POOL_SIZE <= TREX_PG_CONNECTION_LIMIT <= max_connections (1200)`.
      If the base compose already sets any of these, keep the base value and
      only ensure the invariant holds.
- **`trex-dx-init`** — unchanged (generates `secrets/{root,derived}.env`,
  idempotent, one-shot).
- **`trex-dx-postgres`** — unchanged (postgres:16, DB name `testdb` —
  hardcoded in trex's `V1__initial_schema.sql` grant — `wal_level=logical`,
  `max_connections=1200`).
- **Deleted:** `trex-dx`, `trex-dx-postgrest`, `devx-workspaces-init`, host
  ports 9000/9001. Volumes `devx-workspaces`, `trex-dx-pgdata`,
  `trex-dx-claude-config`, `trex-dx-gh-config` stay.

### 3. Caddy routes (`docker-compose.yml`, generated Caddyfile)

Add to the base Caddyfile heredoc, proxying to
`http://{PROJECT_NAME}-trex.{TLS__INTERNAL__DOMAIN}:33001`:

- `handle /trex/*` — trex shell, better-auth (`/trex/auth/*`),
  `/trex/api/*`, in-process PostgREST (`/trex/rest/*`)
- `handle /plugins/*` — DevX UI (`/plugins/trex/devx/`), `devx-api`, and the
  Vite HMR websocket tunnel (`/plugins/*/devx-api/apps/*/proxy/*`); needs the
  same websocket matcher treatment as the existing jupyter route

These routes live in the base file (not the overlay) because caddy's config
is an inline heredoc that an overlay cannot extend without duplicating it
wholesale. Without the dx overlay they proxy to plain trex — shell endpoints
respond, devx paths 404 — which is harmless.

Implementation must verify neither prefix collides with existing caddy
handles or portal SPA routes (check the heredoc for existing `/trex` or
`/plugins` matchers before adding).

### 4. Startup flow (first boot)

1. `trex-dx-init` writes `secrets/{root,derived}.env` (idempotent;
   `alp-trex` reads them via `env_file`, so they must exist before the
   container is *created* — compose ordering handles this via `depends_on`
   since the init completes before trex starts, but a literal first
   `docker compose up` creates both simultaneously; the env_files are
   `required: false`, so a first-boot race yields a trex missing
   `TREX_ROOT_KEY` that crash-loops until the next `up`. Known compose
   limitation, same as today. Accepted: the overlay header documents "on the
   very first boot, run start:dx twice"; no CLI change in this scope.)
2. `trex-dx-postgres` healthy.
3. `alp-trex` boots: engine attaches `_config` → runs
   `trex_migration_run_schema` (data node + `SCHEMA_DIR`) → trexas on 33001
   starts → compat mounts d2e routes → plugins mount (devx) → better-auth
   keys written to DB → `/trex/api/ready` flips to 200.

Migration failures print `FAILED` in `alp-trex` logs without killing boot;
verification (below) catches this via `/trex/api/ready`, which stays non-200
when auth provisioning failed.

### 5. Out of scope

- Logto/better-auth SSO integration (DevX keeps its own better-auth login).
- Removing the `trex-dx-postgres` container (no embedded Postgres in trex).
- Multi-node / remote-session topologies.

## Verification

Fresh `npm run dx -- clean` + `npm run start:dx`:

1. Containers added by the overlay: exactly `alp-trex-dx-init` (exited 0) and
   `alp-trex-dx-postgres` (healthy). No `alp-trex-dx`, no postgrest.
2. `alp-trex` healthy; logs show `Running core schema migrations ... ok` and
   no `FAILED`.
3. `curl -k https://localhost:41100/d2e/portal/` → 200; portal login works
   (d2e regression check).
4. `docker exec alp-trex node -e "fetch('http://localhost:33001/trex/api/ready')…"`
   → 200 (auth keys provisioned).
5. `https://localhost:41100/plugins/trex/devx/` loads; better-auth sign-in
   succeeds; DevX appears in the trex shell nav.
6. `https://localhost:41100/trex/rest/v1/` answers (in-process PostgREST with
   JWT from derived.env).
7. DevX workspace create + a command execution works (devx_ext + workspaces
   volume + claude/gh config mounts).
8. Existing e2e smoke (login + concepts happy path) passes against the dx
   stack.

## Risks & fallback

- **Compat + devx on one app** is the least-tested combination. Watch for
  route shadowing (d2e-ui SPA fallback vs `/plugins/*`) and authz middleware
  applying to devx routes. Fallback: Approach B — second trexas on 8001
  serving a compat-disabled copy of the core (requires patching
  `d2e-compat/index.ts` in the copy at image build).
- **Shared DuckDB pool**: DevX command sessions and d2e queries now share one
  Local pool; exhaustion shows as lease timeouts. Mitigation: pool-size
  invariant above.
- **Single origin**: `BETTER_AUTH_URL` pins DevX auth to
  `https://localhost:41100`; direct-port access goes away by design.
