import sys
from pathlib import Path

import pytest

# Requires the base flow deps (see plugins/flows/base/pyproject.toml):
# psycopg2, duckdb, sqlalchemy, pandas, PyJWT — requirements-dev.txt alone is
# not sufficient; prefect_test_harness on 3.6.10 also needs a compatible
# fastapi pin (e.g. fastapi==0.115.x; 0.139+ breaks PrefectRouter).

# tests/ -> create_cachedb_file_plugin -> base -> flows
FLOWS_ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(FLOWS_ROOT))            # _shared_flow_utils imports
sys.path.insert(0, str(FLOWS_ROOT / "base"))   # create_cachedb_file_plugin package

from prefect.testing.utilities import prefect_test_harness  # noqa: E402
from prefect.variables import Variable  # noqa: E402


@pytest.fixture(autouse=True, scope="session")
def prefect_test_fixture():
    # Ephemeral Prefect backend. Variables must exist BEFORE the plugin modules
    # are imported: their @task decorators call Variable.get at import time
    # (copy.py / fts.py: timeout_seconds=int(Variable.get("cache_task_timeout"))).
    with prefect_test_harness():
        Variable.set("cache_task_timeout", "3600")
        yield
