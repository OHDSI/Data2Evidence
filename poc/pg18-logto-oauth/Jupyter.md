# Notebook test cells

Paste these into a Python notebook after logging in to JupyterHub as alice (see
[ARCHITECTURE.md](ARCHITECTURE.md) section 4). Expected results for alice are in the
comments; carol should see only `schema_b`. ← [README.md](README.md)

```python
# 1. success
import pg_oauth
conn = pg_oauth.connect()
conn.execute("select * from allowed.demo").fetchall()   # good

# 2. must fail
conn.execute("drop table allowed.demo")                  # must be owner

# 1 by 1 test

import time, pg_oauth

# what is inside token
c = pg_oauth.claims()
print("Logto user:", c["sub"], "| scope:", c["scope"], "| left time:", int(c["exp"] - time.time()), "seconds")

conn = pg_oauth.connect()
q = lambda sql: conn.execute(sql).fetchall()

# 1. who am i
q("select system_user, current_user")

# 2. what is my role
q("select rolname from pg_roles where pg_has_role(current_user, oid, 'member')")


# 3. all role in db
q("select rolname, rolcanlogin from pg_roles where rolname !~ '^pg_' order by 1")


# 4. all table in db
q("""select schemaname, tablename from pg_tables
   where schemaname not in ('pg_catalog', 'information_schema') order by 1, 2""")


# 5. what table i can see
q("""select table_schema, table_name from information_schema.tables
   where table_schema not in ('pg_catalog', 'information_schema') order by 1, 2""")


# 6. what role i have
q("""select table_schema, table_name, privilege_type
   from information_schema.role_table_grants where grantee = current_user""")



# 7. where can i create or use?
q("""select nspname,
          has_schema_privilege(nspname, 'USAGE')  as usage,
          has_schema_privilege(nspname, 'CREATE') as can_create
   from pg_namespace where nspname in ('public', 'allowed', 'secret', 'schema_b') order by 1""")
```
