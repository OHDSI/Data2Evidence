
# Broadsea-atlasdb
- Initially, the D2E system does not contain any data
- This docker container is part of the OHDSI Broadsea set of Docker containers. 

# Configure Patient Database Credentials 

## Add database connection details & credentials

- Login as the new admin user
- Switch to **Admin Portal**
- Select **Setup** on top right
  - URL is now https://localhost:41100/portal/systemadmin/setup
- Select **Databases** **Configure** button
- Select **Add database**
- Add the values from the table below.
- Click **Save**


name | value | note
--- | --- | ---
Host | broadsea-atlasdb | PostgreSQL container name /or/ external database FQDN
Database code | broadsea_atlasdb | display name
Database name | postgres | actual name
Vocab schemas | demo_cdm | select from dropdown. `*`
Extra | {"max": 50, "schema": "demo_cdm", "queryTimeout": 60000, "statementTimeout": 60000, "idleTimeoutMillis": 300000, "connectionTimeoutMillis": 60000, "idleInTransactionSessionTimeout": 300000}
Admin username | postgres | `*`
Read username | postgres | `*`
Admin password | mypass | `*`
Read password | mypass | `*`

notes:
- `*` - schema/usernames are the values expected for sample data load steps - do not change 

## Restart Containers

Run the following command to restart the system for the new connection details be provisioned to the data services
```bash
yarn start:minerva --force-recreate
```

# Create a dataset 
- open https://localhost:41100/portal
- Login as primary admin as
- Select **Admin** mode
- Navigate to **Datasets**
- Select **Add dataset**
- Provide the following values in the table below: 

name | value | note
--- | --- | ---
Dataset name | eg. Demo
CDM Schema Option | select 'Use existing schema' from dropdown
Schema Name field | e.g. demo_cdm | name of the cdm schema that was used for seeding
Vocab schema name | e.g. demo_cdm
Data Model Option | omop5-4 [datamodel-plugin]
PA Config | OMOP_GDM_PA_CONF_DUCKDB
Type | e.g. DemoDataset
Token dataset code | e.g. DemoDataset

### Patch tables
Run command below to patch cohort_definition table and add cohort table
```
docker exec -u postgres broadsea-atlasdb psql -f /cohort_patch.sql
```