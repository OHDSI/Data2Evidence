## Database

### Setup
Add `.env` file with below values:
```
PG__HOST=localhost
PG__PORT=41190
PG__PORTAL_SERVER__DB_NAME=alp
PG__PORTAL_SERVER__MANAGE_USER=-alp_pg_admin_user
PG__PORTAL_SERVER__MANAGE_PASSWORD=<PG Manage User Password>
PG__PORTAL_SERVER__SCHEMA=portal
```

Before generating a new migration script, do create/update entity classes `*.entity.ts` and run
```
yarn migration:generate <migration-name>
```
It creates a file with 2 functions `up` and `down`. Write the migration script in `up` and the rollback script in `down` functions.

Once the new migration script is created, you can run `yarn migrate` to execute the script defined in `up` function.

If you would like to rollback the latest migration, run `yarn rollback`. And it will execute the script defined in `down` function.