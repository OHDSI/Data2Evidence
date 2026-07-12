# DevX in the Single alp-trex Container — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Collapse the dx overlay so the `-with-dx` d2e-trex image serves the DevX editor from the same `alp-trex` container that runs d2e, at `https://localhost:41100/plugins/trex/devx/`.

**Architecture:** The base compose already provisions everything trex core needs (migrations into minerva `alp`, better-auth, caddy default-route to trex:33001). The overlay therefore shrinks to: a `trex` service override (dx image + PostgREST/DevX envs + volumes) and one `trex-dx-init` one-shot that seeds `secrets/root.env` from d2e's `TREX_ROOT_KEY` and derives `PGRST_JWT_SECRET`. Everything else in the overlay is deleted.

**Tech Stack:** Docker Compose overlays, trexsql-dx base image `sha-bcc2221a…`, in-process `@trex/postgrest` plugin, d2e CLI (`npm run dx -- …`).

**Spec:** `docs/superpowers/specs/2026-07-12-dx-single-container-design.md` — read it first; its "Why this is possible now" section lists the seven verified facts this plan builds on.

## Global Constraints

- Working directory: `/home/ph/code/d2e/.claude/worktrees/dx` (git worktree, branch `p-hoffmann/dx`). Do not cd to the main checkout.
- trexsql-dx base pin everywhere: `ghcr.io/ohdsi/trexsql-dx:sha-bcc2221ab4ebada5a1444cf151008b04c0ecf5bc` (must stay in sync between `docker-compose-dx.yml` and `.github/workflows/docker-build-push.yaml`).
- `PGRST_JWT_SECRET` must be the HKDF derivation of the SAME `TREX_ROOT_KEY` that `.env.local` provides — never set it manually; only `derive-secrets` (via `trex-dx-init`) may produce it.
- Do NOT override `DATABASE_URL`, `SCHEMA_DIR`, `PLUGINS_DEV_PATH`, `TREX_ROOT_KEY`, `BETTER_AUTH_SECRET`, `BASE_PATH`, or `D2E_COMPAT` in the overlay — the base compose (docker-compose.yml:414-424) already sets them correctly.
- No changes to the generated Caddyfile — the default handler already routes `/trex/*` and `/plugins/*` to trex:33001.
- Comments in changed files must be production-grade (no conversation references).

---

### Task 1: Dockerfile.v2 — remove the trex-core duplicate

With a single trexas there is no second core to serve; the copy is dead weight in the image.

**Files:**
- Modify: `services/trex/Dockerfile.v2:107-117` (the `D2E_COMPAT`/trex-core comment block + `RUN cp -a`)

**Interfaces:**
- Produces: an image whose only core is `/usr/src/core` (nothing else changes; Task 2's compose serves DevX from the base's plugins-dev, not from a second core).

- [ ] **Step 1: Replace the comment block and RUN line**

The current block (lines 107–117):

```dockerfile
# D2E_COMPAT is activated at runtime via the D2E_COMPAT=true env (set in compose),
# which makes /usr/src/core serve the d2e main service.
#
# The dx compose also runs trex's canonical core (the devx code editor in the
# trexsql-dx base) as a SECOND trexas main service on a separate port, reading
# from /usr/src/trex-core. Since the base core IS that canonical core, duplicate
# it there rather than moving it (d2e-main still needs /usr/src/core). For the
# plain trexsql base this is just an unused copy.
RUN cp -a /usr/src/core /usr/src/trex-core
```

becomes:

```dockerfile
# D2E_COMPAT is activated at runtime via the D2E_COMPAT=true env (set in compose),
# which makes /usr/src/core serve the d2e main service. The compat layer adds
# d2e routes on top of the canonical core, so the same trexas also serves
# trex's own shell and plugins (including devx in the trexsql-dx base).
```

- [ ] **Step 2: Verify no other trex-core references remain**

