import os

from typing import Set
from pathlib import Path
from time import time

from _shared_flow_utils.types import SupportedDatabaseDialects


DUCKDB_EXTENSIONS_FILEPATH = "/app/duckdb_extensions"


DUCKDB_FULLTEXT_SEARCH_CONFIG = {
    "concept": {
        "document_identifier": "concept_id",
    },
    "concept_relationship": {
        # primary key does not exist in concept_relationship table
        "document_identifier": "fts_document_identifier_id",
    },
    "relationship": {
        "document_identifier": "relationship_id",
    },
    "vocabulary": {
        "document_identifier": "vocabulary_id",
    },
    "concept_synonym": {
        # primary key does not exist in concept_synonym table,
        "document_identifier": "fts_document_identifier_id",
    },
    "concept_class": {
        "document_identifier": "concept_class_id",
    },
    "domain": {
        "document_identifier": "domain_id",
    },
    "concept_ancestor": {
        # primary key does not exist in concept_ancestor table
        "document_identifier": "fts_document_identifier_id",
    },
    "concept_recommended": {
        # primary key does not exist in concept_ancestor table
        "document_identifier": "fts_document_identifier_id",
    },
    "note": {
        "document_identifier": "note_id",
    },
}


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