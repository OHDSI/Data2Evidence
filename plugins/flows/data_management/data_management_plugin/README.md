# How to use this repo

Schema migrations are applied directly by `sql_migration.py` (plain SQLAlchemy)
rather than by shelling out to the Liquibase CLI. Changeset files still use
the Liquibase-formatted-SQL comment convention below, since that's just a
parseable way to mark changeset boundaries and author/id metadata - it's the
execution path that changed, not the file format.

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
- Create a folder e.g. `new-datamodel` under `datamodel_plugin/db/migrations/<dialect>/changesets`
- Within this folder, add Liquibase-formatted-SQL changesets in the order they should be applied e.g.:
  ```
  --liquibase formatted sql
  --changeset author_name:V1.0.0__create_tables.sql
  
  CREATE TABLE test ("ID" VARCHAR(50));
  ```
- A changeset whose body can't be safely split into individual statements on `;`
  (e.g. a stored procedure or trigger body) should add `splitStatements:false`
  to its `--changeset` line, so the whole body is executed as one statement.

### Register the changeset directories for the new data model
- Add an entry for the new data model to `DATAMODEL_CHANGESET_DIRS` in `datamodel_plugin/sql_migration.py`,
  listing its changeset directories in the order they should be applied, per dialect:
  ```python
  DATAMODEL_CHANGESET_DIRS = {
      "postgres": {
          ...,
          "new-datamodel": ["new-datamodel"],
      },
      "hana": {
          ...,
          "new-datamodel": ["new-datamodel"],
      },
  }
  ```

## Updating existing data models

### Add migration scripts to update an existing data model 
- Look for the folder with the name of the existing data model under `datamodel_plugin/db/migrations/<dialect>/changesets` e.g. `datamodel_plugin/db/migrations/postgres/changesets/omop5-4`
- Within this folder, add Liquibase-formatted-SQL changesets in the order they should be applied e.g.:
  ```
  --liquibase formatted sql
  --changeset author_name:V1.0.0__create_tables.sql
  
  CREATE TABLE test ("ID" VARCHAR(50));
  ```
- Changesets already applied to a schema are tracked in that schema's own `databasechangelog`
  table (the same table Liquibase used, so schemas Liquibase already migrated are picked up as-is);
  re-running the flow only applies changesets not yet recorded there.

### Constraints on changeset files
The runner runs a lint over every changeset (`tests/test_sql_migration.py`), so a file that breaks
these fails CI rather than a deployment:
- exactly one `--changeset author:id` header per file (one file = one changeset);
- a `$$ ... $$` body (stored procedure, trigger) must set `splitStatements:false`;
- `:name` is fine (it is escaped, e.g. HANA SQLScript variables); the only `${...}` placeholder
  supported is `${VOCAB_SCHEMA}`.

### Guarantees
- **Postgres:** a changeset and its `databasechangelog` row commit in one transaction, and concurrent
  runs on the same schema are serialized with an advisory lock.
- **HANA:** concurrent runs are serialized with Liquibase's `databasechangeloglock` row (a lock left by
  a crashed run is taken over after 15 minutes). DDL auto-commits, so a crash between a changeset and
  its changelog row can still leave them out of step. The HANA changesets and this lock have not been
  run against a real HANA instance.
- Rollback (`rollback_count` / `rollback_tag`) is no longer supported.
