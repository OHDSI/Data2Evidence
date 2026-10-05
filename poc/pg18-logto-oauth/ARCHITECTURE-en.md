# PG18 OAuth PoC: architecture, build order, testing

Goal: a user logs in to JupyterHub with Logto, and the same Logto access token logs them
in to PostgreSQL 18, where they can read only the schema their Logto role allows.

Every code file starts with a one-line header tag. The tags match the sections below:
`[BUILD-n]`, `[SETUP]`, `[RUN]`, `[FLOW-n]`, `[TEST]`.

## 1. Architecture

There are two variants with the same flow:

- **d2e** (`d2e/`): uses the running D2E stack's Logto. Logto, the hub and PostgreSQL are
  separate containers. This is the variant to validate.
- **standalone** (root folder): brings its own Logto. Logto and the hub share PostgreSQL's
  network namespace. Useful without D2E.

```text
                      ┌──────────── D2E stack (already running) ────────────┐
browser ── https://localhost ──> d2e-caddy ──> d2e-logto-1 (Logto 1.23)       │
   │                             d2e-caddy:8080/oidc = token issuer + JWKS     │
   │                      └──────────────────────────▲──────────────────▲─────┘
   │                                d2e_alp network   │ token exchange   │ JWKS
   └── http://localhost:8000 ──> pg18d2e-jupyterhub ─┘                  │
                                    │ [FLOW-1] starts notebook          │
            pg18d2e-notebooks (internal, no internet)                    │
                                    ▼                                   │
                             jupyter-<user> ──[FLOW-2] token──> pg18d2e-pg18
                                                         [FLOW-3..5] checks token,
                                                         picks role, applies GRANTs
```

| Container | Image | What it does |
| --- | --- | --- |
| `d2e-logto-1` | D2E's own | Logs users in; issues JWT access tokens with the user's scopes |
| `pg18d2e-jupyterhub` | built from `hub/` | Logto login, hub gate, starts one notebook per user and gives it the token |
| `jupyter-<user>` | `pgoauth-notebook:local` | User's JupyterLab; `pg_oauth.connect()` logs in to PostgreSQL with the token |
| `pg18d2e-pg18` | official `postgres:18-alpine` | Verifies the token with the mounted validator; only GRANTed tables are readable |

## 2. Runtime flow

| Step | File | What happens |
| --- | --- | --- |
| FLOW-1 | `hub/jupyterhub_config.py` | Browser goes to Logto, comes back with a code; the hub exchanges it for tokens (`resource=https://alp-default`). Without the scope `role.jupyteruser` the hub answers 403. At server start the hub refreshes the token and puts it in the notebook as `LOGTO_ACCESS_TOKEN` |
| FLOW-2 | `notebook/pg_oauth.py` | Reads the token, takes the role from its `db:<role>` scope, and gives the token to libpq 18 through `PQsetAuthDataHook` (no Python driver supports PG18 OAuth yet) |
| FLOW-3 | `d2e/pg_hba.d2e.conf` | PostgreSQL matches a rule: database `poc`, user `jupyter_test`, method `oauth`, issuer `http://d2e-caddy:8080/oidc`, required scope `db:jupyter_test`. The validator fetches Logto's JWKS and checks signature, issuer, expiry and scope |
| FLOW-4 | `pg18/pg_ident.conf` | The token's `sub` (Logto user id) is mapped to the login role of that rule |
| FLOW-5 | `pg18/init/10-poc.sh` | That role has one grant: `jupyter_test` → `SELECT allowed.demo`, `jupyter_test_b` → `SELECT schema_b.demo`. Everything else is denied |

Roles and scopes in Logto (created by `d2e/d2e_setup.py`):

| Logto role | Scope | Effect |
| --- | --- | --- |
| `role.jupyteruser` | `role.jupyteruser` | may log in to JupyterHub |
| `jupyter-test` | `db:jupyter_test` | may log in to PostgreSQL as `jupyter_test` |
| `jupyter-test-b` | `db:jupyter_test_b` | may log in to PostgreSQL as `jupyter_test_b` |

Users: `alice` (hub + jupyter-test), `carol` (hub + jupyter-test-b), `bob` (none).
Password `PocPassword-2026`.

## 3. Build and run order (d2e variant)

Prerequisite: D2E is running (`d2e start`). From `poc/pg18-logto-oauth/`:

