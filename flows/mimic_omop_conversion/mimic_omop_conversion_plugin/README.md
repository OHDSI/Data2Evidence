This plugin converts MIMICIV-2.2 `hosp` and `icu` data modules to OMOP CDM 5.3 format. Note that it does not handle waveform or text note data.

### Preparation of MIMICIV Data and OMOP Vocabulary
1. Download MIMICIV 2.2 data from physionet.org
2. Download OMOP ATHENA vocabularies from https://athena.ohdsi.org/vocabulary/list
3. Transform vocabulary CSV files to the expected format (according to https://github.com/data2evidence/d2e/blob/dev2/docs/2-load/7-load-vocab.md).
```
mkdir transformed
for CSV_FILE in *.csv; do sed "s/\"/\"\"/g;s/\t/\"\t\"/g;s/\(.*\)/\"\1\"/" $CSV_FILE >> ./transformed/$CSV_FILE; done
```

> - Escapes existing double quotes
> - Adds double quotes around each value
> - Handles literal string characters (e.g., \t or \n) in values
> - Prevents interpretation of tabs or newlines by enclosing values in double quotes
> - Moves processed files to a 'transformed' folder

4. Mount the MIMIC folder (containing hosp and icu subdirectories) and vocabularies folder to the plugin volume by adding these lines to the PREFECT_DOCKER_VOLUMES environment variable list in "docker-compose.yml" file:
- /path/of/mimic/data:/app/mimic_omop/mimic
- /path/of/vocabulary/data:/app/mimic_omop/vocab

### Plugin Parameters
**duckdb_file_path**: Default '/app/mimic_omop/mimic/mimic_omop_duckdb'  
When running the plugin, it creates a DuckDB file "mimic_omop_duckdb" in the MIMIC folder. User can customize this filename.

**mimic_dir**: Default "/app/mimic_omop/mimic"  
**vocab_dir**: Default "/app/mimic_omop/vocab"  
**load_mimic_vocab**: Default = True  
If the plugin fails during the ETL stage but successfully loads MIMIC and vocabulary data to DuckDB, set this to False when rerunning the plugin.
**database_code**: Supports HANA and PostgreSQL databases  
**schema_name**: Specifies the schema name for storing the transformed OMOP CDM data  
**chunk_size**: Default = 10000, defines the batch size for inserting tables into the HANA database