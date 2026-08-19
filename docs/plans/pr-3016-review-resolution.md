# PR #3016 — Review Resolution Plan

**Reviewer:** p-hoffmann · **Branch:** `SantanM/internal-2846_enable-tls-in-services` → `develop`
**Review state:** CHANGES_REQUESTED · **PR:** https://github.com/OHDSI/Data2Evidence/pull/3016

## Next action items (open after the 18 pushed commits)

1. ~~**Chart parity for the post-init CA trust.**~~ **RESOLVED — no chart change needed.**
   The chart does deploy `logto-post-init` (`templates/d2e-deployment.yaml:90-232`) but gives
   it `LOGTO__ADMIN_SERVER__FQDN_URL: "http://idp-admin.d2e.svc.cluster.local:443"` — plain
   HTTP. No TLS handshake, so no CA to install and nothing to verify;
   `NODE_TLS_REJECT_UNAUTHORIZED` appears nowhere in `charts/`. Item 3 is fully closed by the
   compose change alone.

   Two findings from that check, both larger than this PR:
   - **There are zero `https://…svc.cluster.local` URLs in the whole chart.** Every internal
     hop in Helm is plaintext, so this PR's internal-TLS work — and the security improvement
     the review was pressing for — is compose-only. The same threat (anything winning a DNS
     or routing race reads the M2M and client secrets in flight) applies in-cluster today.
   - The chart hands `TLS__INTERNAL__CRT`/`KEY` to `trex` (serves TLS on 33000, but no
     in-cluster client dials it over https) and to `pg-mgmt-init` (no TLS listener at all).
     The CI-cert SAN fix from M1e is therefore defensive in the chart, not load-bearing —
     it becomes necessary the moment an in-cluster hop moves to `https://`.
2. ~~**supabase-storage published image is missing the PR's entrypoint.**~~ **DOCUMENTED**
   (commit `df42272a`). The custom image adds nginx in front of `storage-api` (which has no
   native TLS) via `services/supabase-storage/{Dockerfile,entrypoint.sh,nginx.conf}`, but the
   `image:` key still resolves to the published `:develop` tag, built from develop's Dockerfile
   (`postgresql-client` only). Starting the branch without building first fails with
   `stat /usr/src/entrypoint.sh: no such file or directory`, and `npm run start` never builds.
   Fix applied: a build note at the `image:` key. **CI is unaffected** — it builds the image
   from source (`docker-build-push.yaml:250-252`) and deploys by run tag; an earlier claim that
   CI would fail was wrong. Self-heals once this merges and develop publishes the new image.
   Still to do: one line in the PR description telling reviewers to run
   `docker compose build supabase-storage` once.
3. **CROSS-REPO, BLOCKS SSO: rebuild the logto base image, then bump its digest.**
   Commit `8a594952` fixes a regression this PR introduced: the bundled connectors
   (`connector-alp-azuread`, `connector-alp-entra-external-id`) call Logto's own API at
   `http://localhost:$PORT`, and `HTTPS_CERT_PATH` leaves no plaintext listener — verified
   inside the container (`http` → ECONNRESET, `https` → 204, nothing plain on 3001/3002/3003).
   Dormant until a social connector is configured, so no local run catches it; compose
   deployments with AzureAD/Entra SSO fail at sign-in. The chart is unaffected (its Logto
   serves HTTP).

   The compose half (`LOGTO__SELF_BASE_URL` + `NODE_EXTRA_CA_CERTS`) is verified working, but
   the connector source change is **inert until the base image is rebuilt**:
   `services/alp-logto/Dockerfile` is a single `FROM ghcr.io/data2evidence/logto-with-logto-schema@sha256:dde8283…`,
   and that image — built in **data2evidence/logto** — does
   `git clone --branch ${D2E_VERSION:-develop} OHDSI/Data2Evidence` then compiles the
   connectors from `services/alp-logto/connector-*`. Sequence: merge this → rebuild that
   image → bump the digest pin here. Until all three, the SSO path stays broken.
