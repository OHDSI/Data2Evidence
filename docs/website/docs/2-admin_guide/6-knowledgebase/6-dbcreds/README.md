# Database credentials

## alp-dataflow-gen-agent-1 startup message "No database credential is configured during this deployment"

### Symptoms

#### Admin>Jobs>Logs
>
> Encountered exception during execution: Traceback (most recent call last): File "/usr/local/lib/python3.11/site-packages/prefect/engine.py", line 841, in orchestrate_flow_run result = await flow_call.aresult() ^^^^^^^^^^^^^^^^^^^^^^^^^ File "/usr/local/lib/python3.11/site-packages/prefect/_internal/concurrency/calls.py", line 293, in aresult return await asyncio.wrap_future(self.future) ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ File "/usr/local/lib/python3.11/site-packages/prefect/_internal/concurrency/calls.py", line 318, in _run_sync result = self.fn(*self.args, **self.kwargs) ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ File "/tmp/tmpoo82qfzuprefect/pysrc/flows/alp_db_svc/flow.py", line 38, in create_schema_flow schema_obj = DBDao(database_code, schema_name, PG_TENANT_USERS.ADMIN_USER) ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ File "/tmp/tmpoo82qfzuprefect/pysrc/dao/DBDao.py", line 9, in __init__ self.engine = GetDBConnection(database_code, user_type) ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^ File "/tmp/tmpoo82qfzuprefect/pysrc/alpconnection/dbutils.py", line 18, in GetDBConnection database_name = conn_details["databaseName"] ~~~~~~~~~~~~^^^^^^^^^^^^^^^^ TypeError: 'NoneType' object is not subscriptable
>
#### Container logs startup message
>
> 2024-03-29 09:38:29 No database credential is configured during this deployment. Please add database credentials and deploy again

- Database>alp>db_credentials_mgr table is empty

### Cause

- Setup>Configure>Database Credentials>Extra field is incorrect or empty

### Action

- Populate Setup>Configure>Database Credentials Extra field as per [setup-db-credentials](../../5-setup/data-load/4-setup-db-credentials.md)
