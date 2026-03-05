# MIMIC-IV to OMOP CDM Conversion Plugin

This plugin converts MIMIC-IV (`hosp` and `icu` modules) to OMOP CDM 5.3 format.
Supported versions: **MIMIC-IV v2.2** and **MIMIC-IV v3.1**.
Waveform and clinical note data are not included in the conversion.

### Preparation

#### 1. Download Source Data
- MIMIC-IV data from [PhysioNet](https://physionet.org)
- OMOP ATHENA vocabularies from [athena.ohdsi.org](https://athena.ohdsi.org/vocabulary/list)

#### 2. Transform Vocabulary Files

Transform vocabulary CSV files to the expected format (see [load-vocab.md](https://github.com/data2evidence/d2e/blob/dev2/docs/2-load/7-load-vocab.md)):

```bash
mkdir transformed
for CSV_FILE in *.csv; do sed "s/\"/\"\"/g;s/\t/\"\t\"/g;s/\(.*\)/\"\1\"/" $CSV_FILE >> ./transformed/$CSV_FILE; done
```

This script:
- Escapes existing double quotes
- Wraps each value in double quotes
- Safely handles embedded tab and newline characters
- Outputs processed files to the `transformed/` folder

#### 3. Mount Data Volumes

Add the following entries to `PREFECT_DOCKER_VOLUMES` in the `.env` file:

```
/path/to/mimic/data:/app/mimic_omop/mimic
/path/to/vocabulary/data:/app/mimic_omop/vocab
```

### Plugin Parameters

| Parameter | Default | Description |
|---|---|---|
| `duckdb_file_path` | `/app/mimic_omop/mimic/mimic_omop_duckdb` | Path to the DuckDB working file created during conversion. |
| `mimic_dir` | `/app/mimic_omop/mimic` | Directory containing the MIMIC-IV source data. |
| `vocab_dir` | `/app/mimic_omop/vocab` | Directory containing the OMOP vocabulary files. |
| `load_mimic_vocab` | `True` | Set to `False` to skip the data loading stage when re-running after a failure in the ETL stage, avoiding redundant reloading. |
| `database_code` | — | Target database. Supports PostgreSQL and HANA. |
| `schema_name` | — | Schema name for storing the converted OMOP CDM tables. |
| `chunk_size` | `5000` | Batch size for inserting rows into the target database. |

### Time & Memory Requirements

> **Warning:** Insufficient RAM or disk space will cause the container to crash with an out-of-memory (OOM) error.

#### Minimum Recommended Resources
> **Set `MIMIC_DUCKDB_THREADS` and `MIMIC_DUCKDB_MEMORY_LIMIT`** in .env file
Benchmarked on a server with 32 GB RAM and 512 GB disk (MIMIC-IV v2.2, full dataset):

- **Container memory limit:** ≥ 20 GB
- **DuckDB memory limit:** 15 GB
- **DuckDB threads:** 4
- **Peak disk usage:** ~100 GB

> The staging of ICU tables and execution of `cdm_drug_era.sql` are the most memory-intensive steps.
> Running with less than the recommended memory will result in OOM failure at these stages.

#### Estimated Runtimes

Benchmarked on a server with 32 GB RAM and 512 GB disk (MIMIC-IV v2.2, full dataset):

| Stage | Duration |
|---|---|
| Loading MIMIC-IV v2.2 + OMOP vocabulary into DuckDB | ~25 min |
| Staging | ~20 min |
| ETL transformations | ~50 min |
| Unloading CDM to DuckDB file (~61 GB) | ~5 min |
| Exporting DuckDB → PostgreSQL | ~25 min |
| Final PostgreSQL database size | ~46 GB |