4. **>100-user pagination not verified live.** Item 4a is proven by the unit harness only;
   the local tenant has one user, so live and broken behave identically. Seed >100 users to
   demonstrate it end to end.
4. **Scan-report binary download not verified live** (Item 4b) — needs a white-rabbit scan.
5. **Dead-code sweep.** ~10 inert commented-out `httpsAgent` blocks remain in
   `plugins/functions/{demo,alp-usermgmt}/**`; decide whether `TLS__EXTRA__CA_CRTS` should
   also be wired into `alp-dataflow-gen-worker`.
6. **Stale knowledge-base entry.** `gotchas/edge-function-internal-tls-runtime-fix.md`
   claims `develop` needs `d2e-trex:local-trexruntime-fix`; the develop image now works.
7. **Pre-existing bug worth its own ticket.** `services/alp-logto/post-init/src/main.ts:733`
   — `.filter((rs) => userRoles.map((x) => x.roleIds === rs.id))` returns an array, always
   truthy, so the filter is a no-op and "User-Roles creation successful" is meaningless.
8. **Reply to the 10 review threads** on PR #3016.

## Execution notes (added during implementation)

- `scripts/docker-compose-embed.ts` is **gitignored** (`.gitignore:82`) — a build
  artifact regenerated from `docker-compose.yml` by `scripts/embed-assets.mjs`. The
  "regenerate the embed" steps in Milestones 1 and 2 were dropped; there is no drift risk.
- **Milestone 3a took the documented fallback.** 8 of the 13 shim-holding functions have no
  `_shared` relationship in their import maps, and no TS file imports `_shared` by relative
  path, so consolidation needs its own change with packaging verification. Instead the three
  fixes were applied to all 13 copies and `internal/scripts/check-axios-shim-sync.mjs` now
  fails CI-style on drift (`--fix` propagates the canonical copy). **Follow-up ticket: move the
  shim into `plugins/functions/_shared/`.**
- **Extra defect found and fixed in M1c self-review:** `.Values.global.tls.internalDomain`
  errors with a nil pointer when `global.tls` is absent (as it is in every existing values
  file). Fixed with Helm's parenthesized nil-safe form.
- Two docs keep `alp.local` deliberately — they reference legacy `alp-minerva-*` container
  names that no longer exist, so flipping only the domain would make them half-correct.

**Decisions taken**

- Internal domain unifies on **`d2e.local`** (the generated cert stays as-is; consumers move to it).
- Items 3 and 7 are **deferred** — see "Deferred" below.
- Verification runs **once at the end**, after all milestones (project test cadence: final-run-only).

---

## Milestone 1 — Unify the internal TLS domain

*Resolves Item 1 (`docker-compose.yml:205`). Blocking: without it the new HTTPS hops fail hostname
verification, because the cert SAN is `*.d2e.local` while the hostnames resolve `*.alp.local`.*

Split into five commits:

### 1a. `fix(tls): flip internal domain default to d2e.local in compose`

| File | Occurrences |
|---|---|
| `docker-compose.yml` | 51 (all the parameterized `${TLS__INTERNAL__DOMAIN:-…}` form) |
| `docker-compose-local.yml` | 6 |
| `internal/scripts/sort-dc.mjs:14,189` | generator that emits the default — must flip or it reverts the compose file on next sort |
| `scripts/docker-compose-embed.ts` | 33 — **regenerate**, do not hand-edit |

**Verify:** `docker compose config | grep -o '[a-z0-9-]*\.\(alp\|d2e\)\.local' | sort -u` → all `d2e.local`.

### 1b. `fix(tls): flip internal domain default in plugin function manifests`

- `plugins/functions/package.json`
- `plugins/functions/package.org.json`
- `plugins/fhir_functions/package.json`
- `plugins/sibyl_functions/package.json`

**Verify:** `grep -rn "alp\.local" plugins/*/package*.json` → empty.

### 1c. `fix(tls): drive Helm internal domain from a single value`

