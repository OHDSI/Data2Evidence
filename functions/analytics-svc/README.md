### To use postgres connection instead of duckdb
Update `USE_DUCKDB` environment variable for  `alp-minerva-analytics-svc` to `false`

# Prepare the test schema

For easiness use the Az HANA instance, which doesn't have the SSL enabled.

- Login to Az HANA using DBeaver

- Run the script at `services/analytics-svc/spec/ddl-scripts/hana/mri-hana-dll.sql` to create an empty test schema

# Run analytics-svc integration tests locally

- Start `query-gen-svc` by running the following command
```
isTestEnv=true \
TESTSCHEMA=<test_schema_name> \
yarn workspace query-gen run start
```
- Start the `analytics-svc` integration tests using the following comand with the Az HANA DB credentials:
```
HANASERVER=<HANA_AZURE_HOST> \
HDIUSER=<HANA_AZURE_SYSTEM_USER> \
HDIPORT=<HANA_AZURE_PORT> \
HDIPW=<HANA_AZURE_SYSTEM_PASSWORD> \
TESTSYSTEMPW=<HANA_AZURE_SYSTEM_PASSWORD> \
TESTPORT=<HANA_AZURE_PORT> \
TESTSCHEMA=<TEST_SCHEMA_NAME> \
isTestEnv="true" \
yarn workspace analytics run testci
```

# Run MRI HTTP tests locally

1. initialize test database

```
TESTSCHEMA=HTTPTESTSCHEMA HDIPORT=39041 HDIUSER=SYSTEM HANASERVER=<HANA_SERVER> HDIPW=<PWD> yarn inittestdb
```

2. Update `tests/backend_integration_tests/specs/environment.json` with the following values
```
"host": "https://localhost",
"appport" : "41000",
"sysappport" : "41000",
"dbhost": "<HANA_AZURE_HOST>",
"dbport": "<HANA_AZURE_PORT>",
"instance_no": 0,
"system_user": "<HANA_AZURE_SYSTEM_USER>",
"system_password": "<HANA_AZURE_SYSTEM_PASSWORD>",
"chp_admin_user": "<HANA_AZURE_SYSTEM_USER>",
"chp_admin_password": "<HANA_AZURE_SYSTEM_PASSWORD>",
"mri_admin_user": "<HANA_AZURE_SYSTEM_USER>",
"mri_admin_password": "<HANA_AZURE_SYSTEM_PASSWORD>",
"test_user": "<HANA_AZURE_SYSTEM_USER>",
"test_password": "<HANA_AZURE_SYSTEM_PASSWORD>",
"chp_technical_user": "<HANA_AZURE_SYSTEM_USER>",
"standard_schema_name": "HTTPTESTSCHEMA",
"test_schema_name": "HTTPTESTSCHEMA",
```
3. Configure environment variables

- Navigate to the `.env` files in `services` and `alp-data-node`
- uncomment the variables under `Enable for local http tests`

```
isTestEnv=true
isHttpTestRun=true
```

4. Start ALP 
```
yarn start
``` 
```
yarn start:mercury
```
  
5. Navigate to `tests/backend_integration_tests` folder and start the http tests:
```
yarn test-specs
```

## Additonal notes
1. switching database `schemas`

- update schema names in `tests/backend_integration_tests/specs/environment.json`
- update schema names in `VCAP_SERVICES` in services and alp-data-node (tagged under `httptest`)

# Change log levels during runtime
```
kubectl set env RESOURCE/NAME KEY1=VAL_1..

for example:
kubectl set env deployment/alp-data LOGLEVEL=info
```
for reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#-em-env-em-
=======
