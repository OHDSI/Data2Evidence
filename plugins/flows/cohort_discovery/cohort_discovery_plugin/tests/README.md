# cohort_discovery tests

Two layers of tests live here:

- **Unit / pure-logic suite** — `test_types.py`, `test_bunny_config.py`,
  `test_bunny_runner.py`, `test_flow.py`. No external services; safe to run
  anywhere.
- **Integration test** — `test_integration.py`. Marked `@pytest.mark.integration`
  and skipped unless two env vars point at real fixtures (see below).

## Running the unit suite

`test_flow.py` needs a separate venv — it imports `prefect.testing.utilities`,
and `prefect` is only a `default`-feature dependency, which doesn't have
`pip`/`pytest` available in the worker image. Use a venv with `prefect`,
`pydantic`, and `pytest` installed (referred to below as `/tmp/cdvenv`;
provision it however your CI/dev setup normally installs Python deps):

```sh
cd plugins/flows/cohort_discovery
PYTHONPATH="$PWD:$PWD/..:$PWD/../.." /tmp/cdvenv/bin/pytest cohort_discovery_plugin/tests/test_flow.py -v
```

`test_types.py`, `test_bunny_config.py`, `test_bunny_runner.py`, and
`test_integration.py` have no `prefect` dependency and run inside the pixi
`bunny` environment (which has `pytest` and hutch-bunny installed):

```sh
cd plugins/flows/cohort_discovery
pixi run --frozen -e bunny pytest cohort_discovery_plugin/tests/ -v \
  --ignore=cohort_discovery_plugin/tests/test_flow.py
```

(Running the full directory — including `test_flow.py` — under `-e bunny`
fails collection with `ModuleNotFoundError: No module named 'prefect'`, since
that env has no `prefect`.)

The `integration` marker is registered in `pyproject.toml`
(`[tool.pytest.ini_options] markers`), so `-m integration` (or `-m "not
integration"`) runs without an "unknown marker" warning.

## Running the integration test

`test_integration.py::test_child_runs_against_duckdb` boots the Bunny child
(`pixi run --frozen -e bunny python -m cohort_discovery_plugin.bunny_runner`)
against a real DuckDB OMOP database and a stub Relay Task API.

> **This is NOT the production path.** The DuckDB file is only a cheap,
> self-contained **Bunny-level fixture** for local testing: it drives Bunny's
> own DuckDB client directly. In production the flow never uses a DuckDB file —
> cachedb is reached over **Trex's PostgreSQL wire protocol**, with `TrexDao`
> resolving the connection details and Bunny connecting via its PostgreSQL
> client (`DATASOURCE_DB_DRIVERNAME=postgresql`, `DATASOURCE_DB_DATABASE` =
> the `cache_id`). See the group README's "Datasource / cachedb access".

It **skips** unless BOTH of these env vars are set:

| Env var           | Meaning                                                        |
| ----------------- | ------------------------------------------------------------- |
| `TEST_OMOP_DUCKDB`| Path to a DuckDB file containing an OMOP CDM schema (local fixture only). |
| `TEST_RELAY_URL`  | Base URL of a stub relay Task API (used as `TASK_API_BASE_URL`).|

The test also sets `DATASOURCE_DB_SCHEMA` (Bunny requires it for **every**
driver — it has no default; override with `TEST_OMOP_SCHEMA`, default `main`)
and `TASK_API_ENFORCE_HTTPS=false` (stub relays are plain HTTP).

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

`TEST_OMOP_DUCKDB` must be a DuckDB database with an OMOP CDM. This is a
**local test fixture only** — it stands in for a real OMOP datasource so the
child can be exercised without a live Trex/Postgres. Options:

- Export/copy an existing OMOP dataset into a DuckDB file (e.g. via the d2e
  cachedb tooling, or `duckdb` `IMPORT`/`COPY` from OMOP CSVs).
- Or build a minimal synthetic OMOP subset (person, observation_period,
  condition_occurrence, concept, …) sufficient for the availability/distribution
  queries the stub relay's task exercises.

Keep the fixture out of version control; the test resolves it from the
`TEST_OMOP_DUCKDB` path at run time.