Replace three hardcoded `value: alp.local` literals with one `.Values.tls.internalDomain`
(default `d2e.local`) so they cannot drift again:

- `charts/d2e-services/charts/d2e-core/templates/core-deployment.yaml:204`
- `charts/d2e-services/charts/d2e-core/templates/core-deployment.yaml:347`
- `charts/d2e-services/templates/d2e-deployment.yaml:915`

**Verify:** `helm template charts/d2e-services | grep -A1 TLS__INTERNAL__DOMAIN` → all `d2e.local`.

### 1d. `fix(tls): update hardcoded alp.local hosts the variable flip misses`

These do **not** go through `${TLS__INTERNAL__DOMAIN}` and would silently keep pointing at the old name:

- `scripts/get-noproxy.mjs:48` — seeds `NO_PROXY` with `.alp.local`; left alone, every internal call
  starts traversing the proxy.
- `plugins/sibyl_functions/metadata-api/index.ts:33` — literal
  `https://d2e-supabase-storage-1.alp.local:9000` fallback.
- `tests/security/test_kernel_network_isolation.R:36,74,110-111` — literal `d2e-trex.alp.local`
  targets. This test asserts network isolation, so a stale hostname makes it pass vacuously.
- Docs: `docs/website/docs/2-admin_guide/6-knowledgebase/5-tls/README.md`,
  `docs/website/docs/0-getting_started/README.md`,
  `internal/docs/3-configure/6-create-duckdb-file.md`.

**Verify:** `grep -rn "alp\.local" --exclude-dir=node_modules --exclude-dir=.git .` → only intentional
backwards-compat mentions remain.

### 1e. `fix(tls): single domain variable for cert generation, and add SAN to the CI cert`

Two halves of the same defect — cert material generated against a different variable than the
consumers read.

1. `scripts/lib.sh:12,39` and `scripts/lib.ts:23-24,239-241`: read `TLS__INTERNAL__DOMAIN` first,
   falling back to `TLS__INTERNAL__DOMAIN_NAME` for compat; parameterize the SAN as
   `*.${DOMAIN}` + `${DOMAIN}` instead of the hardcoded `*.d2e.local`; write the resolved value into
   `.env` so cert and hostnames cannot diverge again.
2. `.github/workflows/docker-build-push.yaml:799-805`: the CI cert is generated with
   `-subj "/CN=d2e.cluster.local"` and **no** `-addext subjectAltName`. Modern TLS clients ignore CN
   entirely when no SAN is present, so this cert validates against nothing once the chart verifies.
   The SAN must go on the **signing** step — `openssl x509 -req` drops CSR extensions:

   ```bash
   openssl x509 -req -in "$D/srv.csr" \
     -CA "$D/ca.crt" -CAkey "$D/ca.key" -CAcreateserial \
     -out "$D/srv.crt" -days 30 \
     -extfile <(printf 'subjectAltName=DNS:*.d2e.local,DNS:d2e.local,DNS:*.d2e.cluster.local,DNS:d2e.cluster.local\nkeyUsage=critical,digitalSignature\nextendedKeyUsage=serverAuth,clientAuth\n')
   ```

**Verify:** regenerate certs, then
`openssl x509 -in <cert> -noout -text | grep -A1 "Subject Alternative Name"` → shows `*.d2e.local`.

---

## Milestone 2 — Stop Compose interpolating secrets into container specs

*Resolves Item 2 (`docker-compose.yml:1078`).*

Split into two commits:

### 2a. `fix(compose): read TLS material from container env, not Compose interpolation`

- `docker-compose.yml:1078-1079`: `$TLS__INTERNAL__CRT` / `$TLS__INTERNAL__KEY` → `$$…`.
  The service already carries `<<: *x-tls` (`:1085-1086`, anchor at `:51-55`), so both variables are
  in its environment — no env changes needed.
