# PostgreSQL 18 + Logto OAuth PoC: files, local testing, permissions

PostgreSQL 18 can authenticate users with a Logto token directly, and a Logto role
limits them to one table. The PoC lives in `poc/pg18-logto-oauth/`. All 9 automated
tests pass. Only the browser-based `psql` device-flow login is still unconfirmed.

## 1. Files added and what was tested

Everything is in `poc/pg18-logto-oauth/`. Nothing is committed.

| File | What it does |
| --- | --- |
| `docker-compose.yml` | Two containers, `pg18` and `logto`. Logto shares pg18's network, so `localhost:3001` is the same Logto for the browser, the database and psql |
| `pg18/Dockerfile` | Builds Percona's `pg_oidc_validator` into `postgres:18-alpine`. Also adds `oauth_conn_test`, a test client that connects with a given token |
| `pg18/pg_hba.conf` | Who may connect and how. The `poc` database accepts only `jupyter_test`, only through OAuth, and only with the `db:jupyter_test` scope |
| `pg18/pg_ident.conf` | Maps the token's user ID (`sub`) to the database role `jupyter_test` |
| `pg18/init/10-poc.sh` | Runs once on first start. Creates Logto's database, the `poc` database, schemas `allowed` and `secret`, three tables, and the `jupyter_test` role with one grant |
| `bootstrap-m2m.sh` | Registers a management app directly in Logto's database, so the Management API works without the admin console |
| `logto_setup.py` | All Logto setup: API resource `https://pg.poc`, the scope, role `jupyter-test`, users alice (has the role) and bob (does not), a device-flow app for psql, and a token-exchange app for tests |
| `token_exchange.py` | Gets a real Logto token for alice or bob without a browser, by exchanging each user's personal access token |
| `test.sh` | The 9 automated tests |
| `README.md` | How to run it, results, caveats |
| `.env.poc` | Generated IDs and secrets. Ignored by git |

### What was tested

Only users with the Logto role can get in, and once in, they can read only the one
table they were granted.

| Test | Result |
| --- | --- |
| A. alice logs in with her token | Pass. The database identifies her as `oauth:<alice ID>` |
| B. bob, without the role | Refused. The log says "scope mismatch" |
| C. alice reads `allowed.demo` | Pass, 2 rows |
| D. `allowed.hidden`, `secret.demo`, INSERT, CREATE TABLE | All "permission denied" |
| E. alice gets a new token after her role is removed | Refused |
| E2. a token issued before the role was removed | Still accepted until it expires (1 hour) |
| F. made-up token, password login | Refused |
| G. `psql` device flow | Reaches the login-code prompt. The browser login step is manual |

## 2. How to test locally

### Start from scratch

Run from the repository root.

```sh
cd poc/pg18-logto-oauth
docker compose up -d --build
sh bootstrap-m2m.sh
set -a; . ./.env.poc; set +a
docker run --rm --network container:pgoauth-pg18-1 -v "$PWD:/w:ro" \
  -e LOGTO_M2M_ID -e LOGTO_M2M_SECRET python:3.12-alpine python /w/logto_setup.py >> .env.poc
sh test.sh
```

If the stack is already running and configured, `sh test.sh` alone is enough.

### Browser login test (G)

```sh
set -a; . ./.env.poc; set +a
docker compose exec -T -e PGOAUTHDEBUG=UNSAFE pg18 psql \
  "host=localhost dbname=poc user=jupyter_test oauth_issuer=http://localhost:3001/oidc oauth_client_id=$POC_DEVICE_CLIENT_ID" \
  -c "select system_user, current_user" 2>&1 | grep -v '^\[libcurl\]'
```

1. Find the 8-character code in the line "enter the code: XXXX-XXXX". Do not use the long device code.
2. Enter that code at `http://localhost:3001/device`.
3. Log in as `alice` with `PocPassword-2026`, and the query should succeed. Logging in as `bob` should be refused.

`PGOAUTHDEBUG=UNSAFE` is required because the issuer is plain HTTP. It prints every
HTTP request, including tokens, so do not share the unfiltered output.

### Changing roles

In this PoC the role is `jupyter-test`. To take it from alice or give it to bob, use the
Logto admin console at `http://localhost:3002`. On first visit it asks you to create an
admin account. After a change, the user has to log in again. Tokens already issued stay
valid until they expire.

### Stopping and removing

```sh
docker compose down      # stop, keep data
docker compose down -v   # remove everything; rerun "Start from scratch" to use it again
```

## 3. How to check PostgreSQL permissions

Run all of these as the superuser, inside the database.

```sh
docker compose exec pg18 psql -U postgres -d poc
```

Look at permissions in three layers:

- **Can they connect?** That is `pg_hba`.
- **Who do they become?** That is `pg_ident`.
- **What can they do once in?** Those are the GRANTs.

### Layer 1. Connection rules (`pg_hba`)

```sql
select line_number, database, user_name, auth_method, options
from pg_hba_file_rules;
```

The line that matters:

```text
10 | {poc} | {jupyter_test} | oauth | {map=logto, issuer=http://localhost:3001/oidc, scope=db:jupyter_test, validator=pg_oidc_validator}
```

The `poc` database accepts only `jupyter_test`, only through OAuth, and only with a
token that carries the `db:jupyter_test` scope. The final `reject` line blocks
everything else.

### Layer 2. Token user to database role (`pg_ident`)

```sql
select map_name, sys_name, pg_username from pg_ident_file_mappings;
```

```text
logto | /^(.*)$ | jupyter_test
```

Every authenticated Logto user becomes `jupyter_test` inside the database. To see who
actually connected, use `system_user`.

```sql
select system_user, current_user;   -- oauth:<Logto user ID> | jupyter_test
```

### Layer 3. What they can do (GRANTs)

```sql
-- table privileges granted
select table_schema, table_name, privilege_type
from information_schema.role_table_grants where grantee = 'jupyter_test';

-- schema usage and create rights
select nspname,
       has_schema_privilege('jupyter_test', nspname, 'USAGE')  as usage,
       has_schema_privilege('jupyter_test', nspname, 'CREATE') as create
from pg_namespace where nspname in ('allowed', 'secret', 'public');

-- per-table select and insert rights
select relnamespace::regnamespace as schema, relname,
       has_table_privilege('jupyter_test', oid, 'SELECT') as sel,
       has_table_privilege('jupyter_test', oid, 'INSERT') as ins
from pg_class where relkind = 'r'
  and relnamespace::regnamespace::text in ('allowed', 'secret');
```

Results on 2026-09-29:

| Object | Privilege |
| --- | --- |
| `allowed.demo` | SELECT only |
| `allowed.hidden` | None |
| the whole `secret` schema | None |
| `public` schema | None |
| creating tables in any schema | Not allowed |
| password for `jupyter_test` | None, so OAuth is the only way in |

psql shortcuts show the same things: `\dn+` for schema privileges, `\dp allowed.*` for
table privileges, `\du jupyter_test` for role attributes.

### Changing a privilege

To also allow reading `allowed.hidden`, run this as the superuser. It applies at once,
including to sessions that are already connected.

```sql
grant select on allowed.hidden to jupyter_test;
revoke select on allowed.hidden from jupyter_test;
```

### Reading connection logs

The PostgreSQL log records who connected under which rule, and why a login was refused.

```sh
docker compose logs pg18 | grep -E 'connection authenticated|scope mismatch|OAuth'
```

When bob is refused, the log shows the required and received scopes, for example
`Required scopes: db:jupyter_test. Received scopes:`.
