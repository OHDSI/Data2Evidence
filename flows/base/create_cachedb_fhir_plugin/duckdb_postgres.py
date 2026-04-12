import requests

from psycopg2 import connect

from prefect import task
from prefect.variables import Variable
from prefect.blocks.system import Secret
from prefect.logging import get_run_logger

from .config import CreateDuckdbDatabaseFileType
from _shared_flow_utils.api.OpenIdAPI import OpenIdAPI


def _select_clause(inspector, schema: str, table: str, alias: str | None = None) -> str:
    """
    Build a SELECT clause for the given Postgres table. Array-typed columns
    (e.g. varchar[], text[]) are cast to VARCHAR to ensure they can be
    consumed consistently by downstream queries executed via the Trex/Postgres
    interface.
    """
    cols_info = inspector.get_columns(schema=schema, table_name=table)
    prefix = f'"{alias}".' if alias else ""
    parts = []
    for col in cols_info:
        name = col["name"]
        if "ARRAY" in type(col["type"]).__name__.upper():
            parts.append(f'{prefix}"{name}"::VARCHAR AS "{name}"')
        else:
            parts.append(f'{prefix}"{name}"')
    return ", ".join(parts)


# Medplum system/admin tables that are never clinical data.
_SYSTEM_TABLES = frozenset({
    'Project', 'ProjectMembership', 'ClientApplication', 'User', 'Bot',
    'AccessPolicy', 'UserConfiguration', 'JsonWebKey', 'Login',
    'PasswordChangeRequest', 'SmartAppLaunch', 'DomainConfiguration',
    'AsyncJob', 'Agent', 'IdentityProvider', 'UserSecurityRequest',
    'ViewDefinition', 'BulkDataExport', 'DatabaseMigration',
})


@task(log_prints=True)
def get_fhir_project_id_task(study_code: str) -> str:
    """
    Look up the medplum fhir_project_id for the dataset identified by studyCode.
    Uses client credentials (OpenIdAPI) — does not require flow run input.
    """
    logger = get_run_logger()
    auth = OpenIdAPI()
    token = auth.getClientCredentialToken()

    service_routes = Variable.get("service_routes")
    datasets_url = service_routes["portalServer"] + "/dataset/list/systemadmin"
    logger.info(f"Retrieving datasets from portal: {datasets_url}")

    result = requests.get(
        datasets_url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        verify=auth.get_verify_value(),
        timeout=30,
    )
    if result.status_code >= 400:
        raise Exception(f"[{result.status_code}] Failed to retrieve datasets from portal")

    datasets = result.json()
    dataset = next((d for d in datasets if d.get("tokenStudyCode") == study_code), None)
    if not dataset:
        raise Exception(f"No dataset found for studyCode '{study_code}'")
    fhir_project_id = dataset.get("fhir_project_id")
    if not fhir_project_id:
        raise Exception(f"Dataset '{study_code}' has no fhir_project_id set")
    logger.info(f"Resolved fhir_project_id='{fhir_project_id}' for study '{study_code}'")
    return fhir_project_id


