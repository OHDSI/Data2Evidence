# Options to create a cache with no filters
```
options = {
    "flowActionType": "create_datamart_cache",
    "databaseCode": "demo_database",
    "schemaName": "demo_cdm",
    "snapshotSchemaName": "demo_cdm_cache"
}
```

# Options to create a cache with filters
```
options = {
    "flowActionType": "create_datamart_cache",
    "databaseCode": "demo_database",
    "schemaName": "demo_cdm",
    "snapshotSchemaName": "demo_cdm_cache",
    "snapshotCopyConfig": {
        "timestamp": "1970-01-01 00:00:00",
        "tableConfig": [
            {
                "tableName": "attribute_definition",
                "columnsToBeCopied": [
                    "attribute_description",
                    "attribute_syntax",
                    "attribute_definition_id",
                    "attribute_name",
                    "attribute_type_concept_id"
                ]
            },
        ],
        "patientsToBeCopied": [
            1, 2, 3
        ]

    }
    
}
````

# Options to get version info
```
options = {
    "flowActionType": "get_version_info",
    "datasets": []
}
````