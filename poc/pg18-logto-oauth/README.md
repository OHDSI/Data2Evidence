# PoC: PostgreSQL 18 login with Logto tokens, role-scoped GRANTs

Question: can PostgreSQL 18 authenticate users directly with a Logto access token,
and give them access to only a specific schema and table based on a Logto role?

Answer: **yes**. Tested on 2026-09-29 with `postgres:18-alpine` (18.6), Logto 1.43.0
and Percona `pg_oidc_validator` (commit `ba9c4cb`). No D2E, no JupyterHub.

```text
psql / app ──(1) device flow or token──> Logto  (role jupyter-test => scope db:jupyter_test)
     │
     └──(2) OAUTHBEARER token──> PostgreSQL 18
                                   pg_hba: oauth, scope="db:jupyter_test", map=logto
                                   validator: JWKS signature, iss, exp, scope ⊇ required
                                   pg_ident: any sub -> role jupyter_test
                                   jupyter_test: SELECT on allowed.demo only
```

## How it works

- **PostgreSQL 18** has an `oauth` method in `pg_hba.conf`, but ships no token
  validator. `pg18/Dockerfile` builds Percona's
  [pg_oidc_validator](https://github.com/percona/pg_oidc_validator) on Alpine and
  loads it with `oauth_validator_libraries`.
- **The validator** fetches Logto's discovery document and JWKS, verifies the JWT
  signature, issuer and expiry, and authorizes only if the token's `scope` contains
  every scope in the `pg_hba` line. It does not check `aud`.
- **Logto** grants `db:jupyter_test` only to users holding the `jupyter-test` role.
  Users without the role get a token with an empty scope, which PostgreSQL refuses.
- **`pg_ident.conf`** maps the token's `sub` to the database role `jupyter_test`. That
  role has no password and exactly one grant: `SELECT` on `allowed.demo`.
- **Networking:** Logto runs in PostgreSQL's network namespace, so
  `http://localhost:3001/oidc` is the same issuer for the browser, PostgreSQL and psql.

## Run it

```sh
cd poc/pg18-logto-oauth
docker compose up -d --build
sh bootstrap-m2m.sh            # Management API access, no admin console needed
set -a; . ./.env.poc; set +a
docker run --rm --network container:pgoauth-pg18-1 -v "$PWD:/w:ro" \
  -e LOGTO_M2M_ID -e LOGTO_M2M_SECRET python:3.12-alpine python /w/logto_setup.py >> .env.poc
sh test.sh
```

`logto_setup.py` creates the API resource `https://pg.poc` (set as default API), the
scope, the role, users `alice` (has the role) and `bob` (does not), a device-flow app
for psql, and personal access tokens used by the tests. `.env.poc` is gitignored.

### Interactive login with psql

```sh
docker compose exec -T -e PGOAUTHDEBUG=UNSAFE pg18 psql \
  "host=localhost dbname=poc user=jupyter_test oauth_issuer=http://localhost:3001/oidc oauth_client_id=$POC_DEVICE_CLIENT_ID" \
  -c "select system_user, current_user" 2>&1 | grep -v '^\[libcurl\]'
```

psql prints `Visit http://localhost:3001/device and enter the code: XXXX-XXXX`. Open it,
enter that short **user code**, sign in as `alice` (password `PocPassword-2026`).
Do not enter the long `device_code` from the debug output; Logto answers
"The device code is invalid". `PGOAUTHDEBUG=UNSAFE` is needed because the issuer is
plain HTTP; it prints every HTTP request including tokens, which is why the command
filters the `[libcurl]` lines. Do not share the unfiltered output.

## Results

| ID | Test | Result |
| --- | --- | --- |
| A | alice connects with her token | pass, `system_user` = `oauth:<alice sub>` |
| B | bob (no role) connects | refused: "scope mismatch. Required scopes: db:jupyter_test. Received scopes:" |
| C | alice `SELECT` on `allowed.demo` | pass, 2 rows |
| D | alice on `allowed.hidden`, `secret.demo`, `INSERT`, `CREATE TABLE` | all `permission denied` |
| E | role removed from alice, new token | refused, new token has empty scope |
| E2 | token issued before the removal | **still works until it expires** (1 h) |
| F | made-up token | refused, "invalid token supplied" |
| F2 | password login as `jupyter_test` | refused, only OAuth is allowed |
| G | psql device flow | reaches "Visit ... enter the code"; finishing needs a browser login (not automated) |

A–F run automatically in `test.sh`, with tokens obtained by exchanging each user's
personal access token (Logto token exchange with `resource=https://pg.poc`).

## Findings and caveats

- **Revocation is not immediate.** Removing a role in Logto stops new logins, but a
  token already issued stays valid until `exp`, and open connections stay open. Keep
  the resource's `accessTokenTtl` short.
- **`resource` matters in Logto.** psql's device flow sends only `scope`, never
  `resource`. Without `resource`, token exchange returned an **opaque** token with no
  scope. The device-flow grant should fall back to the default API (Logto sets
  `defaultResource` in its OIDC provider), but whether psql's token is a JWT is still
  **unverified**: test G has to be finished in a browser to confirm.
- **One DB role for everyone.** `pg_ident` maps every authorized user to
  `jupyter_test`. Per-user roles are possible with `logto /^(.*)$ \1` and one
  PostgreSQL role per `sub`, or several `pg_hba` lines with different scopes.
- **No audience check.** Any valid Logto JWT with the right scope works, whatever its
  `aud`. Scope names should be unique to the database.
- **HTTP issuer.** Local only. Real deployments need HTTPS for the issuer; then
  `PGOAUTHDEBUG` is not needed.
- **Client support.** Built-in OAuth needs libpq 18 built with libcurl, as in
  `postgres:18-alpine`. Other clients need a libpq 18 hook that supplies the token,
  like `oauth_conn_test` from the validator repo.
- **Build notes.** Alpine needs `krb5-dev` for the server headers and
  `with_llvm=no`. Logto's DB user needs `CREATEROLE`, and `pg_hba` must allow Logto's
  per-tenant roles on the `logto` database.

## Clean up

```sh
docker compose down -v
```
