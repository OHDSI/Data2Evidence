# How to use this repo

## Creating a new data model
### Modify the metadata of the package
- Register the name of the new data model in `metadata/alp-job.json` e.g.:
    ```
    {  
        "name": "datamodel_plugin",
        "type": "datamodel",
        "datamodels": [..., "new-datamodel"],
        "entrypoint": "datamodel_plugin/flow.py"
    }
    ```

### Add migration scripts required to create the tables of the new data model 
- Create a folder e.g. `new-datamodel` under `datamodel_plugin/db/migrations/hana/changesets`
- Within this folder, add Liquibase formatted changesets in the order they should be applied e.g.:
  ```
  --liquibase formatted sql
  --changeset author_name:V1.0.0__create_tables.sql
  
  CREATE TABLE test ("ID" VARCHAR(50));
  ```

### Add a changelog to reference the location of the migration scripts
- Create a changelog.xml in `datamodel_plugin/db/migrations/hana` e.g `liquibase-new-datamodel.xml`
  ```
    <databaseChangeLog
    xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
    xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
            http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-3.1.xsd">

        <includeAll path="changesets/new-datamodel" relativeToChangelogFile="true"/>
    </databaseChangeLog>
  ```

### Add the changelog mapping for the new data model 
- Register the data model and its respective changelog in the dictionary `DATAMODEL_CHANGELOG_MAPPING` located in `datamodel_plugin/config.py`
  ```
  DATAMODEL_CHANGELOG_MAPPING = {
    ...,
    "new-datamodel": "liquibase-new-datamodel.xml"
  }
  ```

## Updating existing data models

### Add migration scripts to update an existing data model 
- Look for the folder with the name of the existing data model under `datamodel_plugin/db/migrations/hana/changesets` e.g. `datamodel_plugin/db/migrations/hana/changesets/omop5-4`
- Within this folder, add Liquibase formatted changesets in the order they should be applied e.g.:
  ```
  --liquibase formatted sql
  --changeset author_name:V1.0.0__create_tables.sql
  
  CREATE TABLE test ("ID" VARCHAR(50));
  ```