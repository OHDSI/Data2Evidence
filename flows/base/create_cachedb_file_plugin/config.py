from typing import Optional
from pydantic import BaseModel

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

class CreateDuckdbDatabaseFileType(BaseModel):
    databaseCode: str
    schemaName: str
    
    # Optional flag used to determine which tables to create duckdb FTS indexes.
    # By default only creates FTS indexes for concept table.
    # If required, more table names can be added accordingly to the keys in DUCKDB_FULLTEXT_SEARCH_CONFIG
    tablesToCreateDuckdbFtsIndex: list[str] = ["concept"]
    create_duckdb_file: Optional[bool] = False
    batch_size: Optional[int] = 10000

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