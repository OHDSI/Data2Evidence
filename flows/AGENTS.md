# AGENTS.md

## Overview

Python data pipeline layer using Prefect for workflow orchestration. Provides ETL, data quality, OMOP conversion, and analytics flows as plugins.

## Tech Stack

- **Orchestrator**: Prefect 3.0.3+
- **Language**: Python 3.9+
- **Package Manager**: UV (modern Python package manager)
- **R Integration**: rpy2 for OHDSI Hades packages
- **Database**: SQLAlchemy, DuckDB, PostgreSQL

## Commands

```bash
# Install dependencies (per plugin)
cd flows/[category]/[plugin]
uv sync

# Run flow locally
python -m [plugin_name].flow

# Run tests
pytest tests/

# With Prefect test harness
pytest --prefect-test-harness
```

## Project Structure

```
flows/
├── _shared_flow_utils/         # Shared utilities
│   ├── api/                    # API clients
│   ├── dao/                    # Database access
│   └── types.py                # Common types
├── base/                       # Core plugins
│   ├── dqd_plugin/            # Data Quality Dashboard
│   ├── omop_cdm_plugin/       # OMOP CDM operations
│   ├── create_cachedb_file_plugin/
│   └── phenotype_plugin/
├── data_transformation/        # ETL plugins
│   ├── dataflow_ui_plugin/    # Visual ETL execution
│   ├── mimic_omop_conversion_plugin/
│   ├── fhir_to_omop_plugin/
│   └── white_rabbit_plugin/
├── hades/                      # OHDSI analytics
│   ├── cohort_generator_plugin/
│   └── strategus_plugin/
└── [plugin]/
    ├── flow.py                 # Main flow entry
    ├── types.py                # Pydantic models
    ├── pyproject.toml          # Dependencies
    └── tests/
```

## Code Style

### Flow Definition

```python
from prefect import flow, task
from prefect.logging import get_run_logger

from .types import MyOptionsType

@task
async def extract_data(source: str):
    logger = get_run_logger()
    logger.info(f"Extracting from {source}")
    return data

@task
async def transform_data(data):
    return transformed

@flow(name="my_plugin", log_prints=True)
async def my_plugin(options: MyOptionsType):
    logger = get_run_logger()

    data = await extract_data(options.source)
    result = await transform_data(data)

    return result
```

### Options Type (Pydantic)

```python
from pydantic import BaseModel
from typing import Optional

class MyOptionsType(BaseModel):
    databaseCode: str
    schema_name: str
    use_cache_db: bool = False
    cohort_id: Optional[int] = None
```

### Database Access

```python
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.types import SupportedDatabaseDialects, UserType

dbdao = DBDao(
    dialect=SupportedDatabaseDialects.TREX,
    use_cache_db=options.use_cache_db,
    database_code=options.databaseCode,
)

# Get connection string for R packages
r_conn = dbdao.get_r_database_connector_connection_string(
    user_type=UserType.READ_USER
)
```

### API Clients

```python
from _shared_flow_utils.api.AnalyticsSvcAPI import AnalyticsSvcAPI
from _shared_flow_utils.api.PortalServerAPI import PortalServerAPI

analytics_api = AnalyticsSvcAPI()
portal_api = PortalServerAPI()
```

## Plugin Registration

Plugins are discovered by Prefect via `flowinit.py` and registered in the dataflow system.

## Testing

```python
import pytest
from prefect.testing.utilities import prefect_test_harness

@pytest.fixture(autouse=True, scope="session")
def prefect_test_fixture():
    with prefect_test_harness():
        yield

def test_my_flow():
    result = my_plugin(options)
    assert result is not None
```

## Shared Utilities

Located in `_shared_flow_utils/`:

- `api/` - API clients (Analytics, Portal, DICOM, OpenID)
- `dao/` - Database access objects
- `types.py` - Common enums and types
- `rutils.py` - R integration utilities

## Important Files

- `_shared_flow_utils/dao/DBDao.py` - Main database access
- `_shared_flow_utils/types.py` - Shared type definitions
- `[plugin]/flow.py` - Plugin entry point
- `[plugin]/types.py` - Plugin-specific options