@task(log_prints=True)
def copy_fhir_resources_task(
    fhir_project_id: str,
    src_con,
    options: CreateDuckdbDatabaseFileType,
) -> None:
    """
    Copy FHIR resource tables directly from medplum postgres to the trex
    cache schema.
    """
    logger = get_run_logger()
    fhir_schema = options.schemaName

    # Discover and categorize tables via DBDao
    all_tables = src_con.get_table_names(fhir_schema)
    history_tables = {t for t in all_tables if t.endswith('_History')}
    references_tables = {t for t in all_tables if t.endswith('_References')}

    resource_types = []    # main tables: have projectId, filtered by project
    resourceid_tables = [] # search index tables: have resourceId, joined via subquery

    for t in all_tables:
        if t in _SYSTEM_TABLES or t.endswith('_History') or t.endswith('_References'):
            continue
        cols = src_con.get_columns(fhir_schema, t)
        if 'projectId' in cols:
            resource_types.append(t)
        elif 'resourceId' in cols:
            resourceid_tables.append(t)

    logger.info(f"Copying {len(resource_types)} resource type(s): {resource_types}")
    logger.info(f"Copying {len(history_tables)} history table(s): {sorted(history_tables)}")
    logger.info(f"Copying {len(references_tables)} references table(s): {sorted(references_tables)}")
    logger.info(f"Copying {len(resourceid_tables)} search index table(s): {resourceid_tables}")

    src_db = options.sourceDatabase

    trex_conn = connect(
        host=Variable.get("trex_sql_host"),
        port=Variable.get("trex_sql_port"),
        user=Variable.get("trex_sql_user"),
        password=Secret.load("trex-sql-password").get(),
        dbname=options.databaseCode,
    )
    trex_conn.autocommit = True
    trex_cursor = trex_conn.cursor()

    try:
        trex_cursor.execute("CALL pg_clear_cache();")
        trex_cursor.execute(
            f'CREATE SCHEMA IF NOT EXISTS "{options.databaseCode}"."{options.cacheSchemaName}";'
        )

        inspector = src_con.inspector

        # ── Temp table of all project resource ids ────────────────────────────
        # One parameterised INSERT per resource type keeps each statement small
        # and ensures fhir_project_id is never interpolated into SQL strings.
        # Search-index tables join against this temp table instead of inlining
        # a large UNION ALL.
        trex_cursor.execute('DROP TABLE IF EXISTS "_project_resource_ids";')
        trex_cursor.execute('CREATE TEMP TABLE "_project_resource_ids" (id VARCHAR);')
        for rt in resource_types:
            trex_cursor.execute(
                f'INSERT INTO "_project_resource_ids" '
                f'SELECT id FROM "{src_db}"."{fhir_schema}"."{rt}" '
                f'WHERE "projectId" = %s AND deleted = false;',
                (fhir_project_id,),
            )

        for resource_type in resource_types:
            # ── Main table (project-scoped) ───────────────────────────────────
            sel = _select_clause(inspector, fhir_schema, resource_type)
            trex_cursor.execute(
                f'CREATE OR REPLACE TABLE "{options.databaseCode}"."{options.cacheSchemaName}"."{resource_type}" AS '
                f'SELECT {sel} FROM "{src_db}"."{fhir_schema}"."{resource_type}" '
                f'WHERE "projectId" = %s AND deleted = false;',
                (fhir_project_id,),
            )
            trex_cursor.execute(
                f'SELECT COUNT(*) FROM "{options.databaseCode}"."{options.cacheSchemaName}"."{resource_type}"'
            )
            count = trex_cursor.fetchone()[0]
            logger.info(f"  {resource_type}: {count} rows.")

            # ── History table (scoped via join on resource id) ─────────────────
            history_src = f"{resource_type}_History"

            if history_src not in history_tables:
                logger.info(f"  No history table for '{resource_type}', skipping.")
                continue

            h_sel = _select_clause(inspector, fhir_schema, history_src, alias="h")
            trex_cursor.execute(
                f'CREATE OR REPLACE TABLE "{options.databaseCode}"."{options.cacheSchemaName}"."{history_src}" AS '
                f'SELECT {h_sel} FROM "{src_db}"."{fhir_schema}"."{history_src}" h '
                f'JOIN "{src_db}"."{fhir_schema}"."{resource_type}" p ON p.id = h.id '
                f'WHERE p."projectId" = %s;',
                (fhir_project_id,),
            )
            trex_cursor.execute(
                f'SELECT COUNT(*) FROM "{options.databaseCode}"."{options.cacheSchemaName}"."{history_src}"'
            )
            history_count = trex_cursor.fetchone()[0]
            logger.info(f"  {history_src}: {history_count} rows.")

            # ── References table (scoped via join on resourceId) ───────────────
            references_src = f"{resource_type}_References"

            if references_src not in references_tables:
                logger.info(f"  No references table for '{resource_type}', skipping.")
                continue

            r_sel = _select_clause(inspector, fhir_schema, references_src, alias="r")
            trex_cursor.execute(
                f'CREATE OR REPLACE TABLE "{options.databaseCode}"."{options.cacheSchemaName}"."{references_src}" AS '
                f'SELECT {r_sel} FROM "{src_db}"."{fhir_schema}"."{references_src}" r '
                f'JOIN "{src_db}"."{fhir_schema}"."{resource_type}" p ON p.id = r."resourceId" '
                f'WHERE p."projectId" = %s;',
                (fhir_project_id,),
            )
            trex_cursor.execute(
                f'SELECT COUNT(*) FROM "{options.databaseCode}"."{options.cacheSchemaName}"."{references_src}"'
            )
            references_count = trex_cursor.fetchone()[0]
            logger.info(f"  {references_src}: {references_count} rows.")

        # ── Search index tables (HumanName, Identifier, etc.) ────────────────
        # Join against the temp table — no large UNION ALL, no interpolation.
        for table in resourceid_tables:
            r_sel = _select_clause(inspector, fhir_schema, table, alias="r")
            trex_cursor.execute(
                f'CREATE OR REPLACE TABLE "{options.databaseCode}"."{options.cacheSchemaName}"."{table}" AS '
                f'SELECT {r_sel} FROM "{src_db}"."{fhir_schema}"."{table}" r '
                f'JOIN "_project_resource_ids" p ON p.id = r."resourceId";'
            )
            trex_cursor.execute(
                f'SELECT COUNT(*) FROM "{options.databaseCode}"."{options.cacheSchemaName}"."{table}"'
            )
            count = trex_cursor.fetchone()[0]
            logger.info(f"  {table}: {count} rows.")

        logger.info(
            f"Done. Cache schema '{options.cacheSchemaName}' populated "
            f"for project '{fhir_project_id}'."
        )

    except Exception as e:
        logger.error(f"Error copying FHIR resources: {e}")
        raise
    finally:
        trex_cursor.close()
        trex_conn.close()
