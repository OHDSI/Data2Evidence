import os, json, subprocess, pathlib, pytest

BUNNY = ["pixi", "run", "--frozen", "-e", "bunny", "python", "-m", "cohort_discovery_plugin.bunny_runner"]

@pytest.mark.integration
def test_child_runs_against_duckdb():
    """Requires a DuckDB OMOP cachedb fixture (TEST_OMOP_DUCKDB) and a stub relay (TEST_RELAY_URL)
    returning one availability task and accepting POST results.

    NOTE: this drives Bunny's own DuckDB client directly as a cheap local fixture.
    It is NOT the production path — production reaches cachedb over Trex's
    PostgreSQL wire protocol (`DATASOURCE_DB_DRIVERNAME=postgresql`).
    """
    duckdb_file = pathlib.Path(os.environ.get("TEST_OMOP_DUCKDB", "")).resolve()
    if not duckdb_file.exists() or not os.environ.get("TEST_RELAY_URL"):
        pytest.skip("Set TEST_OMOP_DUCKDB and TEST_RELAY_URL to run this test")
    env = {
        **os.environ,
        "DATASOURCE_DB_DRIVERNAME": "duckdb",
        "DATASOURCE_DUCKDB_PATH_TO_DB": str(duckdb_file),
        # Required by Bunny's DaemonSettings for every driver (no default).
        "DATASOURCE_DB_SCHEMA": os.environ.get("TEST_OMOP_SCHEMA", "main"),
        "COLLECTION_ID": "ds-test",
        "TASK_API_BASE_URL": os.environ["TEST_RELAY_URL"],
        "TASK_API_USERNAME": "u", "TASK_API_PASSWORD": "p",
        # Stub relays are plain HTTP; Bunny enforces HTTPS by default.
        "TASK_API_ENFORCE_HTTPS": "false",
        "LOW_NUMBER_SUPPRESSION_THRESHOLD": "10", "ROUNDING_TARGET": "10",
    }
    proc = subprocess.run(BUNNY, cwd="plugins/flows/cohort_discovery", env=env, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr[-2000:]
    out = json.loads(proc.stdout.strip().splitlines()[-1])
    assert out["error"] is None
    assert out["results"], "expected at least one resolved task"
