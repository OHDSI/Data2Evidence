# Options will look like
```
options = {
    "files": [
        {
            "path": "/app/data_load/example1.json", # Filepath of json in flow run container
        }
    ],
    "dataset_token": "dataset_token", # dataset token 
    "truncate_tables": True, # Optional, default is False
}
```

# Mount json file to flow run container
To mount the json file to the flow run container, search for `PREFECT_DOCKER_VOLUMES` variable in `docker-compose.yml` and append a volume map string to the array e.g.
```
PREFECT_DOCKER_VOLUMES: '[
    ...,
    "/Users/<Username>/Documents/synpuf1k:/app/synpuf1k",
    "/Users/<Username>/Documents/vocab:/app/vocab",
]'
```


# Trigger data load plugin flow run from cli to load data into fhir dataset 
```
docker exec -it alp-dataflow-gen-worker prefect deployment run data_load_fhir_plugin/data_load_fhir_plugin --param options='{"files":[{"path": "/app/data_load/example1.json"}],"dataset_token":"token","truncate_tables":"true"}'
```
