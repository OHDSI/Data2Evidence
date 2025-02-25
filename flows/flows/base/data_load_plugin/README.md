```
# options will look like
options = {
    "files": [
        {
            "name": "care_site", # Table name
            "path": "/tmp/data/care_site.csv", 
            "truncate": True # Optional, default is False
        }
    ],
    "schema_name": "cdmvocab",
    "header": True, # Optional, default is True
    "delimiter": "," # Optional, default is None
    # other options can be found in utils.types.DataloadOptions
}
```