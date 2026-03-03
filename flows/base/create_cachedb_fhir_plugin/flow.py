import os

from prefect import flow
from prefect.variables import Variable
from prefect.logging import get_run_logger

from .config import CreateDuckdbDatabaseFileType
from .duckdb_postgres import create_schema_if_not_exists_task, create_schema_tables_task
from .fhir_export import (
    trigger_fhir_export_task,
    poll_export_status_task,
    stream_and_load_ndjson_task,
)
from _shared_flow_utils.dao.sqlalchemydao import SqlAlchemyDao


os.environ["plugin_name"] = "create_cachedb_fhir_plugin"


@flow(log_prints=True)
def create_cachedb_fhir_plugin(options: CreateDuckdbDatabaseFileType):
    logger = get_run_logger()
    logger.info(
        f"Starting FHIR cache creation from medplum for database "
        f"'{options.databaseCode}' → schema '{options.cacheSchemaName}'"
    )

    # ── Step 1: Trigger bulk export scoped to this dataset's FHIR project ───
    polling_url = trigger_fhir_export_task(study_code=options.studyCode)

    # ── Step 2: Poll until the export job finishes ───────────────────────────
    manifest = poll_export_status_task(polling_url)

    # ── Step 3: Create schema if not exists and create empty target tables ─
    # Read-side DAO used to inspect source schema
    src_dao = SqlAlchemyDao(False, options.databaseCode)

    # DuckDB file path (used only if not using Trex connection)
    duckdb_file_path = Variable.get("duckdb_data_folder")

    # Use Trex connection for writes (create schema + tables in Trex)
    use_trex = True

    create_schema_if_not_exists_task(use_trex, options, duckdb_file_path)
    create_schema_tables_task(use_trex, src_dao, options, duckdb_file_path)

    # ── Step 4: Stream ndjson outputs directly into trex (no temp files) ──
    stream_and_load_ndjson_task(manifest, options, resource_types=options.resourceTypes)

    logger.info(
        f"FHIR cache '{options.cacheSchemaName}' created successfully "
        f"for database '{options.databaseCode}'."
    )
