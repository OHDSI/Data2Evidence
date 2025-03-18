from typing import Optional, List
from pydantic import BaseModel
from enum import Enum


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

# Create enum based on keys in DUCKDB_FULLTEXT_SEARCH_CONFIG_ENUM
DUCKDB_FULLTEXT_SEARCH_CONFIG_ENUM = Enum(
    "DUCKDB_FULLTEXT_SEARCH_CONFIG_ENUM",
    ((table_name, table_name) for table_name in DUCKDB_FULLTEXT_SEARCH_CONFIG.keys()),
    type=str,
)


class CreateDuckdbDatabaseFileType(BaseModel):
    databaseCode: str
    schemaName: str

    # Optional flag used to determine which tables to create duckdb FTS indexes.
    # By default only creates FTS indexes for concept table.
    # If required, more table names can be added accordingly to the keys in DUCKDB_FULLTEXT_SEARCH_CONFIG
    tablesToCreateDuckdbFtsIndex: List[DUCKDB_FULLTEXT_SEARCH_CONFIG_ENUM] = ["concept"]

    # Optional flag used for cdw-config to create empty duckdb database file for validation
    # When this flag is set to True, it will also save the duckdb database file into a separate volume only for cdw-svc
    createForCdwConfigValidation: Optional[bool] = False

    @property
    def use_cache_db(self) -> str:
        return False
