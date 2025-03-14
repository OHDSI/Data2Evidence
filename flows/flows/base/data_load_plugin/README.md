# Options will look like
```
options = {
    "files": [
        {
            "name": "care_site", # Table name
            "path": "/tmp/data/care_site.csv", # Filepath of csv in flow run container
            "truncate": True # Optional, default is False
        }
    ],
    "database_code": "alpdev_pg", # Value configured for databases in admin portal
    "schema_name": "cdmvocab", # Schema to load to
    "header": True, # Optional, default is True
    "delimiter": "," # Optional, default is None
    # other options can be found in utils.types.DataloadOptions
}
```

# Mount CSVs to flow run container
To mount the CSVs to the flow run container, search for `PREFECT_DOCKER_VOLUMES` variable in `docker-compose.yml` and append a volume map string to the array e.g.
```
PREFECT_DOCKER_VOLUMES: '[
    ...,
    "/Users/<Username>/Documents/synpuf1k:/app/synpuf1k",
    "/Users/<Username>/Documents/vocab:/app/vocab",
]'
```


# Trigger data load plugin flow run from cli to load synpuf1k 
```
docker exec -it alp-dataflow-gen-worker prefect deployment run data_load_plugin/data_load_plugin --param options='{"files":[{"name": "Location","path": "/app/synpuf1k/002_LOCATION.csv", "truncate": "True", "table_name": "location"},{"name": "CARE_SITE","path": "/app/synpuf1k/003_CARE_SITE.csv", "truncate": "True", "table_name": "care_site"},{"name": "Provider","path": "/app/synpuf1k/004_PROVIDER.csv", "truncate": "True", "table_name": "provider"},{"name": "Cost","path": "/app/synpuf1k/005_COST.csv", "truncate": "True", "table_name": "cost"},{"name": "Person","path": "/app/synpuf1k/006_PERSON.csv", "truncate": "True", "table_name": "person"},{"name": "Death","path": "/app/synpuf1k/007_DEATH.csv", "truncate": "True", "table_name": "death"},{"name": "Condition_Occirence","path": "/app/synpuf1k/008_CONDITION_OCCURRENCE.csv", "truncate": "True", "table_name": "condition_occurrence"},{"name": "Condition_Era","path": "/app/synpuf1k/009_CONDITION_ERA.csv", "truncate": "True", "table_name": "condition_era"},{"name": "Device_Exposure","path": "/app/synpuf1k/010_DEVICE_EXPOSURE.csv", "truncate": "True", "table_name": "device_exposure"},{"name": "Drug_Exposure","path": "/app/synpuf1k/011_DRUG_EXPOSURE.csv", "truncate": "True", "table_name": "drug_exposure"},{"name": "Drug_Era","path": "/app/synpuf1k/012_DRUG_ERA.csv", "truncate": "True", "table_name": "drug_era"},{"name": "Measurement","path": "/app/synpuf1k/013_MEASUREMENT.csv", "truncate": "True", "table_name": "measurement"},{"name": "Observation","path": "/app/synpuf1k/014_OBSERVATION.csv", "truncate": "True", "table_name": "observation"},{"name": "Observation_Period","path": "/app/synpuf1k/015_OBSERVATION_PERIOD.csv", "truncate": "True", "table_name": "observation_period"},{"name": "Payer_Plan_Period","path": "/app/synpuf1k/016_PAYER_PLAN_PERIOD.csv", "truncate": "True", "table_name": "payer_plan_period"},{"name": "Procedure_Occurrence","path": "/app/synpuf1k/017_PROCEDURE_OCCURRENCE.csv", "truncate": "True", "table_name": "procedure_occurrence"},{"name": "Visit_Occurrence","path": "/app/synpuf1k/018_VISIT_OCCURRENCE.csv", "truncate": "True", "table_name": "visit_occurrence"}],"schema_name":"cdmdefault","header":"true","delimiter":",","database_code": "alpdev_pg", "chunksize": "50000", "encoding": "utf_8"}'
```


# Trigger data load plugin flow run from cli to load vocab 
```
docker exec -it alp-dataflow-gen-worker prefect deployment run data_load_plugin/data_load_plugin --param options='{"files":[{"name": "CONCEPT_ANCESTOR","path": "/app/vocab/CONCEPT_ANCESTOR.csv", "truncate": "True", "table_name": "concept_ancestor"},{"name": "CONCEPT_CLASS","path": "/app/vocab/CONCEPT_CLASS.csv", "truncate": "True", "table_name": "concept_class"},{"name": "CONCEPT_RELATIONSHIP","path": "/app/vocab/CONCEPT_RELATIONSHIP.csv", "truncate": "True", "table_name": "concept_relationship"},{"name": "CONCEPT_SYNONYM","path": "/app/vocab/CONCEPT_SYNONYM.csv", "truncate": "True", "table_name": "concept_synonym"},{"name": "CONCEPT","path": "/app/vocab/CONCEPT.csv", "truncate": "True", "table_name": "concept"},{"name": "DOMAIN","path": "/app/vocab/DOMAIN.csv", "truncate": "True", "table_name": "domain"},{"name": "DRUG_STRENGTH","path": "/app/vocab/DRUG_STRENGTH.csv", "truncate": "True", "table_name": "drug_strength"},{"name": "RELATIONSHIP","path": "/app/vocab/RELATIONSHIP.csv", "truncate": "True", "table_name": "relationship"},{"name": "VOCABULARY","path": "/app/vocab/VOCABULARY.csv", "truncate": "True", "table_name": "vocabulary"}],"schema_name":"cdmvocab","header":"true","delimiter":"\t","database_code": "alpdev_pg", "chunksize": "50000", "encoding": "utf_8"}'
```