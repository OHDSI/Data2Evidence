# Download and transform SynPUF-1k

- Initially, the Data2Evidence system does not contain any data.
- This section guides users on setting up a demo dataset using Synthetic Public Use Files (SynPUFs), which provides sample patient data.

## Download public SynPUF-1k

- Open a terminal in the root of `d2e` directory
- Run the following command to download synpuf1k54

```bash
wget https://caruscloud.uniklinikum-dresden.de/index.php/s/Qog8B5WCTHFHmjW/download -O ~/Downloads/synpuf1k54.tar.gz
```

- Source: [https://forums.ohdsi.org/t/1k-sample-of-simulated-cms-synpuf-data-in-cdmv5-format-available-for-download/728/39](https://forums.ohdsi.org/t/1k-sample-of-simulated-cms-synpuf-data-in-cdmv5-format-available-for-download/728/39)

## Transform csv files to expected format

- Open a terminal in the `d2e` directory.
- Run the following commands to define directories:

```bash
GIT_BASE_DIR=$(pwd)
SYNPUF1K_DIR=$GIT_BASE_DIR/cache/synpuf1k
```

- Create synpuf1k load dir

```bash
mkdir -p $SYNPUF1K_DIR
```

- Change directory to synpuf1k load dir

```bash
cd $SYNPUF1K_DIR
```

- Decompress to this dir

```bash
echo PWD=$PWD
tar xzf ~/Downloads/synpuf1k54.tar.gz --strip-components 1
```

- Remove additional files

```bash
rm "drug_exposure (Kopie).csv"
rm README.md
```

- Copy headers files for OMOP CDM v5.4

```bash
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/002_LOCATION.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/003_CARE_SITE.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/004_PROVIDER.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/005_COST.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/006_PERSON.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/007_DEATH.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/008_CONDITION_OCCURRENCE.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/009_CONDITION_ERA.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/010_DEVICE_EXPOSURE.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/011_DRUG_EXPOSURE.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/012_DRUG_ERA.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/013_MEASUREMENT.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/014_OBSERVATION.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/015_OBSERVATION_PERIOD.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/016_PAYER_PLAN_PERIOD.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/017_PROCEDURE_OCCURRENCE.csv .
wget -q https://raw.githubusercontent.com/ohdsi/data2evidence/develop/internal/docs/data-load/headers-synpuf1k/v5.4/018_VISIT_OCCURRENCE.csv .
```

- Confirm with linecounts

```bash
wc -l *
```

- Run the following commands to replace tab with comma and append data to header files

```bash
sed 's/\t/,/g' care_site.csv >> 003_CARE_SITE.csv
sed 's/\t/,/g' condition_era.csv >> 009_CONDITION_ERA.csv
sed 's/\t/,/g' condition_occurrence.csv >> 008_CONDITION_OCCURRENCE.csv
sed 's/\t/,/g' cost.csv >> 005_COST.csv
sed 's/\t/,/g' death.csv >> 007_DEATH.csv
sed 's/\t/,/g' device_exposure.csv >> 010_DEVICE_EXPOSURE.csv
sed 's/\t/,/g' drug_era.csv >> 012_DRUG_ERA.csv
sed 's/\t/,/g' drug_exposure.csv >> 011_DRUG_EXPOSURE.csv
sed 's/\t/,/g' location.csv >> 002_LOCATION.csv
sed 's/\t/,/g' measurement.csv >> 013_MEASUREMENT.csv
sed 's/\t/,/g' observation.csv >> 014_OBSERVATION.csv
sed 's/\t/,/g' observation_period.csv >> 015_OBSERVATION_PERIOD.csv
sed 's/\t/,/g' payer_plan_period.csv >> 016_PAYER_PLAN_PERIOD.csv
sed 's/\t/,/g' person.csv >> 006_PERSON.csv
sed 's/\t/,/g' procedure_occurrence.csv >> 017_PROCEDURE_OCCURRENCE.csv
sed 's/\t/,/g' provider.csv >> 004_PROVIDER.csv
sed 's/\t/,/g' visit_occurrence.csv >> 018_VISIT_OCCURRENCE.csv
```

- Remove blank line at end of each file

```bash
for i in 0*.csv; do perl -pi -e 'chomp if eof' $i; done
```

- Remove downloaded files

```bash
ls | grep -v ^0 | xargs -n 1 rm
```

- Confirm with linecounts

```bash
wc -l *
```

## Mount cache directory to Prefect Docker container

Run the following commands:

```bash
cd $GIT_BASE_DIR
PROJECT_NAME=$(grep -E '^PROJECT_NAME=' .env 2>/dev/null | awk -F'=' '{print $2}' | tr -d '"') 
PROJECT_NAME=${PROJECT_NAME:-"d2e"}
PREFECT_DOCKER_VOLUMES_CUSTOM="'[\"${PROJECT_NAME:-d2e}_trex:/app/duckdb_data\", \"$GIT_BASE_DIR/cache/vocab/transformed:/app/vocab\", \"$GIT_BASE_DIR/cache/synpuf1k:/app/synpuf1k\"]'"
echo PREFECT_DOCKER_VOLUMES_CUSTOM=$PREFECT_DOCKER_VOLUMES_CUSTOM >> .env
```

This adds the following to `PREFECT_DOCKER_VOLUMES_CUSTOM` environment variable in .env file, which will be used for trex service in docker-compose.yml:

- `${GIT_BASE_DIR}`/cache/synpuf1k:/app/synpuf1k
- `${GIT_BASE_DIR}`/cache/vocab/transformed:/app/vocab

Restart the system to apply the changes:

```bash
d2e stop
d2e start
```

## Create the database `alpdev_pg` and schema `cdmdefault`

**Reminder: Before running the next steps**

> - [Grant postgres_tenant_admin_user permissions](3-setup-pg-permissions.md)
> - Ensure the Data2Evidence system is up

- Navigate back to root folder `d2e` and run the following command to create Postgres schemas

```bash
cd $GIT_BASE_DIR
CONTAINER_NAME=$PROJECT_NAME-dataflow-gen-worker
docker exec -it $CONTAINER_NAME prefect deployment run omop_cdm_plugin/omop_cdm_plugin --param options='{"data_model":"omop5-4","schema_name":"cdmdefault","vocab_schema":"cdmvocab","database_code":"alpdev_pg","results_schema": "cdmdefault_results", "cache_schema_name": "cdmdefault", "flow_action_type":"create_seed_schemas"}'
```

- where `cdmdefault` is the default cdm schema name
- `cdmvocab`, `cdmdefault`, and `cdmdefault_results` should not be existing schemas
- Wait ~2 minutes

# Load data to `cdmdefault`

- Run the following commands to seed Postgres cdm schemas with synpuf-1k

```bash
docker exec -it $CONTAINER_NAME prefect deployment run data_load_plugin/data_load_plugin --param options='{"files":[{"name": "Location","path": "/app/synpuf1k/002_LOCATION.csv", "truncate": "True", "table_name": "location"},{"name": "CARE_SITE","path": "/app/synpuf1k/003_CARE_SITE.csv", "truncate": "True", "table_name": "care_site"},{"name": "Provider","path": "/app/synpuf1k/004_PROVIDER.csv", "truncate": "True", "table_name": "provider"},{"name": "Cost","path": "/app/synpuf1k/005_COST.csv", "truncate": "True", "table_name": "cost"},{"name": "Person","path": "/app/synpuf1k/006_PERSON.csv", "truncate": "True", "table_name": "person"},{"name": "Death","path": "/app/synpuf1k/007_DEATH.csv", "truncate": "True", "table_name": "death"},{"name": "Condition_Occirence","path": "/app/synpuf1k/008_CONDITION_OCCURRENCE.csv", "truncate": "True", "table_name": "condition_occurrence"},{"name": "Condition_Era","path": "/app/synpuf1k/009_CONDITION_ERA.csv", "truncate": "True", "table_name": "condition_era"},{"name": "Device_Exposure","path": "/app/synpuf1k/010_DEVICE_EXPOSURE.csv", "truncate": "True", "table_name": "device_exposure"},{"name": "Drug_Exposure","path": "/app/synpuf1k/011_DRUG_EXPOSURE.csv", "truncate": "True", "table_name": "drug_exposure"},{"name": "Drug_Era","path": "/app/synpuf1k/012_DRUG_ERA.csv", "truncate": "True", "table_name": "drug_era"},{"name": "Measurement","path": "/app/synpuf1k/013_MEASUREMENT.csv", "truncate": "True", "table_name": "measurement"},{"name": "Observation","path": "/app/synpuf1k/014_OBSERVATION.csv", "truncate": "True", "table_name": "observation"},{"name": "Observation_Period","path": "/app/synpuf1k/015_OBSERVATION_PERIOD.csv", "truncate": "True", "table_name": "observation_period"},{"name": "Payer_Plan_Period","path": "/app/synpuf1k/016_PAYER_PLAN_PERIOD.csv", "truncate": "True", "table_name": "payer_plan_period"},{"name": "Procedure_Occurrence","path": "/app/synpuf1k/017_PROCEDURE_OCCURRENCE.csv", "truncate": "True", "table_name": "procedure_occurrence"},{"name": "Visit_Occurrence","path": "/app/synpuf1k/018_VISIT_OCCURRENCE.csv", "truncate": "True", "table_name": "visit_occurrence"}],"schema_name":"cdmdefault","header":"true","delimiter":",","database_code": "alpdev_pg", "chunksize": "50000", "encoding": "utf_8"}'
```

- Docker container logs can be checked with the bash command `docker logs --tail 100 $CONTAINER_NAME`
- Once the flow is completed, the container logs the message "Finished in state Completed()"

- Confirm data loaded with

```bash
CONTAINER_NAME=$PROJECT_NAME-minerva-postgres-1
docker exec -it $CONTAINER_NAME psql -h localhost -U postgres -p 5432 -d alpdev_pg --command "SELECT schemaname as table_schema,relname as table_name,n_live_tup as table_rows FROM pg_stat_user_tables where schemaname='cdmdefault' ORDER BY n_live_tup DESC limit 17;"
```

- Expect output to be similar to:

| table_schema | table_name           | table_rows |
| ------------ | -------------------- | ---------- |
| cdmdefault   | cost                 | 367378     |
| cdmdefault   | condition_occurrence | 147186     |
| cdmdefault   | procedure_occurrence | 137522     |
| cdmdefault   | condition_era        | 99855      |
| cdmdefault   | drug_exposure        | 57095      |
| cdmdefault   | drug_era             | 56257      |
| cdmdefault   | visit_occurrence     | 55261      |
| cdmdefault   | provider             | 38810      |
| cdmdefault   | measurement          | 34556      |
| cdmdefault   | care_site            | 23259      |
| cdmdefault   | observation          | 19339      |
| cdmdefault   | payer_plan_period    | 3470       |
| cdmdefault   | device_exposure      | 2262       |
| cdmdefault   | observation_period   | 1000       |
| cdmdefault   | person               | 1000       |
| cdmdefault   | location             | 570        |
| cdmdefault   | death                | 52         |

## Troubleshooting

### create-postgres-cdm-schemas fails to start

- create-postgres-cdm-schemas requires the following containers:
  - d2e-minerva-postgres-1, d2e-data-flow-gen-1, d2e-data-flow-gen-agent-1
- If it is not running, check the container logs

### Data flows

- To check job logs, open [https://localhost:443/portal/systemadmin/jobs](https://localhost:443/portal/systemadmin/jobs) > Select the job run > Select **Logs**.

### Repeat seed

- To repeat, run "Load data to cdmdefault" commands in the sequence given

see:

- [load-synpuf1k](../../6-knowledgebase/6-dbcreds/README.md)
