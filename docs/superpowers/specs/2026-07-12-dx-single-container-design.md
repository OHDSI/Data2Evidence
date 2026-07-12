# DevX in the single d2e trex container

**Date:** 2026-07-12
**Branch:** p-hoffmann/dx
**Status:** Implemented (2026-07-12)

## Goal

Collapse the dx overlay's dedicated `trex-dx` node: the `-with-dx` d2e-trex
image serves the DevX editor from the same `alp-trex` container that runs d2e.
The overlay shrinks from five services (`trex-dx`, `trex-dx-postgres`,
`trex-dx-postgrest`, `trex-dx-init`, `devx-workspaces-init`) to one one-shot
(`trex-dx-init`), and DevX moves from its own origin (`http://localhost:9001`)
to the portal origin (`https://localhost:41100`).

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
   is configured purely via `PGRST_*` env vars (`config.ts` reads them
   generically; the `trexdb.setting` layer only covers
   maxRows/dbSchema/dbExtraSearchPath/dbPool — the JWT secret must come from
   `PGRST_JWT_SECRET`).

Four more, discovered against the running develop stack (they simplify this
design below what was first approved):

4. **The base compose already provisions trex core in minerva.** `alp-trex`
   on develop already sets `DATABASE_URL` (→ minerva `alp` DB), `SCHEMA_DIR`,
   `PLUGINS_DEV_PATH`, `TREX_ROOT_KEY`, `BETTER_AUTH_SECRET/URL`
   (`docker-compose.yml:414-424`). Verified live: `trexdb` schema and the
   `authenticator`/`anon` roles exist in `alp`, migrations log `ok`, and
   `/trex/api/ready` returns 200. **No dedicated dx Postgres is needed** —
   the "keep migrations away from minerva" rationale is moot because develop
   already runs them there.
5. **Caddy already routes DevX paths.** The generated Caddyfile's default
   handler proxies all unmatched paths (including `/trex/*` and `/plugins/*`)
   to trex:33001 — verified via `https://localhost:41100/trex/api/ready` →
   200. **No caddy changes are needed.**
6. **The d2e image runs as root** (`USER root`, root entrypoint), so the
   claude/gh config volumes mount under `/root/…` and no chown one-shots are
   needed.
7. **`PGRST_JWT_SECRET` must equal HKDF(TREX_ROOT_KEY, "trex.jwt.hs256.v1")**
   — the value trex derives in-process (`core/server/auth/jwt.ts`). trex's
   `derive-secrets.ts` computes exactly this into `secrets/derived.env`, but
   it derives from `secrets/root.env` (generating a random key if absent) and
   ignores the env var — so the init must seed `root.env` from d2e's
   `${TREX_ROOT_KEY}` or the JWTs won't verify.

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
  - `depends_on` (adds to base): `trex-dx-init` completed.
  - `env_file`: `./secrets/derived.env` (`required: false`; supplies
    `PGRST_JWT_SECRET`. `TREX_ROOT_KEY` already comes from `.env.local` via
    the base `environment`, which takes precedence over env_file — that is
    why the init seeds `root.env` FROM `${TREX_ROOT_KEY}`, keeping both
    derivations aligned.)
  - `volumes` (adds): `devx-workspaces:/tmp/devx-workspaces`,
    `trex-dx-claude-config:/root/.claude`,
    `trex-dx-gh-config:/root/.config/gh` (root image — no HOME override).
  - `environment` (adds — NO `DATABASE_URL`/`SCHEMA_DIR`/`PLUGINS_DEV_PATH`
    overrides; the base already sets them against minerva `alp`):
    - `PGRST_DB_URI=postgres://authenticator:authenticator_pass@${PG_HOST:-${PROJECT_NAME:-d2e}-minerva-postgres-1}:${PG_PORT:-5432}/alp`
      (the `authenticator` role + `public.postgrest_pre_request` were created
      in `alp` by the core migrations the base stack already runs),
      `PGRST_DB_SCHEMAS=public`, `PGRST_DB_ANON_ROLE=anon`,
      `PGRST_DB_PRE_REQUEST=public.postgrest_pre_request`,
      `PGRST_OPENAPI_SERVER_PROXY_URI=https://localhost:${CADDY_PORT:-${PORT:-443}}/trex/rest/v1`
    - `BETTER_AUTH_URL=https://localhost:${CADDY_PORT:-${PORT:-443}}/trex`
      (overrides the base's `http://localhost:33001/trex` — browser flows go
      through caddy)
    - `TREX_WEB_NAV_EXTRA='[{"path":"/devx","label":"DevX","plugin":"devx"}]'`
    - `GITHUB_CLIENT_ID`, `DEVX_ENCRYPTION_KEY` passthroughs