- `docker-compose.yml:598`: same fix for `TLS__INTERNAL__CA_CRT` in Caddy's entrypoint.
  **Found during review, not in the report.** Same class, also added by this PR; under `env_file` or
  Helm it writes a zero-byte `ca.pem`, breaking this PR's own `tls_trust_pool` reverse proxies.
- Regenerate `scripts/docker-compose-embed.ts`.

Every other cert writer in the file already uses `$$` (`:115-117`, `:899`, `:901`), so this is an
outlier, not a convention.

### 2b. `fix(compose): restrict permissions on the written-out logto private key`

`umask 077` before the `printf`s at `docker-compose.yml:1077` — `/tmp/cert/key.pem` is currently
world-readable inside the container.

**Verify (both):** `docker compose config | grep -c "PRIVATE KEY"` → `0`;
`docker inspect <logto> --format '{{json .Config.Cmd}}' | grep -c "PRIVATE KEY"` → `0`;
`/tmp/cert/key.pem` non-empty and mode `600`; `/srv/caddy-config/ca.pem` non-empty; Logto's HTTPS
listener answers on `:3001`.

**Out of scope, separate ticket:** `docker-compose.yml:1188` and `:1278` interpolate
`DEMO__DB_PASSWORD` / `PG_SUPER_PASSWORD` the same way. Pre-existing behaviour this PR only relocated.

---

## Milestone 3 — The fetch shim

*Resolves Item 4a, Item 4b, the timeout nit, and both of the reviewer's general notes.*

Ordered so the three behaviour fixes land **once** instead of thirteen times. All 13 copies of
`_axios.ts` are byte-identical (sha `e2e9b026…`).

### 3a. `refactor(functions): consolidate _axios shim into _shared`

13 copies → `plugins/functions/_shared/_axios.ts`.

Precedent: the functions already import shared code by relative path
(`../_shared/alp-base-utils/src/index.ts` in the deno.json import maps), and the shim is imported by
relative path (`./_axios.ts`, `../_axios.ts`), not through the import map.

**Pre-check before committing to this ordering:** confirm all 13 build contexts include `_shared`.
If any do not, fall back to applying 3b–3d across the 13 copies and file the dedup separately.

Copies: `alp-dataflow-gen-init`, `alp-usermgmt`, `alpdb`, `analytics-svc`, `concept-mapping`,
`d2e-webapi`, `dataset`, `demo`, `jobplugins`, `portal`, `query-gen-svc`, `strategus-analysis`,
`white-rabbit`.

### 3b. `fix(functions): return plain-object headers from the fetch shim`

*Item 4a.* `headers: Object.fromEntries(res.headers)` on both the success path (`_axios.ts:143`) and
the error path (`:152`).

Why it matters: axios returned a lowercase-keyed plain object, so call sites use bracket access.
A `Headers` instance returns `undefined` for that. `LogtoAPI.fetchAllPages` (`LogtoAPI.ts:68`) does
`Number(result.headers['total-number'])` → `NaN`, and the guard `if (!totalNumber || …) break` then
breaks after page 1. Silent truncation at `pageSize` (100), no error, no log. Six call sites are
affected: `/api/resources` (`:16`), scopes (`:35`, `:312`), role-scopes (`:49`), `/api/users`
(`:173`), `/api/roles` (`:180`), user-roles (`:220`). The role-scopes case is worse than truncation:
`:50` uses `existingRoleScopes.some(...)` to decide whether a scope is already assigned, so a
truncated list makes `assignScopeToRole` re-POST assignments it believes are missing.

`Headers` iteration yields lowercased names, so this is a true restore of the axios contract.

Add a comment noting the one thing it does **not** restore: repeated headers (`set-cookie`) collapse
to a comma-joined string where axios exposed an array. Nothing under `plugins/functions` reads
`set-cookie` off a shim response, so this is not a live regression.

### 3c. `fix(functions): return a Buffer for arraybuffer responses`

