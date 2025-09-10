from enum import Enum
from typing_extensions import Self
from typing import Optional, List, Dict
from pydantic import BaseModel, Field, model_validator


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


class DatamartTableConfig(BaseModel):
    table_name: str = Field(alias="tableName")
    columns_to_be_copied: List[str] = Field(alias="columnsToBeCopied")

    class Config:
        # Accept field name and aliases as input
        validate_by_name = True


class DatamartConfig(BaseModel):
    timestamp: Optional[str] = Field(default="")
    table_config: Optional[List[DatamartTableConfig]] = Field(
        default_factory=list, alias="tableConfig"
    )
    patients_to_be_copied: Optional[List[int]] = Field(
        default_factory=list, alias="patientsToBeCopied"
    )

    class Config:
        # Accept field name and aliases as input
        validate_by_name = True

    def table_config_to_dict(self) -> Dict[str, List[str]]:
        """
        Converts the table_config list to a dictionary mapping table names to columns.
        """
        return {
            cfg.table_name: cfg.columns_to_be_copied for cfg in self.table_config or []
        }


class CacheFlowAction(str, Enum):
    CREATE_CACHE = "create_cache"  # Create a cachedb file
    CREATE_DATAMART = "create_datamart"  # Create datamart cachedb file
    GET_VERSION_INFO = "get_version_info"  # Get version info for datamart


class CreateCacheOptions(BaseModel):
    flow_action_type: CacheFlowAction = Field(alias="flowActionType")

    database_code: Optional[str] = Field(default=None, alias="databaseCode")
    schema_name: Optional[str] = Field(default=None, alias="schemaName")

    # Optional flag used to determine which tables to create duckdb FTS indexes.
    # By default only creates FTS indexes for concept table.
    # If required, more table names can be added accordingly to the keys in DUCKDB_FULLTEXT_SEARCH_CONFIG
    tables_to_create_duckdb_fts_index: Optional[List[str]] = Field(
        default=["concept"], alias="tablesToCreateDuckdbFtsIndex"
    )

    snapshot_schema_name: Optional[str] = Field(
        default=None, alias="snapshotSchemaName"
    )

    snapshot_copy_config: Optional[DatamartConfig] = Field(
        default=None, alias="snapshotCopyConfig"
    )

    datasets: Optional[List[Dict]] = Field(default=None)

    @property
    def snapshot_copy_config_or_none(self) -> Optional[DatamartConfig]:
        """
        Returns snapshot_copy_config unless flow_action_type is CREATE_CACHE, in which case returns None.
        """
        if self.flow_action_type == CacheFlowAction.CREATE_CACHE:
            return None
        return self.snapshot_copy_config

    @property
    def target_schema_name(self) -> Optional[str]:
        """
        Returns snapshot_schema_name, or if flow_action_type is CREATE_CACHE,
        returns schema_name instead.
        """
        if self.flow_action_type == CacheFlowAction.CREATE_CACHE:
            return self.schema_name
        return self.snapshot_schema_name

    @property
    def use_trex_connection(self) -> bool:
        return False

    @property
    def use_cache_db(self) -> bool:
        return False

    @model_validator(mode="after")
    def check_required_fields(self) -> Self:
        # Mapping of required fields for each flow action type
        required_fields_map = {
            CacheFlowAction.CREATE_CACHE: [
                "database_code",
                "schema_name",
                "tables_to_create_duckdb_fts_index",
            ],
            CacheFlowAction.CREATE_DATAMART: [
                "database_code",
                "schema_name",
                "snapshot_schema_name",
                # "snapshot_copy_config"
            ],
            CacheFlowAction.GET_VERSION_INFO: ["datasets"],
        }

        required_fields = required_fields_map.get(self.flow_action_type, [])

        # Check for missing required fields
        missing = [field for field in required_fields if getattr(self, field) is None]

        if missing:
            raise ValueError(
                f"Missing required fields for {self.flow_action_type}: {', '.join(missing)}"
            )
        return self

    @model_validator(mode="after")
    def validate_trex_connection_and_flow_action(self) -> Self:
        # If use_trex_connection is False, flow_action_type must be CREATE_CACHE
        if (
            not self.use_trex_connection
            and self.flow_action_type != CacheFlowAction.CREATE_CACHE
        ):
            raise ValueError(
                "If use_trex_connection is False, flow_action_type must be 'create_cache'."
            )
        if (
            self.flow_action_type == CacheFlowAction.CREATE_DATAMART
            and not self.use_trex_connection
        ):
            raise ValueError(
                "If flow_action_type is 'create_datamart', use_trex_connection must be True."
            )
        return self

    class Config:
        # Make model store raw values instead of enum object
        use_enum_values = True
        # Accept field name and aliases as input
        validate_by_name = True


class CreateCDWValidationConfig(BaseModel):
    databaseCode: str
    schemaName: str
    trex_connection: Optional[bool] = True

    @property
    def use_trex_connection(self) -> bool:
        return True

    @property
    def use_cache_db(self) -> bool:
        return False
