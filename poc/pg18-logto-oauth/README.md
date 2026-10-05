# PoC: D2E Logto ↔ JupyterHub ↔ PostgreSQL 18

A user logs in to JupyterHub with D2E's Logto, and the same Logto access token logs them in
to PostgreSQL 18, where they can read only the schema their Logto role allows. Logto,
JupyterHub and PostgreSQL are separate containers.

Verified with D2E Logto 1.23.1 (d2e CLI stack), the official `postgres:18-alpine` (18.6)
plus the mounted `pg_oidc_validator.so`, and the hub in `hub/`.

## Where to look

Start here, then go to the document for what you need:

| Document | Read it to | Go there when |
| --- | --- | --- |
| [README.md](README.md) (this file) | get the idea, run it in one command, see the results and findings | first |
| [ARCHITECTURE.md](ARCHITECTURE.md) | understand the containers, the runtime flow FLOW-1..5 file by file, the build order, and the full test procedure from zero | you want to change something or test step by step |
| [Jupyter.md](Jupyter.md) | copy notebook cells: SELECT that must work, DROP that must fail, who am I, which tables and grants I have | you are logged in to JupyterHub and testing |
| [D2E-PERMISSIONS.md](D2E-PERMISSIONS.md) | see how D2E grants database access today and how this PoC would map onto it | you plan the real D2E integration |

Every code file starts with a one-line `#` header (`[BUILD-n]`, `[SETUP]`, `[RUN]`,
`[FLOW-n]`, `[TEST]`); [ARCHITECTURE.md](ARCHITECTURE.md) lists them in order.

```text
browser ── https://localhost (D2E Caddy) ──> d2e-logto-1           (D2E's own Logto)
   │                                            ▲ token: iss=http://d2e-caddy:8080/oidc
   └── http://localhost:8000 ──> pg18d2e-jupyterhub ──(d2e_alp: token exchange)──┘
                                     │ starts notebook with LOGTO_ACCESS_TOKEN
   pg18d2e-notebooks (internal) ─────┼───────────────────────────┐
                              jupyter-<user> ──OAUTHBEARER──> pg18d2e-pg18
                                                                  │ d2e_alp: discovery + JWKS
                                                                  └──> d2e-caddy:8080/oidc
```

## Why it works without certificates

D2E Logto runs with `ENDPOINT=http://d2e-caddy:8080`, so every token carries
`iss=http://d2e-caddy:8080/oidc`, and discovery and JWKS are served at that URL inside the
`d2e_alp` network. PostgreSQL only has to be on `d2e_alp` to verify tokens. The issuer is
plain HTTP, so `pg_oauth.py` sets `PGOAUTHDEBUG=UNSAFE` (local only).

## Run it

D2E must be running. From this folder:

```sh
sh run.sh
```

`run.sh` does everything and can be rerun:
1. `logto_setup.py` adds to D2E Logto, on resource `https://alp-default`:
   roles `role.jupyteruser`, `jupyter-test` (`db:jupyter_test`), `jupyter-test-b`
   (`db:jupyter_test_b`); users `alice`, `carol`, `bob` (password `PocPassword-2026`);
   app `jupyterhub-pg18-poc`. Values go to `.env.poc` (gitignored).
2. Builds the validator `.so` and the notebook image if missing.
3. Starts `pg18d2e-pg18` and `pg18d2e-jupyterhub`.

Then accept the certificate warning once at
`https://localhost/oidc/.well-known/openid-configuration`, open `http://localhost:8000`,
click **Sign in with Data2Evidence**, sign in as alice, and in a notebook:

```python
import pg_oauth
conn = pg_oauth.connect()
conn.execute("select * from allowed.demo").fetchall()   # works
conn.execute("drop table allowed.demo")                  # must be owner
```

Do not sign in at `https://localhost/d2e/portal` as a PoC user: the portal signs alice in,
then immediately ends the session (she has no D2E portal access), which looks like an
endless return to the sign-in page.

## Results

| Test | Result |
| --- | --- |
| alice logs in to the hub through D2E Logto | pass; token `iss=http://d2e-caddy:8080/oidc`, `aud=https://alp-default`, scope `role.jupyteruser db:jupyter_test` |
| alice: `select * from allowed.demo` | 2 rows |
| alice: `drop table allowed.demo` | denied, must be owner |
| alice: `secret.demo`, `schema_b.demo`, role `jupyter_test_b` | denied |
| carol | only `schema_b.demo`; `allowed` and DROP denied |
| bob (no `role.jupyteruser`) | hub 403, no container |
| PG18 log | `connection authenticated: identity="<alice sub>" method=oauth` |
| separation | `d2e-logto-1`, `pg18d2e-jupyterhub`, `pg18d2e-pg18`, `jupyter-<user>` are separate; notebooks only on `pg18d2e-notebooks`, cannot resolve D2E names |
| from zero | `run.sh --remove`, wipe builds, `run.sh`: about 70 s, all of the above pass; cleanup returns D2E Logto to 20 roles and 4 apps |

## Findings

- **D2E Logto needs nothing special** for PostgreSQL to trust its tokens, as long as
  PostgreSQL can reach the issuer URL. On separate VMs the issuer must become a URL both
  VMs reach (public HTTPS), which changes every token's `iss`.
- **Creating apps through D2E Logto's Management API returns 500.** The app row is saved,
  but storing its secret fails: the database function `logto.check_application_type`
  queries `applications` without the `logto.` schema (`relation "applications" does not
  exist`). Logto 1.23 still accepts the secret stored on the app, so login works.
  `logto_setup.py` continues with the saved app. This is a D2E/Logto database issue.
- **`/roles` and `/users` return 20 items per page.** D2E already has 20 roles, so the PoC
  roles land on page 2; `logto_setup.py` reads all pages.
- **Logto 1.23 answers some writes with plain text** (role assignment returns `Created`).

## Clean up

```sh
sh run.sh --remove   # stops containers, deletes PoC users/roles/scopes/app from D2E Logto
```
