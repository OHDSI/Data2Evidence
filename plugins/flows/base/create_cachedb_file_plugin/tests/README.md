# create_cachedb_file_plugin tests

Two layers:

- **Pure suite** — `test_chunk_planner.py`, `test_planner_properties.py`,
  `test_source_adapter_sql.py`, `test_checkpoint.py`, `test_fresh_copy.py`,
  `test_options.py`. These import only `pytest`, `duckdb` and `pydantic`; the
  modules under test never import `prefect`. Safe to run anywhere.
- **Integration** — `test_copy_integration.py`. Uses local DuckDB as both source
  and target. Slower; still no external services.

## Running

```sh
python3 -m venv /tmp/cachevenv
/tmp/cachevenv/bin/pip install pytest==9.0.3 duckdb==1.4.0 pydantic==2.10.6

cd plugins/flows/base
PYTHONPATH="$PWD:$PWD/.." /tmp/cachevenv/bin/pytest create_cachedb_file_plugin/tests/ -v
```

`PYTHONPATH` needs both `plugins/flows/base` (for the plugin package) and
`plugins/flows` (for `_shared_flow_utils`), matching the convention in
`cohort_discovery_plugin/tests/README.md`.

## Import discipline

`errors.py`, `planner_types.py`, `chunk_utils.py`, `source_stats.py` and
`checkpoint.py` must never import `prefect`. They take a `logger` argument
instead. That is what lets this suite run without the Prefect worker image.
