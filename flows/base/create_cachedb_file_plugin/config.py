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
    ((table_name, table_name)
     for table_name in DUCKDB_FULLTEXT_SEARCH_CONFIG.keys()),
    type=str,
)


class CreateDuckdbDatabaseFileType(BaseModel):
    databaseCode: str
    # Optional flag used to determine which tables to create duckdb FTS indexes.
    # By default only creates FTS indexes for concept table.
    # If required, more table names can be added accordingly to the keys in DUCKDB_FULLTEXT_SEARCH_CONFIG
    tablesToCreateDuckdbFtsIndex: List[DUCKDB_FULLTEXT_SEARCH_CONFIG_ENUM] = [
        "concept"]
    create_duckdb_file: Optional[bool] = None
    batch_size: Optional[int] = None

    def get_create_duckdb_file(self) -> bool:
        if self.create_duckdb_file is not None:
            return self.create_duckdb_file
        return False

    def get_batch_size(self) -> int:
        if self.batch_size is not None:
            return self.batch_size
        return 100000

    @property
    def use_cache_db(self) -> str:
        return False


class CreateCDWValidationConfig(BaseModel):
    databaseCode: str
    schemaName: str
    create_duckdb_file: Optional[bool] = None

    def get_create_duckdb_file(self) -> bool:
        if self.create_duckdb_file is not None:
            return self.create_duckdb_file
        return True

    @property
    def use_cache_db(self) -> str:
        return False