*Item 4b.* `payload = Buffer.from(await res.arrayBuffer())` at `_axios.ts:124`, plus
`import { Buffer } from "node:buffer"` — required under Deno, and already the repo idiom
(`portal/.../resource.controller.ts:11`, `cdw-svc/.../config.ts:12`,
`dataset/services/shinylive.service.ts:5`).

Why it matters: Express's `res.send` only treats a payload as binary when `Buffer.isBuffer(chunk)`
is true; anything else that is an object falls through to `res.json()`. The chain is
`filesManagerAPI.ts:45` (`responseType: "arraybuffer"`) → `getFile()` → `scan-data.service.ts:64` →
`scan-data.router.ts:57-62` (`res.status(200).send(result)`), so the downloaded scan report is
JSON-encoded byte indices rather than the file. `responseType: "arraybuffer"` appears exactly once
outside the shim, so this is the whole blast radius. The failure is silent — `scan-data.router.ts:63`
is a bare `catch (error) {}`.

Fix in the shim, not the call site: the shim's stated contract is drop-in axios compatibility, and
`Buffer` is a `Uint8Array` subclass, so anything treating the payload as a typed array keeps working.

### 3d. `fix(functions): scope the shim abort timer to the whole response`

*Nit.* Clear the abort timer in a `finally` after the body is read, not at `_axios.ts:120` when
response headers arrive. A server that sends headers and then stalls the body currently hangs
forever, whereas axios's `timeout` covered the whole response — relevant given
`axios.defaults.timeout = 30000` in the request-utils, and more likely now that these calls traverse
TLS.

### 3e. `chore(functions): drop dead axios dependencies`

Remove the now-dead `"axios": "npm:axios@…"` entries from the ~20 `deno.json` files under
`plugins/functions`. Confirmed: no bare `axios` imports remain anywhere under `plugins/functions` —
every consumer imports the shim by relative path. Leaving the entries invites someone to reintroduce
the real client by accident.

---

## Milestone 4 — Small fixes

One commit each.

### 4a. `fix(local): restore the full PLUGINS_DEV_PATH`

*Item 5.* `docker-compose-local.yml:110-112` — revert the debug leftover:

```yaml
# Bind-mounted source plugins win over bundled ones with the same package name.
# /usr/src/plugins-dev first so trex's own web/studio/notebook plugins load too.
PLUGINS_DEV_PATH: "/usr/src/plugins-dev:/usr/src/bundled-plugins:/usr/src/plugins"
```

The one-entry override drops `/usr/src/plugins-dev` (so bind-mounted edits under `plugins/` are
silently ignored — the entire purpose of this override file) and `/usr/src/plugins` (trex's own
web/studio/notebook plugins). The comment two lines above still describes the three-entry path, so
the file documents behaviour it no longer has. Unrelated to the TLS work.

### 4b. `fix(prefect-proxy): read the request body inside the try block`

*Item 6.* Move `plugins/functions/prefect/index.ts:31-38` inside the `try` at `:40`, declaring
`body` before it so the `fetch` call still sees it.

The handler is `app.use(async (req, res) => …)` at `:18`; Express 4 does not await async handlers, so
a client disconnecting mid-upload rejects the `for await` with nothing to catch it — bypassing the
502 path deliberately written at `:55`. This runs under Deno (`Deno.env.toObject()` at `:4`), where
an unhandled rejection is fatal by default unless the runtime installs a handler.

Same commit: guard the `catch` with `if (res.headersSent) { res.destroy(); return; }`. By the time a
failure at `:53` (`upstreamRes.arrayBuffer()`) is caught, `:47-51` may already have set the upstream
status and headers, so the 502 body goes out carrying them.

### 4c. `fix(logto-post-init): correct the admin-server fallback host`

*Nit.* `services/alp-logto/post-init/src/middleware/logto.ts:2` falls back to
`https://alp-logto-1.d2e.local:3002`. Milestone 1 makes the domain half correct; the container-name
half is still wrong (with `PROJECT_NAME=d2e` the container is `d2e-logto-1`). Fix it, or drop the
fallback and fail fast — today it fails DNS resolution rather than degrading gracefully.