Run: `grep -rn 'trex-core' services/trex/ docker-compose*.yml`
Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add services/trex/Dockerfile.v2
git commit -m "trex image: drop the /usr/src/trex-core duplicate — one trexas serves both d2e and the trex shell"
```

### Task 2: Rewrite docker-compose-dx.yml as a trex override + secrets init

**Files:**
- Modify: `docker-compose-dx.yml` (full rewrite — replace entire file content)

**Interfaces:**
- Consumes: base compose `trex` service (docker-compose.yml:75) — env vars `TREX_ROOT_KEY`, `DATABASE_URL` (minerva `alp`), `SCHEMA_DIR`, `PLUGINS_DEV_PATH`, `BETTER_AUTH_SECRET` are inherited, NOT redefined.
- Produces: merged `trex` service that Task 3 boots; `secrets/derived.env` consumed by trex's env_file.

- [ ] **Step 1: Replace the entire file with:**

```yaml
# DevX override — layered LAST on docker-compose.yml (+ docker-compose-local.yml).
#
# Serves the DevX editor from d2e's own trex container: the -with-dx image
# (trexsql-dx base) ships the devx plugin in /usr/src/plugins-dev, and the
# base stack already provides everything else it needs — trex's core-schema
# migrations run into minerva's `alp` DB (authenticator/anon roles,
# better-auth, trexdb.*), caddy's default handler routes /trex/* and
# /plugins/* to trexas on 33001, and PostgREST is served in-process by the
# @trex/postgrest plugin (PGRST_* envs below; no sidecar).
#
# The only extra service is trex-dx-init, which derives PGRST_JWT_SECRET
# from TREX_ROOT_KEY into ./secrets/derived.env. It must derive from the
# SAME root key .env.local gives trex (compose `environment` wins over
# env_file), so it seeds ./secrets/root.env from ${TREX_ROOT_KEY} first.
#
# Run via the CLI scripts (they append this file with `-c`):
#   npm run build:dx     # build the -with-dx image
#   npm run start:dx     # bring up the d2e stack with DevX
#   npm run stop:dx
#
# NOTE: on the very first boot ./secrets/derived.env does not exist yet when
# compose creates the trex container (env_file is resolved at creation), so
# DevX REST auth only works after a second `npm run start:dx` recreates trex.
#
# Editor: https://localhost:41100/plugins/trex/devx/ (portal origin; the
# DevX entry also appears in the trex shell top nav).

volumes:
  devx-workspaces:
  trex-dx-claude-config:
  trex-dx-gh-config:

services:
  # Seeds ./secrets/root.env from d2e's TREX_ROOT_KEY (so all derivations
  # match the key trex gets from .env.local), derives the downstream
  # secrets (PGRST_JWT_SECRET et al), and makes the files readable by the
  # host user for compose env_file loading. Idempotent.
  trex-dx-init:
    image: ${DOCKER_IMAGE_PREFIX:-ghcr.io/ohdsi/}d2e-trex:${DOCKER_TAG_NAME:-develop}-with-dx
    container_name: ${PROJECT_NAME:-d2e}-trex-dx-init
    entrypoint:
      - /bin/sh
      - -c
      - |
        set -eu
        if [ ! -f /shared/root.env ] && [ -n "$${TREX_ROOT_KEY:-}" ]; then
          umask 077
          printf 'TREX_ROOT_KEY=%s\n' "$$TREX_ROOT_KEY" > /shared/root.env
          echo "[trex-dx-init] seeded root.env from TREX_ROOT_KEY"
        fi
        /usr/local/bin/trex-init
        chown 1000:1000 /shared/root.env /shared/derived.env
    environment:
      TREX_SECRETS_DIR: /shared
      TREX_ROOT_KEY: ${TREX_ROOT_KEY}
    volumes:
      - ./secrets:/shared
    restart: "no"
    networks:
      - alp

  # d2e's trex, switched to the -with-dx image. The devx plugin loads from
  # the base's /usr/src/plugins-dev (already on PLUGINS_DEV_PATH); the
  # in-process PostgREST plugin serves /trex/rest/v1 against minerva `alp`,
  # where the base stack's core-schema migrations created the authenticator
  # role and public.postgrest_pre_request.
  trex:
    image: ${DOCKER_IMAGE_PREFIX:-ghcr.io/ohdsi/}d2e-trex:${DOCKER_TAG_NAME:-develop}-with-dx
    build:
      context: ./services/trex
      dockerfile: ./Dockerfile.v2
      args:
        # Keep in sync with the -with-dx build in docker-build-push.yaml.
        BASE_IMAGE: ghcr.io/ohdsi/trexsql-dx:sha-bcc2221ab4ebada5a1444cf151008b04c0ecf5bc
        PLUGINS_FROM_REGISTRY: ${PLUGINS_FROM_REGISTRY:-@data2evidence/d2e-ui @data2evidence/d2e-functions @data2evidence/fhir @data2evidence/d2e-flows @data2evidence/i2b2-flow @data2evidence/search-embedding-flow @data2evidence/data-management-flow @data2evidence/hades-flow @data2evidence/loyalty-score-flow @data2evidence/data-transformation-flow}
    depends_on:
      trex-dx-init:
        condition: service_completed_successfully
    env_file:
      # PGRST_JWT_SECRET — must be the HKDF derivation of TREX_ROOT_KEY that
      # trex computes in-process; derive-secrets (trex-dx-init) writes it.
      - path: ./secrets/derived.env
        required: false
    volumes:
      - devx-workspaces:/tmp/devx-workspaces
      # This image runs as root; claude-code/gh read config from /root.
      - trex-dx-claude-config:/root/.claude
      - trex-dx-gh-config:/root/.config/gh
    environment:
      # Browser-facing better-auth flows go through caddy, not port 33001.
      BETTER_AUTH_URL: "https://localhost:${CADDY_PORT:-${PORT:-443}}/trex"
      # In-process PostgREST (@trex/postgrest plugin) against minerva `alp`.
      PGRST_DB_URI: postgres://authenticator:authenticator_pass@${PG_HOST:-${PROJECT_NAME:-d2e}-minerva-postgres-1}:${PG_PORT:-5432}/alp
      PGRST_DB_SCHEMAS: public
      PGRST_DB_ANON_ROLE: anon
      PGRST_DB_PRE_REQUEST: public.postgrest_pre_request
      PGRST_OPENAPI_SERVER_PROXY_URI: "https://localhost:${CADDY_PORT:-${PORT:-443}}/trex/rest/v1"
      # Surface DevX in trex's web shell top nav.
      TREX_WEB_NAV_EXTRA: '[{"path":"/devx","label":"DevX","plugin":"devx"}]'
      # GitHub device-flow OAuth (DevX → Connect GitHub). Optional; bundled default used if unset.
      GITHUB_CLIENT_ID: ${GITHUB_CLIENT_ID:-}
      # AES-256 key (64 hex) for DevX integration-token storage. Optional.
      DEVX_ENCRYPTION_KEY: ${DEVX_ENCRYPTION_KEY:-}
