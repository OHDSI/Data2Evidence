import os

from prefect import flow
from prefect.logging import get_run_logger

from _shared_flow_utils.dao.DBDao import DBDao

from .config import CreateDuckdbDatabaseFileType
from .duckdb_postgres import get_fhir_project_id_task, copy_fhir_resources_task

os.environ["plugin_name"] = "create_cachedb_fhir_plugin"


@flow(log_prints=True)
def create_cachedb_fhir_plugin(options: CreateDuckdbDatabaseFileType):
    logger = get_run_logger()
    logger.info(f"Flow parameters received: {options.json()}")
    logger.info(
        f"Starting FHIR cache creation from medplum for database "
        f"'{options.databaseCode}' → schema '{options.cacheSchemaName}'"
    )

    # ── Step 1: Resolve the medplum fhir_project_id for this dataset ────────
    # Use fhirProjectId from options if provided, otherwise look it up from the portal.
    fhir_project_id = options.fhirProjectId or get_fhir_project_id_task(study_code=options.studyCode)

    # ── Step 2: Copy FHIR resource tables directly from medplum postgres ─────
    dbdao = DBDao(database_code=options.database_code, cache_id=options.cacheId)
    copy_fhir_resources_task(
        fhir_project_id=fhir_project_id,
        src_con=dbdao,
        options=options,
    )

    logger.info(
        f"FHIR cache '{options.cacheSchemaName}' created successfully "
        f"for database '{options.databaseCode}'."
    )
