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

# Chunking strategies

Tables below the small-table threshold (500,000 rows) are copied in one
statement. Larger tables are copied in chunks, each recorded in
`table_copy_status` so that a retried or resumed build continues where it
stopped.

## PAGE_RANGE (Postgres)

A large Postgres table is split into ranges of physical pages (`ctid`). Each
chunk is read through `postgres_query('<databaseCode>__srcdb', '<select>')`,
which sends one TID range scan to Postgres:

```sql
INSERT INTO "<cache>"."<schema>"."<table>" (<cols>) SELECT <cols>
FROM postgres_query('<code>__srcdb',
  'SELECT <cols> FROM "<schema>"."<table>"
   WHERE ctid >= ''(a,0)''::tid AND ctid < ''(b,0)''::tid [AND <filters>]')
```

- **Plan.** The chunk count comes from the row count (as for column ranges),
  capped at the page count. Pages `[0, blocks)` are split evenly; the last
  range has no upper bound. The page count is `pg_relation_size`, not
  `relpages`. The `plan_id` covers `relfilenode`, the page count, the chunk
  count, the columns and the patient/timestamp filters. A TRUNCATE, CLUSTER or
  VACUUM FULL changes `relfilenode` and so starts the table again. On resume
  the stored chunk count is reused, so a new row estimate alone does not
  discard progress.
- **Routing.** Decided before any column statistics are read: no chunk
  column pick, NULL count or `percentile_disc` sort runs for a page-range
  table. A table falls back to column ranges, with a
  `stage=plan_attempt ... status=fallback reason=<reason>` line, when:
  `pg_version` (server older than 14), `not_found`, `partitioned`, `view`
  (view or materialized view), `not_table` (another relation kind),
  `inherited` (has child tables), `not_heap` (another access method) or
  `no_blocks` (empty relation).
- **Atomic chunks.** Each chunk runs on the trex connection as separate
  statements: `BEGIN`, read `chunks_completed`, the INSERT, the progress
  update, `COMMIT`. A chunk that an earlier attempt committed is skipped; a
  chunk that is not next in order is refused. On any error the transaction is
  rolled back, and the connection is replaced only if the `ROLLBACK` itself
  fails. No DELETE runs before a retry.

## CHUNKED (column ranges)

Tables of other dialects (BigQuery included), and Postgres tables that fall
back, are split on a chunk column into value ranges. Each chunk deletes its
range in the target, then inserts it. This path, and its `plan_id`, are unchanged by PAGE_RANGE.
