# PG18 OAuth PoC: architecture, build order, testing

← [README.md](README.md) (overview, one-command run, results) ·
notebook cells: [Jupyter.md](Jupyter.md) ·
D2E integration: [D2E-PERMISSIONS.md](D2E-PERMISSIONS.md)

Goal: a user logs in to JupyterHub with D2E's Logto, and the same Logto access token logs
them in to PostgreSQL 18, where they can read only the schema their Logto role allows.

Every code file starts with a one-line header tag. The tags match the sections below:
`[BUILD-n]`, `[SETUP]`, `[RUN]`, `[FLOW-n]`, `[TEST]`.

## 1. Architecture

D2E's Logto, the hub and PostgreSQL 18 are separate containers. The PoC adds only the hub,
PostgreSQL and the user notebooks; D2E itself is not changed.

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
| FLOW-3 | `pg18/pg_hba.conf` | PostgreSQL matches a rule: database `poc`, user `jupyter_test`, method `oauth`, issuer `http://d2e-caddy:8080/oidc`, required scope `db:jupyter_test`. The validator fetches Logto's JWKS and checks signature, issuer, expiry and scope |
| FLOW-4 | `pg18/pg_ident.conf` | The token's `sub` (Logto user id) is mapped to the login role of that rule |
| FLOW-5 | `pg18/init/10-poc.sh` | That role has one grant: `jupyter_test` → `SELECT allowed.demo`, `jupyter_test_b` → `SELECT schema_b.demo`. Everything else is denied |

Roles and scopes in Logto (created by `logto_setup.py`):

| Logto role | Scope | Effect |
| --- | --- | --- |
| `role.jupyteruser` | `role.jupyteruser` | may log in to JupyterHub |
| `jupyter-test` | `db:jupyter_test` | may log in to PostgreSQL as `jupyter_test` |
| `jupyter-test-b` | `db:jupyter_test_b` | may log in to PostgreSQL as `jupyter_test_b` |

Users: `alice` (hub + jupyter-test), `carol` (hub + jupyter-test-b), `bob` (none).
Password `PocPassword-2026`.

## 3. Build and run order

Prerequisite: D2E is running (`d2e start`). From `poc/pg18-logto-oauth/`:

| Order | Step | Command | Produces |
| --- | --- | --- | --- |
| 1 | BUILD-1 validator | `docker build --output validator/out validator` | `validator/out/pg_oidc_validator.so` |
| 2 | BUILD-2 notebook image | `docker build -t pgoauth-notebook:local notebook` | image `pgoauth-notebook:local` |
| 3 | SETUP D2E Logto | done by `run.sh` (`logto_setup.py`) | roles, scopes, users, hub app; `.env.poc` |
| 4 | BUILD-3 hub + RUN | done by `run.sh` (`docker compose up -d --build`) | containers `pg18d2e-pg18`, `pg18d2e-jupyterhub` |

`sh run.sh` runs steps 1–4 and skips builds that already exist. Rerun it after changing
`hub/jupyterhub_config.py` (the config is copied into the image). After changing
`notebook/` rebuild step 2 and restart the user's server.

The validator `.so` must match PostgreSQL 18, musl (Alpine) and the CPU architecture; build
it on the machine that runs it.

## 4. How to test, from zero

1. **Clean.** `sh run.sh --remove` removes the containers, volumes and the PoC users, roles
   and app from D2E Logto. To also rebuild everything:
   `rm -rf validator/out; docker image rm -f pgoauth-notebook:local pg18d2e-jupyterhub`.
2. **Start.** `sh run.sh`, then check
   `curl -s -o /dev/null -w '%{http_code}\n' http://localhost:8000/hub/login` prints `200`.
3. **Log in.** Accept the certificate once at
   `https://localhost/oidc/.well-known/openid-configuration` (do not sign in at the D2E
   portal with a PoC user). Open `http://localhost:8000`, click
   **Sign in with Data2Evidence**, sign in as alice.
4. **Query in a notebook:**

```python
import pg_oauth
pg_oauth.scopes()                         # {'role.jupyteruser', 'db:jupyter_test'}
conn = pg_oauth.connect()                 # logs in as jupyter_test
conn.execute("select * from allowed.demo").fetchall()   # 2 rows
conn.execute("drop table allowed.demo")   # must be owner of table demo
conn.execute("select * from secret.demo") # permission denied for schema secret
conn.execute("select system_user, current_user").fetchone()  # ('oauth:<alice id>', 'jupyter_test')
```

5. **Other users,** each in a new private window: carol reads only `schema_b.demo`; bob
   gets a JupyterHub 403.
6. **Clean up:** `sh run.sh --remove`.

More identity and privilege queries are in [Jupyter.md](Jupyter.md). The token lasts one hour; if
`connect()` says "expired", restart the server from File > Hub Control Panel.

Without a browser (steps 3–5):

```sh
python3 hub_login.py alice
docker cp notebook_check.py jupyter-alice:/tmp/ && docker exec jupyter-alice python /tmp/notebook_check.py
python3 hub_login.py bob      # hub refused the user (403): True
```

Expected results:

| User | Result |
| --- | --- |
| alice | `allowed.demo` readable; DROP, `secret`, `schema_b`, role `jupyter_test_b` denied |
| carol | only `schema_b.demo` readable |
| bob | JupyterHub 403, no notebook created |

On the PostgreSQL side:

```sh
docker exec pg18d2e-pg18 psql -U postgres -d poc -c "select * from pg_hba_file_rules"
docker logs pg18d2e-pg18 | grep -E 'method=oauth|scope mismatch'
```

## 5. File map

| Tag | Files |
| --- | --- |
| BUILD | `validator/Dockerfile`, `notebook/Dockerfile`, `hub/Dockerfile` |
| SETUP | `logto_setup.py` |
| RUN | `run.sh`, `docker-compose.yml` |
| FLOW | `hub/jupyterhub_config.py`, `notebook/pg_oauth.py`, `pg18/pg_hba.conf`, `pg18/pg_ident.conf`, `pg18/init/10-poc.sh` |
| TEST | `hub_login.py`, `notebook_check.py`, [Jupyter.md](Jupyter.md) |
| Docs | [README.md](README.md), [D2E-PERMISSIONS.md](D2E-PERMISSIONS.md) |
