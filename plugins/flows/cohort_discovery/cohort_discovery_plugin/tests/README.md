# cohort_discovery tests

Two layers of tests live here:

- **Unit / pure-logic suite** — `test_types.py`, `test_bunny_config.py`,
  `test_bunny_runner.py`, `test_flow.py`. No external services; safe to run
  anywhere.
- **Integration test** — `test_integration.py`. Marked `@pytest.mark.integration`
  and skipped unless two env vars point at real fixtures (see below).

## Running the unit suite

From the group directory, using the project test venv:

```sh
cd plugins/flows/cohort_discovery
PYTHONPATH="$PWD:$PWD/..:$PWD/../.." /tmp/cdvenv/bin/pytest cohort_discovery_plugin/tests/ -v
```

Or inside the pixi `bunny` environment (which has `pytest` and hutch-bunny
installed):

```sh
cd plugins/flows/cohort_discovery
pixi run -e bunny pytest cohort_discovery_plugin/tests/ -v
```

The `integration` marker is registered in `pyproject.toml`
(`[tool.pytest.ini_options] markers`), so `-m integration` (or `-m "not
integration"`) runs without an "unknown marker" warning.

## Running the integration test

`test_integration.py::test_child_runs_against_duckdb` boots the Bunny child
(`pixi run --frozen -e bunny python -m cohort_discovery_plugin.bunny_runner`)
against a real DuckDB OMOP database and a stub Relay Task API. It **skips**
unless BOTH of these env vars are set:

| Env var           | Meaning                                                        |
| ----------------- | ------------------------------------------------------------- |
| `TEST_OMOP_DUCKDB`| Path to a DuckDB file containing an OMOP CDM (cachedb) schema. |
| `TEST_RELAY_URL`  | Base URL of a stub relay Task API (used as `TASK_API_BASE_URL`).|

Example:

```sh
cd plugins/flows/cohort_discovery
TEST_OMOP_DUCKDB=/abs/path/omop.duckdb \
TEST_RELAY_URL=http://127.0.0.1:8000/link_connector_api \
PYTHONPATH="$PWD:$PWD/..:$PWD/../.." /tmp/cdvenv/bin/pytest \
  cohort_discovery_plugin/tests/test_integration.py -v -m integration
```

If `TASK_API_BASE_URL` is not HTTPS, the child also needs
`TASK_API_ENFORCE_HTTPS=false` (Bunny's `DaemonSettings` enforces HTTPS by
default).

## Minimal stub relay

The test only needs a tiny HTTP server that mimics the Hutch Relay Task API for
one tick of the poller:

- **Poll endpoint** — return exactly ONE availability task (a Bunny task JSON
  payload, `TASK_API_TYPE=a`) on the first poll, so the child's
  `PollingService(...).poll_for_tasks(max_iterations=1)` resolves one task.
- **Results endpoint** — accept the child's `POST` of results and reply
  `HTTP 200`.

Any language works; a handful of lines with Python's `http.server` (or a small
Flask/FastAPI app) is enough. Point `TEST_RELAY_URL` at its base URL. Do not
hardcode a real deployment URL.

## Building a DuckDB OMOP fixture

`TEST_OMOP_DUCKDB` must be a DuckDB database with an OMOP CDM (the same shape a
cachedb exposes). Options:

- Export/copy an existing OMOP dataset into a DuckDB file (e.g. via the d2e
  cachedb tooling, or `duckdb` `IMPORT`/`COPY` from OMOP CSVs).
- Or build a minimal synthetic OMOP subset (person, observation_period,
  condition_occurrence, concept, …) sufficient for the availability/distribution
  queries the stub relay's task exercises.

Keep the fixture out of version control; the test resolves it from the
`TEST_OMOP_DUCKDB` path at run time.