- **`trex-dx-init`** — seeds `secrets/root.env` from `${TREX_ROOT_KEY}` when
  the file doesn't exist yet, then runs trex's `derive-secrets`
  (`/usr/local/bin/trex-init`), then chowns the files to uid 1000 so compose
  (running as the host user) can read them as env_file. Idempotent one-shot.
- **Deleted:** `trex-dx`, `trex-dx-postgres`, `trex-dx-postgrest`,
  `devx-workspaces-init`, host ports 9000/9001, volume `trex-dx-pgdata`.
  Volumes `devx-workspaces`, `trex-dx-claude-config`, `trex-dx-gh-config`
  stay.

### 3. Caddy routes

None. The generated Caddyfile's default handler already proxies `/trex/*`
and `/plugins/*` to trex:33001 (verified live). Websocket upgrades pass
through caddy's `reverse_proxy` by default.

### 4. Startup flow (first boot)

1. `trex-dx-init` seeds `root.env` from `${TREX_ROOT_KEY}`, derives
   `secrets/derived.env`, fixes ownership. (`alp-trex` reads `derived.env`
   via env_file at container *creation*; on a literal first
   `docker compose up` both are created simultaneously and the env_file is
   `required: false`, so a first boot can start trex without
   `PGRST_JWT_SECRET` — DevX REST returns auth errors until the next
   `up` recreates trex. Known compose limitation. Accepted: the overlay
   header documents "on the very first boot, run start:dx twice"; no CLI
   change in this scope.)
2. `alp-trex` boots exactly as on develop (attach `_config` → migrations →
   trexas 33001 → compat routes → plugins, now including devx → auth keys →
   `/trex/api/ready` 200). The only new boot work is the devx plugin mount.

Migration failures print `FAILED` in `alp-trex` logs without killing boot;
verification (below) catches this via `/trex/api/ready`, which stays non-200
when auth provisioning failed.

### 5. Out of scope

- Logto/better-auth SSO integration (DevX keeps its own better-auth login).
- Embedding Postgres in trex (trex core schema keeps living in minerva `alp`,
  as develop already has it).
- Multi-node / remote-session topologies.

## Verification

Fresh `npm run dx -- clean` + `npm run start:dx`:

1. Containers added by the overlay: exactly `alp-trex-dx-init` (exited 0).
   No `alp-trex-dx`, no dx postgres, no postgrest.
2. `alp-trex` healthy; logs show `Running core schema migrations ... ok` and
   no `FAILED`.
3. `curl -k https://localhost:41100/d2e/portal/` → 200; portal login works
   (d2e regression check).
4. `docker exec alp-trex node -e "fetch('http://localhost:33001/trex/api/ready')…"`
   → 200 (auth keys provisioned).
5. `https://localhost:41100/plugins/trex/devx/` loads; signing in with the
   seeded dev admin (admin@trex.local / password) succeeds; DevX appears in
   the trex shell nav.
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
  Local pool; exhaustion shows as lease timeouts. Unchanged from develop
  (base sets `TREX_POOL_SIZE=1024` against minerva `max_connections=1000` —
  a pre-existing headroom wrinkle this design neither worsens nor fixes; the
  in-process PostgREST adds ~10 connections via `PGRST_DB_POOL` default).
- **Single origin**: `BETTER_AUTH_URL` pins DevX auth to
  `https://localhost:41100`; direct-port access goes away by design.
