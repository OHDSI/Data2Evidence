# PoC: JupyterHub → Logto → PostgreSQL 18, token-scoped schema access

Question: can a user log in to JupyterHub through Logto, and use that Logto access token
to log in to PostgreSQL 18, reaching only the schema the token allows?

Answer: **yes**. Tested on 2026-09-30 with `postgres:18-alpine` (18.6), Logto 1.43.0,
Percona `pg_oidc_validator` (commit `ba9c4cb`) and the D2E PoC JupyterHub image. No D2E.

```text
browser ──> JupyterHub :8000 ──(OIDC login, resource=https://pg.poc)──> Logto
                 │  scopes granted by Logto roles: jupyter:hub, db:jupyter_test, db:jupyter_test_b
                 │  hub gate: jupyter:hub required, otherwise 403
                 └─ starts the user's notebook with LOGTO_ACCESS_TOKEN (fresh, refreshed at spawn)
notebook: pg_oauth.connect() ──(OAUTHBEARER, libpq 18 hook)──> PostgreSQL 18
                 pg_hba: user jupyter_test   needs scope db:jupyter_test   -> schema allowed
                         user jupyter_test_b needs scope db:jupyter_test_b -> schema schema_b
                 validator: JWKS signature, iss, exp, token scope ⊇ required scope
```

## How it works