```

- [ ] **Step 2: Validate the merged config**

Run: `npm run dx -- config > /tmp/claude-1000/-home-ph-code-d2e--claude-worktrees-dx/d617f30d-9500-4a81-a052-a30e25b93994/scratchpad/merged.yml 2>&1; grep -n 'with-dx\|trex-dx\|9001\|PGRST_DB_URI' /tmp/claude-1000/-home-ph-code-d2e--claude-worktrees-dx/d617f30d-9500-4a81-a052-a30e25b93994/scratchpad/merged.yml | head -20`

Expected:
- `trex` service image ends in `-with-dx`
- `trex-dx-init` present; NO `trex-dx:`, `trex-dx-postgres`, `trex-dx-postgrest`, `devx-workspaces-init` services
- no host port 9001/9000 anywhere
- `PGRST_DB_URI` resolved against `d2e-minerva-postgres-1:5432/alp`

Also confirm the base env survives the merge (overlay must NOT have clobbered it):
`grep -n 'DATABASE_URL\|SCHEMA_DIR\|D2E_COMPAT\|BETTER_AUTH_URL' /tmp/claude-1000/-home-ph-code-d2e--claude-worktrees-dx/d617f30d-9500-4a81-a052-a30e25b93994/scratchpad/merged.yml | head`
Expected: `DATABASE_URL` → minerva `alp`, `SCHEMA_DIR: /usr/src/core/schema`, `D2E_COMPAT: "true"`, and `BETTER_AUTH_URL` = the caddy https URL (overlay value won).

- [ ] **Step 3: Commit**

```bash
git add docker-compose-dx.yml
git commit -m "dx overlay: serve DevX from alp-trex — drop the dedicated trex-dx node, its postgres and postgrest sidecars"
```

### Task 3: Fresh-boot the collapsed stack and run the verification battery

**Files:**
- No source changes (stack operation + verification; fixes discovered here get their own commits).

**Interfaces:**
- Consumes: Tasks 1–2 (image content + overlay); `.env.local` with `TREX_ROOT_KEY` set (already present).

- [ ] **Step 1: Remove stale secrets (derived from a random key, not .env.local's)**

```bash
rm -f secrets/root.env secrets/derived.env
```

(The old files belonged to the deleted dedicated-postgres topology and their root key never matched `.env.local` — every DevX credential they backed is already gone with the volume wipe.)

- [ ] **Step 2: Clean, rebuild, start**

```bash
echo y | npm run dx -- clean 2>&1 | tail -3
npm run build:dx 2>&1 | tail -5     # rebuilds d2e-trex:develop-with-dx with Task 1's Dockerfile
npm run start:dx 2>&1 | tail -5
# First boot creates trex before derived.env exists (env_file resolved at
# container creation) — run once more so trex is recreated with PGRST_JWT_SECRET:
npm run start:dx 2>&1 | tail -5
```

Expected: second `start:dx` ends with all services `Healthy`/`Started`, exit 0. (These are long-running: use a background task with a log file, not a foreground pipe.)

- [ ] **Step 3: Container topology check**

Run: `docker ps -a --format '{{.Names}}\t{{.Status}}' | grep -E 'alp-trex|trex-dx'`
Expected: `alp-trex` Up (healthy), `alp-trex-dx-init` Exited (0). Nothing else matching `trex-dx`.

- [ ] **Step 4: Migration + ready check**

```bash
docker logs alp-trex 2>&1 | grep -E 'core schema migrations|FAILED' | head -3
docker exec alp-trex node -e "fetch('http://localhost:33001/trex/api/ready').then(r=>console.log(r.status))"
```

Expected: `Running core schema migrations ... ok`, no `FAILED`; ready prints `200`.

- [ ] **Step 5: d2e regression + DevX reachability via caddy (single origin)**

```bash
curl -skL -o /dev/null -w 'portal: %{http_code}\n'  https://localhost:41100/d2e/portal
curl -sk  -o /dev/null -w 'ready:  %{http_code}\n'  https://localhost:41100/trex/api/ready
curl -skL -o /dev/null -w 'devx:   %{http_code}\n'  https://localhost:41100/plugins/trex/devx/
curl -sk  -o /dev/null -w 'rest:   %{http_code}\n'  https://localhost:41100/trex/rest/v1/
```

Expected: portal 200, ready 200, devx 200, rest 200 (or 401 — PostgREST answering with an auth error still proves the in-process plugin is up; 503 `postgrest plugin not loaded` is a FAILURE).

- [ ] **Step 6: DevX functional check (browser-level)**

Using playwright MCP or a browser: open `https://localhost:41100/plugins/trex/devx/`, sign in (better-auth — create the first account if prompted), confirm the DevX editor shell renders and the "DevX" entry appears in the trex web nav. Create a workspace and run a trivial command in it (exercises devx_ext + the devx-workspaces volume).

