# cdw-svc

## Running tests locally

This guide assumes local development setup has been successful. Some tests require both HANA and postgres connections.

### Database setup

- Setup Hana DB as instructed in `alp-data-node/analytics-svc/README.md`. Note the schema name you used for Hana <HANA_TEST_SCHEMA_NAME>.
  - In addition, we will use `TENANT_READ_USER` which has access to `CDMVOCAB` schema so run `GRANT SELECT ON SCHEMA <HANA_TEST_SCHEMA_NAME> TO TENANT_READ_USER;` in dbeaver too
- Setup and start a test db with `yarn workspace cdw-config run postgres:start`.
  - Schema is rebuilt each time this command is run, so no custom schema name is required.

### Build local libs

- `yarn workspace @alp/alp-base-utils compile`
- `yarn workspace @alp/alp-config-utils compile`

### Run tests

```bash
 HANASERVER="TODO_DB_ADDRESS" HDIUSER="TENANT_READ_USER" HDIPORT="TODO_DB_PORT" HDIPW="TODO_SYSTEM_PW" TESTSYSTEMPW="TODO_SYSTEM_PW" TESTPORT=TODO_DB_PORT TESTSCHEMA="<HANA_TEST_SCHEMA_NAME>" isTestEnv="true" yarn workspace cdw-config run test
```