---

## Deferred — decide before merge

### Item 3 — `NODE_TLS_REJECT_UNAUTHORIZED: "0"` in `alp-logto-post-init`

`docker-compose.yml:1005`. The container POSTs `LOGTO_API_M2M_CLIENT_SECRET` (via
`LOGTO__ALP_ADMIN_APP`), `LOGTO__CLIENTID_PASSWORD__BASIC_AUTH`, and every client secret in
`LOGTO__CLIENT_APPS` to the admin API, so disabling verification process-wide makes those
interceptable by anything that can win a DNS or routing race on the `alp` network — the exact threat
the rest of this PR closes.

Groundwork already established:

- Image is `node:18.20.2-slim` (`services/alp-logto/post-init/Dockerfile`).
- It uses global `fetch` (undici) exclusively — `src/middleware/logto.ts:18,40,55,70,81,91`.
- It has **no** `<<: *x-tls` in its environment, which is the reviewer's point: adding the anchor and
  pointing `NODE_EXTRA_CA_CERTS` at a written-out `TLS__INTERNAL__CA_CRT` gives it real trust.
- `ENTRYPOINT ["npm", "run", "seed"]` has no shell, so writing the CA out needs an entrypoint
  override in compose (or baking it into the image).
- **Open question:** whether undici honours `NODE_EXTRA_CA_CERTS` on Node 18.20 — must be verified
  empirically before relying on it. If it does not, the alternatives are bumping the base image or
  passing an explicit `ca` via a custom dispatcher.

### Item 7 — removed TLS escape hatch in `PsConfigServerAPI`

`plugins/functions/analytics-svc/src/api/PsConfigServerAPI.ts`. The TLS wiring is commented out
(`:6`, `:12-15`, `:24`) and the shim documents that `httpsAgent` is "accepted and ignored", so there
is no per-request TLS control on this path at all — trust comes solely from the process-wide
`DENO_TLS_CA_STORE=system`. That breaks any PS config server whose cert is not chained to the trusted
internal CA, which is the common case since this service is typically external/HANA-side.

Two things to raise in the thread:

1. **Correction to the framing.** Against our local merge base the prior code was
   `rejectUnauthorized: true` with an explicit `ca: env.TLS__INTERNAL__CA_CRT`, not a
   `NODE_ENV === "development"` bypass — so what was dropped is CA *injection*. (Our local base
   predates a `functions/` → `plugins/functions/` move, so it may not be the base GitHub diffed
   against.) The practical effect the reviewer describes still holds.
2. **A related finding the review did not cover.** The `NODE_ENV === "development"` bypass does still
   exist, in four `request-util.ts` copies — `demo/api:12`, `dataset/api:12`,
   `jobplugins/src/api:11`, `alpdb/api:12` — and in all four the agent is commented out while the log
   line survives:

   ```ts
   if (env.NODE_ENV === "development") {
     // const httpsAgent = new https.Agent({ rejectUnauthorized: false });
     // axios.defaults.httpsAgent = httpsAgent;
     logger.info("rejectUnauthorized is disabled");
   }
   ```

   In dev these services now log "rejectUnauthorized is disabled" while verification is enforced —
   worse than a silent drop, because it sends whoever debugs the first TLS failure the wrong way.

Candidate resolution once intent is confirmed: an explicit opt-in env flag honoured by the shim
(e.g. `TLS__ALLOW_INSECURE_UPSTREAMS`, default off, logged loudly), or — preferred — letting the shim
accept a `ca` option so an external server can be trusted properly instead of bypassed. Either way,
delete the commented-out `httpsAgent` blocks and fix the four misleading log lines.

---

## Final verification — run once, after all milestones

**Static**

1. `grep -rn "alp\.local" --exclude-dir=node_modules --exclude-dir=.git .` → only intentional
   backwards-compat mentions.
