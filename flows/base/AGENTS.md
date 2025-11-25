# AGENTS.md

## Overview

Core flow plugins providing fundamental data operations: DuckDB caching, data quality assessment, OMOP CDM management, and phenotype definitions.

## Plugins

| Plugin | Purpose |
|--------|---------|
| `create_cachedb_file_plugin` | Create DuckDB cache from files |
| `create_cachedb_fhir_plugin` | Create DuckDB cache from FHIR |
| `dqd_plugin` | Data Quality Dashboard (R/Hades) |
| `omop_cdm_plugin` | OMOP CDM schema operations |
| `data_characterization_plugin` | Data profiling and stats |
| `phenotype_plugin` | Phenotype definitions |
| `hana_load_plugin` | SAP HANA data loading |

## Common Patterns

### DQD Plugin (R Integration)

```python
from rpy2 import robjects
from _shared_flow_utils.rutils import set_trex_env_var

@flow(log_prints=True)
def dqd_plugin(options: DqdOptionsType):
    dbdao = DBDao(database_code=options.databaseCode)
    r_conn = dbdao.get_r_database_connector_connection_string()
    # Execute R code via rpy2
```

### CacheDB Plugin

```python
@flow(log_prints=True)
def create_cachedb_file_plugin(options: CachedbOptionsType):
    # Create DuckDB file from source data
    # Export to analytics cache
```

## Testing

```bash
cd base/[plugin]
pytest tests/
```

## Important Files

- `dqd_plugin/flow.py` - Data quality assessment
- `omop_cdm_plugin/flow.py` - CDM schema management
- `create_cachedb_file_plugin/flow.py` - Cache creation
