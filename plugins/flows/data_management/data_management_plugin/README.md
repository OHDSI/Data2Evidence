# Data management plugin

Creates and updates the tables of a data model (`omop5-4`, `waveform`, `medical-imaging`) by running
the `.sql` changesets under `db/migrations/<dialect>/changesets/`. `sql_migration.py` runs them
directly with SQLAlchemy, in place of the Liquibase CLI.

## Changeset files

A changeset is a plain `.sql` file:

```sql
-- V1.0.0.0.0__create_test_table.sql
CREATE TABLE test (id integer NOT NULL, name varchar(50));
CREATE INDEX idx_test_id ON test (id);
```

- **Location:** `data_management_plugin/db/migrations/<dialect>/changesets/<directory>/`, where
  `<dialect>` is `postgres` or `hana`.
- **Naming:** `V<version>__<description>.sql`. Files run in file-name order, and the portal shows the
  `V<version>` part as the schema version.
- **One changeset per file.** It is split into statements on top-level `;` (comments, strings and quoted
  identifiers are respected), and all statements run in one transaction on Postgres.
- **Stored procedures and triggers** can't be split on `;`. Put `-- splitStatements:false` on its own line
  and the whole file runs as one statement.
- **Placeholders:** `${VOCAB_SCHEMA}` is replaced with the vocabulary schema. It is the only placeholder.
  `:name` is left alone, so HANA SQLScript variables such as `:Questionnaire_ID` work.
- **Liquibase headers are optional.** Existing files keep `--liquibase formatted sql` and
  `--changeset author:id` (with `splitStatements:false` on that line for procedures); `--rollback`
  lines are ignored. Without a header the author is recorded as `d2e` and the id as the file name.

`tests/test_sql_migration.py` lints every changeset (one changeset per file, no `$$` body in a file
that is split, no unknown `${...}` placeholder), so a bad file fails CI rather than a deployment.

## Creating a new data model

1. Add the changeset files in a new directory, e.g. `db/migrations/postgres/changesets/new-datamodel/`
   (and one under `hana` if it supports HANA).
2. Register the directories in `DATAMODEL_CHANGESET_DIRS` in `sql_migration.py`, in the order they
   should run, per dialect:
   ```python
   DATAMODEL_CHANGESET_DIRS = {
       "postgres": {..., "new-datamodel": ["new-datamodel"]},
       "hana": {..., "new-datamodel": ["new-datamodel"]},
   }
   ```
3. Register the data model in the package manifest by rerunning `flowinit.py` from `plugins/flows`
   with it added to `-dm`. This updates `plugins/flows/data_management/package.json`:
   ```
   python flowinit.py [package_name] data_management/data_management_plugin/flow.py:data_management_plugin datamodel -dm omop5-4,medical-imaging,waveform,new-datamodel
   ```

## Updating an existing data model

Add a new file with the next `V<version>` to the model's directory, e.g.
`db/migrations/postgres/changesets/omop5-4/`. Don't edit a file that has already been applied. The next
`update_datamodel` run applies it.

Applied changesets are recorded per schema in the `databasechangelog` table, the same table Liquibase
used, so schemas Liquibase already migrated are picked up as-is. Each run applies only the changesets
not yet recorded there.

## Flow actions

| Action | What it does |
|---|---|
| `create_datamodel` | Creates the schema, runs every changeset, assigns roles |
| `update_datamodel` | Runs the changesets not yet recorded |
| `changelog_sync` | Records the pending changesets as executed **without running their SQL**, to baseline a schema that was provisioned another way |
| `get_version_info` | Reports each dataset's current and latest schema version to the portal |
| `create_cdm_schema` | Creates the vocabulary and CDM schemas if they don't exist |

`rollback_count` and `rollback_tag` no longer exist.

## Guarantees and limits

- **Postgres:** a changeset and its `databasechangelog` row commit in one transaction. Concurrent runs
  on the same schema are serialized with an advisory lock.
- **HANA:** concurrent runs are serialized with the `databasechangeloglock` row (the holder renews it
  while migrating; a lock not renewed for 15 minutes is treated as left by a crashed run). DDL
  auto-commits on HANA, so a crash between a changeset and its changelog row can leave them out of
  step. The HANA changesets and this lock have not been run against a real HANA instance.
- A data model or dialect that isn't registered fails before anything in the schema is changed.
