import os, json, subprocess, pathlib, pytest

BUNNY = ["pixi", "run", "--frozen", "-e", "bunny", "python", "-m", "cohort_discovery_plugin.bunny_runner"]

@pytest.mark.integration
def test_child_runs_against_duckdb():
    """Requires a DuckDB OMOP cachedb fixture (TEST_OMOP_DUCKDB) and a stub relay (TEST_RELAY_URL)
    returning one availability task and accepting POST results."""
    duckdb_file = pathlib.Path(os.environ.get("TEST_OMOP_DUCKDB", "")).resolve()
    if not duckdb_file.exists() or not os.environ.get("TEST_RELAY_URL"):
        pytest.skip("Set TEST_OMOP_DUCKDB and TEST_RELAY_URL to run this test")
    env = {
        **os.environ,
        "DATASOURCE_DB_DRIVERNAME": "duckdb",
        "DATASOURCE_DUCKDB_PATH_TO_DB": str(duckdb_file),
        "COLLECTION_ID": "ds-test",
        "TASK_API_BASE_URL": os.environ["TEST_RELAY_URL"],
        "TASK_API_USERNAME": "u", "TASK_API_PASSWORD": "p",
        "LOW_NUMBER_SUPPRESSION_THRESHOLD": "10", "ROUNDING_TARGET": "10",
    }
    proc = subprocess.run(BUNNY, cwd="plugins/flows/cohort_discovery", env=env, capture_output=True, text=True)
    assert proc.returncode == 0, proc.stderr[-2000:]
    out = json.loads(proc.stdout.strip().splitlines()[-1])
    assert out["error"] is None
    assert out["results"], "expected at least one resolved task"