Expected: no redirect to `localhost:33001` (would mean the `BETTER_AUTH_URL` override didn't take), no 401 loop on `/trex/rest/v1` calls (would mean `PGRST_JWT_SECRET` mismatch — recheck Task 2 Step 1's init seeding and that trex was recreated after derived.env existed).

- [ ] **Step 7: e2e smoke (d2e regression)**

```bash
cd tests/e2e && npx playwright test tests/01-example.spec.ts 2>&1 | tail -5
```

Expected: PASS (login + portal snapshot happy path). Check tests/e2e/README or package.json for required env if the runner needs setup.

- [ ] **Step 8: Update memory + commit any fixes**

If Steps 2–7 required compose/Dockerfile fixes, they were committed as they were made; otherwise nothing to commit here. Update the stale auto-memory `project_atlas_subplugin_dev_loop.md` / dx-related memories only if their content is now wrong.

### Task 4: Sync the docs that describe the old topology

**Files:**
- Modify: `docs/superpowers/specs/2026-07-12-dx-single-container-design.md` (only if verification forced deviations — mark Status: Implemented)
- Check: `README*.md`, `docs/**` for mentions of port 9001/9000 or `trex-dx-postgres` in dx instructions

**Interfaces:**
- Consumes: final working topology from Task 3.

- [ ] **Step 1: Grep for stale topology references**

Run: `grep -rn 'trex-dx-postgres\|trex-dx-postgrest\|localhost:9001\|localhost:9000' README*.md docs/ --include='*.md' | grep -v superpowers/plans`
Expected: only the spec's historical narrative (fine). Fix any user-facing doc that instructs connecting to 9001.

- [ ] **Step 2: Set spec Status to Implemented and note deviations (if any)**

```bash
git add docs/
git commit -m "docs: dx overlay topology — DevX served from alp-trex at the portal origin"
```
