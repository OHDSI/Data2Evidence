import os
from pathlib import Path
from time import process_time

from prefect.blocks.system import Secret

from .config import DUCKDB_FULLTEXT_SEARCH_CONFIG
from _shared_flow_utils.types import SupportedDatabaseDialects


DUCKDB_EXTENSIONS_FILEPATH = "/app/duckdb_extensions"


def check_supported_dialects(dialect: str):
    supported_dialects = [
        SupportedDatabaseDialects.POSTGRES.value,
        SupportedDatabaseDialects.BIGQUERY.value,
    ]
    if dialect not in supported_dialects:
        raise ValueError(
            f"Input dialect '{dialect}' is not supported. Supported dialects: {', '.join(supported_dialects)}"
        )

def resolve_duckdb_file_path(duckdb_database_name: str, folder_path: str) -> str:
    """
    Returns the full path to the DuckDB database file
    """
    return str(Path(folder_path) / f"{duckdb_database_name}.db")


def get_tables_for_fts(tables: list[str], copied_tables: list[str]) -> list[str]:
    """
    Returns a list of tables that are configured for full-text search,
    present in both user input and copied tables, and defined in the config.
    """
    user_tables = set(tables)
    copied = set(copied_tables)
    config_tables = set(DUCKDB_FULLTEXT_SEARCH_CONFIG.keys())
    eligible_tables = user_tables & copied & config_tables
    return sorted(eligible_tables)


def get_document_identifier(table_name: str) -> str:
    """
    Returns the document identifier for a given table name based on the DUCKDB_FULLTEXT_SEARCH_CONFIG
    """
    return DUCKDB_FULLTEXT_SEARCH_CONFIG[table_name]["document_identifier"]


def execute_statement(conn: any, statement: str) -> str:
    time_start = process_time()
    conn.execute(statement)
    time_end = process_time()
    time_duration = time_end - time_start
    return f"{time_duration:.3f}"


def load_service_account_credentials():
    """
    Load Google service account credentials for BigQuery access.
    """
    google_service_account_json_path = Secret.load("google-service-account-json").get()
    os.environ['GOOGLE_APPLICATION_CREDENTIALS'] = google_service_account_json_path