- **PostgreSQL 18** runs on the official `postgres:18-alpine` image, unchanged. It has an
  `oauth` method in `pg_hba.conf` but ships no token validator, so one file is added by a
  compose mount: [pg_oidc_validator](https://github.com/percona/pg_oidc_validator)'s
  `.so`, built once by `validator/Dockerfile` into `validator/out/` and loaded with
  `oauth_validator_libraries`. `pg_hba.conf`, `pg_ident.conf` and `init/` are mounted too.
  The `.so` must match PostgreSQL 18, musl (Alpine) and the CPU architecture.
- **The validator** fetches Logto's discovery document and JWKS, verifies signature,
  issuer and expiry, and authorizes only if the token's `scope` contains every scope of
  the `pg_hba` line. It does not check `aud`.
- **Logto roles grant scopes.** `jupyterhub-user` → `jupyter:hub`, `jupyter-test` →
  `db:jupyter_test`, `jupyter-test-b` → `db:jupyter_test_b`, all on API resource
  `https://pg.poc` (set as Logto's default API).
- **The token decides the schema.** Each `pg_hba` line pairs one login role with one
  scope. `jupyter_test` can only `SELECT allowed.demo`; `jupyter_test_b` can only
  `SELECT schema_b.demo`. Neither has a password.
- **JupyterHub** (`hub/`: image and config) logs users in with
  `resource=https://pg.poc`, gates on `jupyter:hub`, refreshes the token when a server
  starts and gives the notebook only the access token and connection settings (no
  refresh token, no secret).
- **The notebook** (`notebook/Dockerfile`) has the system libpq 18 from PGDG and psycopg's
  pure-Python implementation. `pg_oauth.py` installs libpq's OAuth hook
  (`PQsetAuthDataHook`) with ctypes, because no released Python driver supports PG18
  OAuth yet (psycopg's is a draft PR).
- **Networking:** Logto and the hub share pg18's network namespace, so
  `http://localhost:3001/oidc` is the same issuer everywhere. Notebooks sit on the internal
  network `pgoauth-notebooks`: they reach PostgreSQL and the hub, nothing else.

## Run it

```sh
cd poc/pg18-logto-oauth
docker build --output validator/out validator          # once: validator .so + test client
docker compose up -d                                  # pg18 (official image) + logto
sh bootstrap-m2m.sh                                   # Management API access + hub crypt key
set -a; . ./.env.poc; set +a
docker run --rm --network container:pgoauth-pg18-1 -v "$PWD:/w:ro" \
  -e LOGTO_M2M_ID -e LOGTO_M2M_SECRET python:3.12-alpine python /w/logto_setup.py >> .env.poc
sh test.sh                                            # 13 browserless PostgreSQL tests

docker build -t pgoauth-notebook:local notebook
docker compose --env-file .env.poc --profile hub up -d --build jupyterhub
```

Users (password `PocPassword-2026`): `alice` (hub + `jupyter-test`), `carol`
(hub + `jupyter-test-b`), `bob` (no roles). `.env.poc` is gitignored.

### In the browser

Open `http://localhost:8000`, click **Sign in with Data2Evidence**, log in as alice, then in
a new Python notebook:

```python
import pg_oauth
pg_oauth.scopes()                        # {'jupyter:hub', 'db:jupyter_test'}
conn = pg_oauth.connect()                # logs in as jupyter_test
conn.execute("select * from allowed.demo").fetchall()   # 2 rows
conn.execute("drop table allowed.demo")  # must be owner of table demo
conn.execute("select * from secret.demo")               # permission denied for schema secret
conn.execute("select * from schema_b.demo")             # permission denied for schema schema_b
pg_oauth.connect(role="jupyter_test_b")  # refused: token lacks db:jupyter_test_b
```

As carol, `connect()` opens `jupyter_test_b`, which reads `schema_b.demo` only. As bob, the
hub answers 403. The token lasts one hour; restart the server from the Hub Control Panel
for a new one.

Browserless equivalent: `python3 hub_login.py alice` logs in and starts the server through
Logto's sign-in API; then run `notebook_check.py` in the container:

```sh
docker cp notebook_check.py jupyter-alice:/tmp/ && docker exec jupyter-alice python /tmp/notebook_check.py
```

### psql with device flow

```sh
docker compose exec -T -e PGOAUTHDEBUG=UNSAFE pg18 psql \
  "host=localhost dbname=poc user=jupyter_test oauth_issuer=http://localhost:3001/oidc oauth_client_id=$POC_DEVICE_CLIENT_ID" \
  -c "select system_user, current_user" 2>&1 | grep -v '^\[libcurl\]'
```

Enter the short **user code** from "Visit ... and enter the code: XXXX-XXXX", not the long
`device_code` from the debug output. `PGOAUTHDEBUG=UNSAFE` is needed for the HTTP issuer
and prints tokens, which is why the `[libcurl]` lines are filtered.

## Results

| ID | Test | Result |
| --- | --- | --- |
| A | alice connects with her token | pass, `system_user` = `oauth:<alice sub>` |
| B | bob (no role) connects | refused: "scope mismatch. Required scopes: db:jupyter_test" |
| C | alice `SELECT allowed.demo` | pass, 2 rows |
| D | alice on `allowed.hidden`, `secret.demo`, `INSERT`, `CREATE TABLE` | all denied |
| E | role removed from alice, new token | refused, new token has no `db:` scope |
| E2 | token issued before the removal | **still works until it expires** (1 h) |
| F | made-up token, password login | refused |
| H | carol: `schema_b` yes, `allowed` no, cannot log in as `jupyter_test`; alice cannot log in as `jupyter_test_b` | pass |
| J1 | alice logs in to JupyterHub via Logto, server starts | pass, token `aud=https://pg.poc`, scope `jupyter:hub db:jupyter_test` |
| J2 | in alice's notebook: SELECT allowed, DROP, other schemas, other role | SELECT works; DROP "must be owner"; others denied |
| J3 | carol's notebook | only `schema_b.demo`; DROP denied |
| J4 | bob at the hub | 403, no container created |
| J5 | notebook isolation | only `pgoauth-notebooks`; no internet, no Docker socket; env has no refresh token or secret |
| G | psql device flow | reaches the code prompt; browser step manual |

A–H run in `test.sh` (tokens from Logto token exchange of each user's personal access
token). J1–J4 were run with `hub_login.py` and `notebook_check.py`.

## Findings and caveats

- **"Vanilla PostgreSQL 18" needs one add-on.** No patch or fork, but a validator library
  must be installed on the server (Percona ships Debian/RHEL packages).
- **Python needs a workaround today.** No released driver passes a token; this PoC uses
  libpq's hook through ctypes. It requires the system libpq 18, not `psycopg[binary]`.
- **Revocation is not immediate.** Removing a role stops new logins; issued tokens stay
  valid until `exp` and open connections stay open. Keep `accessTokenTtl` short.
- **One `pg_hba` line per scope.** The validator checks `scope`, not a `roles` claim, and
  `pg_hba` is static: each new schema/role needs a line and a reload.
- **Scopes must be requested.** Logto has no wildcard; the hub lists every `db:` scope it
  may need (`LOGTO_EXTRA_SCOPES`). Logto grants only those the user holds.
- **`resource` matters.** Without `resource`, token exchange returned an opaque token;
  the hub always sends `resource=https://pg.poc`.
- **No audience check** in the validator; keep scope names unique to the database.
- **HTTP issuer is local only.** libpq refuses an HTTP issuer even when the hook supplies
  the token, so `pg_oauth.py` sets `PGOAUTHDEBUG=UNSAFE` for `http://` issuers only.
- **Build notes.** Alpine needs `krb5-dev` and `with_llvm=no`; Logto's DB user needs
  `CREATEROLE`; `pg_hba` must allow Logto's per-tenant roles on the `logto` database.

## Clean up

```sh
docker rm -f jupyter-alice jupyter-carol
docker compose --profile hub down -v
```
