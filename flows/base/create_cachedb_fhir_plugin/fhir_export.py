import os
from pathlib import Path
from collections import defaultdict

from psycopg2 import connect

from prefect import task
from prefect.variables import Variable
from prefect.blocks.system import Secret
from prefect.logging import get_run_logger
import requests
from urllib.parse import urlparse

from .config import CreateDuckdbDatabaseFileType
from _shared_flow_utils.api.FhirAPI import FhirAPI
from _shared_flow_utils.dao.sqlalchemydao import SqlAlchemyDao
from sqlalchemy.dialects import postgresql
from .duckdb_postgres import copy_schema_to_cache, create_schema_if_not_exists_task
from prefect.context import TaskRunContext


_BATCH_SIZE = 500

def get_trex_connection(database_code: str):    
    conn = connect(
        host=Variable.get("trex_sql_host"),
        port=Variable.get("trex_sql_port"),
        user=Variable.get("trex_sql_user"),
        password=Secret.load("trex-sql-password").get(),
        dbname=database_code,
    )
    conn.autocommit = True
    return conn

@task(log_prints=True)
def trigger_fhir_export_task(study_code: str) -> str:
    """
    Trigger a FHIR bulk $export scoped to the dataset identified by study_code
    (tokenStudyCode). Returns the Content-Location polling URL.
    """
    logger = get_run_logger()
    api = FhirAPI()

    logger.info(f"Triggering FHIR bulk export for study '{study_code}'...")

    polling_url = api.trigger_bulk_export(study_code=study_code)
    logger.info(f"Export triggered. Polling URL: {polling_url}")
    return polling_url


@task(log_prints=True)
def poll_export_status_task(polling_url: str) -> dict:
    """
    Poll the export job until it completes and return the manifest dict.
    The manifest contains an 'output' list of {type, url} entries.
    """
    logger = get_run_logger()
    logger.info(f"Polling export status at: {polling_url}")

    api = FhirAPI()
    manifest = api.poll_export_status(polling_url)

    output_files = manifest.get("output", [])
    error_files = manifest.get("error", [])
    logger.info(
        f"Export manifest received: {len(output_files)} output file(s), "
        f"{len(error_files)} error file(s)."
    )
    if error_files:
        logger.warning(f"Export errors: {error_files}")
    return manifest


@task(log_prints=True)
def download_ndjson_files_task(
    manifest: dict,
    download_dir: str,
    resource_types: list[str] = None,
) -> list[tuple[str, str]]:
    """
    Download all ndjson files from the export manifest to download_dir.
    Returns a list of (resource_type_lower, local_file_path) tuples.

    If resource_types is provided only those resource types are downloaded.
    Multiple files for the same resource type are numbered sequentially.
    """
    logger = get_run_logger()
    api = FhirAPI()

    os.makedirs(download_dir, exist_ok=True)

    output_files = manifest.get("output", [])
    if not output_files:
        logger.warning("Export manifest contains no output files.")
        return []

    # Count how many files we've already seen per type (for unique naming)
    type_counters: dict[str, int] = defaultdict(int)
    downloaded: list[tuple[str, str]] = []

    for file_info in output_files:
        resource_type = file_info.get("type", "")
        url = file_info.get("url", "")

        if not resource_type or not url:
            logger.warning(f"Skipping invalid manifest entry: {file_info}")
            continue

        if resource_types and resource_type not in resource_types:
            logger.info(f"Skipping resource type '{resource_type}' (not in allow-list).")
            continue

        idx = type_counters[resource_type]
        type_counters[resource_type] += 1

        suffix = f"_{idx}" if idx > 0 else ""
        file_name = f"{resource_type}{suffix}.ndjson"
        output_path = os.path.join(download_dir, file_name)

        logger.info(f"Downloading {resource_type} → {output_path}")
        api.download_ndjson_file(url, output_path)

        size_kb = os.path.getsize(output_path) / 1024
        logger.info(f"  {file_name}: {size_kb:.1f} KB")

        downloaded.append((resource_type.lower(), output_path))

    logger.info(f"Downloaded {len(downloaded)} file(s) for {len(type_counters)} resource type(s).")
    return downloaded


