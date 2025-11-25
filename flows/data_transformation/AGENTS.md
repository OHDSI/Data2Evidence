# AGENTS.md

## Overview

ETL and data transformation plugins for converting clinical data into OMOP CDM format. Includes visual dataflow execution, FHIR conversion, MIMIC-IV processing, and NLP extraction.

## Plugins

| Plugin | Purpose |
|--------|---------|
| `dataflow_ui_plugin` | Execute visual ETL dataflows |
| `mimic_omop_conversion_plugin` | MIMIC-IV to OMOP CDM |
| `fhir_to_omop_plugin` | FHIR to OMOP conversion |
| `data_load_plugin` | Generic data loading |
| `data_load_fhir_plugin` | FHIR data loading |
| `white_rabbit_plugin` | Data quality scanning |
| `ner_extract_plugin` | NLP entity extraction |
| `dicom_etl_plugin` | DICOM medical imaging |
| `questionnaire_plugin` | Health questionnaire data |

## Dataflow UI Plugin

Executes visual ETL dataflows designed in the Flow UI. Supports node types:

- `csv_node` - CSV file input/output
- `sql_node` - SQL transformations
- `python_node` - Python code execution
- `r_node` - R code execution
- `data_mapping_node` - Field mapping

```python
@flow(log_prints=True)
def dataflow_ui_plugin(options: DataflowOptionsType):
    # Parse JSON graph definition
    # Execute nodes in topological order
    # Handle data flow between nodes
```

## MIMIC Conversion

```python
@flow(log_prints=True, persist_result=True)
def mimic_omop_conversion_plugin(options: MimicOMOPOptionsType):
    match options.flowAction:
        case FlowActionType.MIMIC_TO_DATABASE:
            mimic_to_duckdb_flow(options)
            duckdb_to_database_flow(options)
            cleanup(options)
```

## Testing

```bash
cd data_transformation/[plugin]
pytest tests/

# Dataflow UI tests
pytest tests/test_generate_node.py
```

## Test Data

Located in `[plugin]/tests/data/`:
- Sample CSV files
- Mock OMOP tables
- Graph definitions

## Important Files

- `dataflow_ui_plugin/flow.py` - Visual ETL execution
- `dataflow_ui_plugin/nodes.py` - Node type implementations
- `mimic_omop_conversion_plugin/flow.py` - MIMIC conversion
- `fhir_to_omop_plugin/flow.py` - FHIR transformation