| Order | Step | Command | Produces |
| --- | --- | --- | --- |
| 1 | BUILD-1 validator | `docker build --output validator/out validator` | `validator/out/pg_oidc_validator.so`, `oauth_conn_test` |
| 2 | BUILD-2 notebook image | `docker build -t pgoauth-notebook:local notebook` | image `pgoauth-notebook:local` |
| 3 | SETUP D2E Logto | done by `d2e/run.sh` (`d2e/d2e_setup.py`) | roles, scopes, users, hub app; `d2e/.env.d2e` |
| 4 | BUILD-3 hub + RUN | done by `d2e/run.sh` (`docker compose up -d --build`) | containers `pg18d2e-pg18`, `pg18d2e-jupyterhub` |

`sh d2e/run.sh` runs steps 1–4 and skips builds that already exist. Rerun it after
changing `hub/jupyterhub_config.py` (the config is copied into the image). After changing
`notebook/` rebuild step 2 and restart the user's server.

The validator `.so` must match PostgreSQL 18, musl (Alpine) and the CPU architecture; build
it on the machine that runs it.

## 4. How to test

### In the browser

1. Accept the certificate once: `https://localhost/oidc/.well-known/openid-configuration`.
   Do not sign in at the D2E portal with a PoC user.
2. Open `http://localhost:8000`, click **Sign in with Data2Evidence**, sign in as alice.
3. In a notebook:

```python
import pg_oauth
pg_oauth.scopes()                         # {'role.jupyteruser', 'db:jupyter_test'}
conn = pg_oauth.connect()                 # logs in as jupyter_test
conn.execute("select * from allowed.demo").fetchall()   # 2 rows
conn.execute("drop table allowed.demo")   # must be owner of table demo
conn.execute("select * from secret.demo") # permission denied for schema secret
conn.execute("select system_user, current_user").fetchone()  # ('oauth:<alice id>', 'jupyter_test')
```

More identity and privilege queries are in `Jupyter.md`. The token lasts one hour; if
`connect()` says "expired", restart the server from File > Hub Control Panel.

### Without a browser

```sh
LOGTO_URL=https://localhost POC_INSECURE_TLS=1 python3 hub_login.py alice
docker cp notebook_check.py jupyter-alice:/tmp/ && docker exec jupyter-alice python /tmp/notebook_check.py
```

Expected results:

| User | Result |
| --- | --- |
| alice | `allowed.demo` readable; DROP, `secret`, `schema_b`, role `jupyter_test_b` denied |
| carol | only `schema_b.demo` readable |
| bob | JupyterHub 403, no notebook created |

### On the PostgreSQL side

```sh
docker exec pg18d2e-pg18 psql -U postgres -d poc -c "select * from pg_hba_file_rules"
docker logs pg18d2e-pg18 | grep -E 'method=oauth|scope mismatch'
```

## 5. Standalone variant

Without D2E, from `poc/pg18-logto-oauth/`:

```sh
docker build --output validator/out validator
docker compose up -d
sh bootstrap-m2m.sh
set -a; . ./.env.poc; set +a
docker run --rm --network container:pgoauth-pg18-1 -v "$PWD:/w:ro" \
  -e LOGTO_M2M_ID -e LOGTO_M2M_SECRET python:3.12-alpine python /w/logto_setup.py >> .env.poc
sh test.sh                                            # 13 PostgreSQL checks
docker build -t pgoauth-notebook:local notebook
docker compose --env-file .env.poc --profile hub up -d --build jupyterhub
```

Both variants publish port 8000; run one at a time.

## 6. File map

| Tag | Files |
| --- | --- |
| BUILD | `validator/Dockerfile`, `notebook/Dockerfile`, `hub/Dockerfile` |
| SETUP | `d2e/d2e_setup.py` (D2E), `logto_setup.py`, `bootstrap-m2m.sh` (standalone) |
| RUN | `d2e/run.sh`, `d2e/docker-compose.yml` (D2E), `docker-compose.yml` (standalone) |
| FLOW | `hub/jupyterhub_config.py`, `notebook/pg_oauth.py`, `d2e/pg_hba.d2e.conf`, `pg18/pg_hba.conf`, `pg18/pg_ident.conf`, `pg18/init/10-poc.sh` |
| TEST | `hub_login.py`, `notebook_check.py`, `test.sh`, `token_exchange.py`, `Jupyter.md` |
| Docs | `README.md`, `d2e/README.md`, `GUIDE.md`, `D2E-PERMISSIONS.md`, `VM-ESTIMATE.md` |

## 7. Clean up

```sh
sh d2e/run.sh --remove     # d2e variant: containers + PoC users/roles/app in D2E Logto
docker compose --profile hub down -v   # standalone variant
```