@task(log_prints=True)
def load_ndjson_to_trex_task(
    ndjson_files: list[tuple[str, str]],
    options: CreateDuckdbDatabaseFileType,
) -> None:
    """
    Load downloaded ndjson files into trex.

    Each resource type maps to a table named after the lowercased resource type
    inside options.cacheSchemaName.  Each row stores the full FHIR resource JSON
    in a single 'content' JSON column, matching the schema expected by the
    existing FHIR cache queries.

    Multiple files for the same resource type are appended to the same table.
    """
    logger = get_run_logger()

    if not ndjson_files:
        logger.warning("No ndjson files to load.")
        return

    trex_conn = connect(
        host=Variable.get("trex_sql_host"),
        port=Variable.get("trex_sql_port"),
        user=Variable.get("trex_sql_user"),
        password=Secret.load("trex-sql-password").get(),
        dbname=options.databaseCode,
    )
    trex_conn.autocommit = True
    pg_cursor = None

    try:
        pg_cursor = trex_conn.cursor()
        pg_cursor.execute("CALL pg_clear_cache();")

        # Ensure the target schema exists
        pg_cursor.execute(
            f'CREATE SCHEMA IF NOT EXISTS "{options.databaseCode}"."{options.cacheSchemaName}";'
        )
        logger.info(
            f"Schema '{options.databaseCode}'.'{options.cacheSchemaName}' ready."
        )

        # Track which tables have already been created so we INSERT for subsequent
        # files of the same resource type rather than CREATE.
        created_tables: set[str] = set()

        for resource_type, ndjson_path in ndjson_files:
            table_name = resource_type  # already lowercased

            if table_name not in created_tables:
                # Drop any stale table and create fresh
                pg_cursor.execute(
                    f'DROP TABLE IF EXISTS '
                    f'"{options.databaseCode}"."{options.cacheSchemaName}"."{table_name}";'
                )
                pg_cursor.execute(
                    f'CREATE TABLE '
                    f'"{options.databaseCode}"."{options.cacheSchemaName}"."{table_name}" '
                    f'(content JSON);'
                )
                created_tables.add(table_name)
                logger.info(f"Created table '{options.cacheSchemaName}'.'{table_name}'.")

            row_count = _insert_ndjson_file(pg_cursor, ndjson_path, options, table_name, logger)
            logger.info(
                f"Loaded {row_count} row(s) from '{Path(ndjson_path).name}' "
                f"into '{table_name}'."
            )

        logger.info(
            f"All ndjson files loaded into schema '{options.cacheSchemaName}' "
            f"({len(created_tables)} table(s) created)."
        )

    except Exception as e:
        logger.error(f"Error loading ndjson into trex: {e}")
        raise
    finally:
        if pg_cursor:
            pg_cursor.close()
        trex_conn.close()