2. `docker compose config | grep -o '[a-z0-9-]*\.\(alp\|d2e\)\.local' | sort -u` → all `d2e.local`.
3. No TLS material in any rendered `command`/`entrypoint` (a bare
   `grep -c "PRIVATE KEY"` over `docker compose config` is **wrong** — the key is
   *delivered* via `environment:`, so it is always present there; only command position
   matters):
   Match on a PEM *header followed by base64 body*, not on the marker alone — the trex
   entrypoint legitimately contains the string `-----BEGIN CERTIFICATE-----` as an `awk`
   pattern, which a marker-only grep reports as a false positive:
   ```bash
   docker compose --env-file .env.local config | python3 -c '
   import sys, re, yaml
   d = yaml.safe_load(sys.stdin)
   pem = re.compile(r"-----BEGIN [A-Z ]+-----\s*[A-Za-z0-9+/]{40}")
   bad = [f"{n}.{k}" for n, s in d["services"].items() for k in ("command", "entrypoint")
          if s.get(k) and pem.search(str(s[k]))]
   print("offenders:", bad or "none")'
   ```
4. `node internal/scripts/check-axios-shim-sync.mjs` → `13 copies, all identical`.
   (The original "one file under `_shared/`" check was superseded by the documented
   Milestone 3a fallback; the dedup remains a follow-up.)
5. `grep -rn '"axios"' plugins/functions/*/deno.json` → empty.
6. `openssl x509 -in <cert> -noout -text | grep -A1 "Subject Alternative Name"` → `*.d2e.local`.

**Unit / focused**

7. `Object.fromEntries(new Headers({'total-number':'250'}))['total-number'] === '250'`.
8. Shim `arraybuffer` response → `Buffer.isBuffer(data) === true`.
9. Shim timeout fires when a server sends headers then stalls the body.

**Integration — full stack up**

10. `docker inspect <logto> --format '{{json .Config.Cmd}}' | grep -c "PRIVATE KEY"` → `0`;
    `/tmp/cert/key.pem` non-empty, mode `600`; `/srv/caddy-config/ca.pem` non-empty.
11. No `ERR_TLS_CERT_ALTNAME_INVALID` on any hop: trex→Logto, worker→Prefect,
    portal→supabase-storage, Caddy `tls_trust_pool`.
12. Tenant with >100 users: `/api/users` returns >100 and issues `page=2`; run `assignScopeToRole`
    twice → no duplicate POSTs on the second run.
13. Scan report: `curl -o report.xlsx …`; `file report.xlsx` reports an Office/zip container, not
    JSON; byte-compare against the file in files-manager; no `charset=utf-8` appended to
    `application/octet-stream`.
14. Kill a client mid-upload through `/prefect/...` → worker stays up and logs `Prefect proxy error`;
    point `PREFECT_API_URL` at a closed port → clean 502 JSON.
15. Local dev: edit a file under `plugins/`, confirm it is picked up; trex's own
    web/studio/notebook plugins load.

**CI**

16. `openssl verify -CAfile ca.crt srv.crt`; `curl --cacert` against a chart service hostname;
    Helm install job green.

**Suite**

17. Full test suite once, including `tests/security/test_kernel_network_isolation.R` with the
    corrected hostnames.

---

## PR replies

One threaded reply per inline comment (via `pulls/3016/comments/{id}/replies`, not a top-level
comment), stating what changed. Two need more than an acknowledgement:

- **Item 1** — confirm the `d2e.local` direction, and flag the CI-cert SAN as a distinct fix that
  applies regardless of which domain wins.
- **Item 7** — ask whether dropping the bypass was intentional, and report the four misleading
  `request-util.ts` log lines.

Comment IDs: 3774237588 (SAN), 3774237597 (`$$`), 3774237604 (`NODE_TLS_REJECT_UNAUTHORIZED`),
3774237609 (`PLUGINS_DEV_PATH`), 3774237618 (headers), 3774237623 (arraybuffer), 3774237627 (timer
nit), 3774237632 (prefect), 3774237636 (logto fallback nit), 3774237640 (`PsConfigServerAPI`).
