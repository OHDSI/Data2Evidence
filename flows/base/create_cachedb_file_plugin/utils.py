import os

from typing import Set, Tuple, List
from pathlib import Path
from time import time

from prefect.blocks.system import Secret

from .config import DUCKDB_FULLTEXT_SEARCH_CONFIG, DatamartConfig
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


def time_execution(func):
    def wrapper(*args, **kwargs):
        time_start = time()
        func(*args, **kwargs)
        time_end = time()
        time_duration = time_end - time_start
        return f"{time_duration:.3f}"

    return wrapper


@time_execution
def execute_statement(conn: any, statement: str):
    conn.execute(statement)


def get_document_identifier(table_name: str) -> str:
    """
    Returns the document identifier for a given table name based on the DUCKDB_FULLTEXT_SEARCH_CONFIG
    """
    return DUCKDB_FULLTEXT_SEARCH_CONFIG[table_name]["document_identifier"]


def get_tables_for_fts(tables: list[str], copied_tables: list[str]) -> Set[str]:
    """
    Returns a list of tables that are configured for full-text search,
    present in both user input and copied tables, and defined in the config.
    """
    user_tables = set(tables)
    copied = set(copied_tables)
    config_tables = set(DUCKDB_FULLTEXT_SEARCH_CONFIG.keys())
    tables_for_fts = user_tables & copied & config_tables
    return tables_for_fts


def load_service_account_credentials():
    """
    Load Google service account credentials for BigQuery access.
    """
    google_service_account_json_path = Secret.load("google-service-account-json").get()
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = google_service_account_json_path


def set_bigquery_global_settings():
    """
    Set BigQuery specific settings for the DuckDB connection.
    """
    return """
    SET bq_arrow_compression='ZSTD'; 
    SET bq_experimental_use_incubating_scan=TRUE;
    """

def check_if_file_exists(file_path: str) -> bool:
    """
    Checks if the specified file exists at the given path.
    """
    return Path(file_path).exists()


def resolve_duckdb_file_path(duckdb_database_name: str, folder_path: str) -> str:
    """
    Returns the full path to the DuckDB database file
    """
    return str(Path(folder_path) / f"{duckdb_database_name}.db")





def get_date_filter(snapshot_copy_config: DatamartConfig) -> str | None:
    """
    Extracts the date filter from DatamartConfig.
    """
    if not snapshot_copy_config:
        return None
    return getattr(snapshot_copy_config, "timestamp", None)


def get_table_filter(snapshot_copy_config: DatamartConfig) -> Set[str]:
    """
    Extracts the table filter (set of table names) from DatamartConfig.
    """
    if not snapshot_copy_config or not getattr(
        snapshot_copy_config, "table_config", None
    ):
        return set()
    return {_.table_name for _ in getattr(snapshot_copy_config, "table_config", [])}


def get_patient_filter(snapshot_copy_config: DatamartConfig) -> List[str] | None:
    """
    Extracts the patient filter (tuple of patient IDs) from DatamartConfig.
    """
    if not snapshot_copy_config:
        return None
    return list(getattr(snapshot_copy_config, "patients_to_be_copied", []) or [])


def parse_datamart_copy_config(
    snapshot_copy_config: DatamartConfig,
) -> tuple[str, Set[str], List[str]]:
    """
    Parses the DatamartConfig object and extracts the date filter, table filter, and patient filter.

    Returns:
        date_filter (str): The timestamp filter, or empty string if not set.
        table_filter (Set[str]): Set of table names to be copied.
        patient_filter (tuple): Tuple of patient IDs to be copied.
    """
    date_filter = get_date_filter(snapshot_copy_config)
    table_filter = get_table_filter(snapshot_copy_config)
    patient_filter = get_patient_filter(snapshot_copy_config)
    return date_filter, table_filter, patient_filter