def _insert_ndjson_file(
    cursor,
    ndjson_path: str,
    options: CreateDuckdbDatabaseFileType,
    table_name: str,
    logger,
) -> int:
    """
    Read an ndjson file line-by-line and insert rows into table_name in batches.
    Returns the total number of rows inserted.
    """
    row_count = 0
    batch: list[str] = []

    def flush_batch():
        nonlocal row_count
        if not batch:
            return
        values_sql = ", ".join(batch)
        cursor.execute(
            f'INSERT INTO "{options.databaseCode}"."{options.cacheSchemaName}"."{table_name}" '
            f"(content) VALUES {values_sql};"
        )
        row_count += len(batch)
        batch.clear()

    with open(ndjson_path, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            # Escape embedded single quotes for the SQL literal
            escaped = line.replace("'", "''")
            batch.append(f"('{escaped}'::JSON)")

            if len(batch) >= _BATCH_SIZE:
                flush_batch()

    flush_batch()
    return row_count


@task(log_prints=True)
def stream_and_load_ndjson_task(
    manifest: dict,
    options: CreateDuckdbDatabaseFileType,
    resource_types: list[str] | None = None,
) -> None:
    logger = get_run_logger()
    api = FhirAPI()

    output_files = manifest.get("output", [])
    if not output_files:
        logger.warning("Export manifest contains no output files.")
        return

    # Connect to Trex (write) and prepare cursor
    trex_conn = connect(
        host=Variable.get("trex_sql_host"),
        port=Variable.get("trex_sql_port"),
        user=Variable.get("trex_sql_user"),
        password=Secret.load("trex-sql-password").get(),
        dbname=options.databaseCode,
    )
    trex_conn.autocommit = True
    pg_cursor = trex_conn.cursor()

    created_tables: set[str] = set()
    skipped_files = []

    try:
        for file_info in output_files:
            resource_type = file_info.get("type", "")
            url = file_info.get("url", "")

            if not resource_type or not url:
                logger.warning(f"Skipping invalid manifest entry: {file_info}")
                continue

            if resource_types and resource_type not in resource_types:
                logger.info(f"Skipping resource type '{resource_type}' (not in allow-list).")
                continue

            table_name = resource_type.lower()

            # Stream the ndjson from the gateway and insert rows in batches
            logger.info(f"Streaming {resource_type} from '{url}' into table '{table_name}'")
            resp = requests.get(
                url,
                headers=api._auth_headers("application/fhir+ndjson"),
                verify=api.get_verify_value(),
                stream=True,
            )

            # # Fallbacks for GET failures
            # if resp.status_code != 200:
            #     logger.warning(f"Primary GET failed [{resp.status_code}]; attempting fallbacks for '{url}'")

            #     # Attempt superadmin rewrite when possible
            #     parsed = urlparse(url)
            #     segs = parsed.path.lstrip("/").split("/")
            #     if "project" in segs:
            #         i = segs.index("project")
            #         if i + 2 <= len(segs):
            #             resource_path = "/".join(segs[i + 2 :])
            #             superadmin_url = f"{api.url}superadmin/{resource_path}"
            #             logger.info(f"Attempting superadmin GET: {superadmin_url}")
            #             try:
            #                 super_resp = requests.get(
            #                     superadmin_url,
            #                     headers=api._auth_headers("application/fhir+ndjson"),
            #                     verify=api.get_verify_value(),
            #                     stream=True,
            #                 )
            #                 logger.debug(f"Superadmin GET returned [{super_resp.status_code}] for '{superadmin_url}'")
            #                 if super_resp.status_code == 200:
            #                     resp = super_resp
            #                     logger.info(f"Superadmin GET succeeded for '{superadmin_url}'")
            #             except Exception as e:
            #                 logger.debug(f"Superadmin GET attempt failed for '{superadmin_url}': {e}")

            #     # Try unauthenticated direct GET
            #     if resp.status_code != 200:
            #         try:
            #             direct = requests.get(url, verify=api.get_verify_value(), stream=True)
            #             logger.debug(f"Direct (unauthenticated) GET returned [{direct.status_code}] for '{url}'")
            #             if direct.status_code == 200:
            #                 resp = direct
            #                 logger.info(f"Direct (unauthenticated) GET succeeded for '{url}'")
            #         except Exception as e:
            #             logger.debug(f"Direct (unauthenticated) GET attempt failed for '{url}': {e}")

            #     # Try authenticated direct GET
            #     if resp.status_code != 200:
            #         try:
            #             auth_headers = api._auth_headers("application/fhir+ndjson")
            #             direct_auth = requests.get(url, headers=auth_headers, verify=api.get_verify_value(), stream=True)
            #             logger.debug(f"Direct (authenticated) GET returned [{direct_auth.status_code}] for '{url}'")
            #             if direct_auth.status_code == 200:
            #                 resp = direct_auth
            #                 logger.info(f"Direct (authenticated) GET succeeded for '{url}'")
            #         except Exception as e:
            #             logger.debug(f"Direct (authenticated) GET attempt failed for '{url}': {e}")

            #         if resp.status_code != 200:
            #             logger.error(f"Failed to download ndjson via fhirGateway from '{url}' after fallbacks: [{resp.status_code}] {resp.content}")
            #             skipped_files.append({"type": resource_type, "url": url, "status": resp.status_code})
            #             continue

            row_count = 0
            batch: list[str] = []

            def flush_batch():
                nonlocal row_count
                if not batch:
                    return
                values_sql = ", ".join(batch)
                pg_cursor.execute(
                    f'INSERT INTO "{options.databaseCode}"."{options.cacheSchemaName}"."{table_name}" (content) VALUES {values_sql};'
                )
                row_count += len(batch)
                batch.clear()

            for raw_line in resp.iter_lines(decode_unicode=True):
                if not raw_line:
                    continue
                line = raw_line.strip()
                if not line:
                    continue
                escaped = line.replace("'", "''")
                batch.append(f"('{escaped}'::JSON)")

                if len(batch) >= _BATCH_SIZE:
                    flush_batch()

            flush_batch()
            logger.info(f"Loaded {row_count} row(s) for '{table_name}'.")

        logger.info(f"All ndjson streamed into schema '{options.cacheSchemaName}' ({len(created_tables)} table(s) created).")
        if skipped_files:
            logger.warning(f"The following output files were skipped because they could not be fetched: {skipped_files}")

    except Exception as e:
        logger.error(f"Error streaming ndjson into trex: {e}")
        raise
    finally:
        if pg_cursor:
            pg_cursor.close()
        trex_conn.close()
