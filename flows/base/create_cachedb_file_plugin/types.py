from enum import Enum

from dataclasses import dataclass

from typing_extensions import Self
from typing import Optional, List, Dict, Set

from pydantic import BaseModel, Field, model_validator


@dataclass
class QueryColumns:
    """
    Dataclass to hold columns used for constructing queries
    """
    table: str
    columns_to_copy: Set[str]
    patient_filter_col: str | None
    timestamp_filter_col: str | None


@dataclass
class CopyParameters:
    """
    Dataclass to hold parameters for creating cache
    """

    source_database: str
    target_database: str
    source_schema: str
    target_schema: str

    patient_filter: List[int] | None
    table_filter: Dict[str, List[str]] | None
    timestamp_filter: str | None

    fts_tables: List[str]

    limit_statement: str


class DatamartTableConfig(BaseModel):
    table_name: str = Field(alias="tableName")
    columns_to_be_copied: List[str] = Field(alias="columnsToBeCopied")

    class Config:
        # Accept field name and aliases as input
        validate_by_name = True


class DatamartConfig(BaseModel):
    timestamp: Optional[str] = Field(default=None)

    table_config: Optional[List[DatamartTableConfig]] = Field(
        default=None, alias="tableConfig"
    )

    patients_to_be_copied: Optional[List[int]] = Field(
        default=None, alias="patientsToBeCopied"
    )

    def table_config_to_dict(self) -> Dict[str, List[str]] | None:
        """
        Converts the table_config list to a dictionary mapping table names to columns.
        """
        if not self.table_config:
            return None
        return {
            cfg.table_name: cfg.columns_to_be_copied for cfg in self.table_config
        }

    class Config:
        # Accept field name and aliases as input
        validate_by_name = True


class CacheFlowAction(str, Enum):
    CREATE_DATAMART_CACHE = "create_datamart_cache"
    GET_VERSION_INFO = "get_version_info"


class CreateCacheOptions(BaseModel):
    flow_action_type: CacheFlowAction = Field(alias="flowActionType")

    database_code: Optional[str] = Field(default=None, alias="databaseCode")
    schema_name: Optional[str] = Field(default=None, alias="schemaName")
    results_schema_name: Optional[str] = Field(
        default=None, alias="resultsSchemaName")

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
    def target_schema_name(self) -> str:
        """
        Returns snapshot_schema_name if provided, otherwise returns schema_name.
        """
        return self.snapshot_schema_name or self.schema_name

    @property
    def use_trex_connection(self) -> bool:
        return True

    @property
    def use_cache_db(self) -> bool:
        return False

    @model_validator(mode="after")
    def check_required_fields(self) -> Self:
        # Mapping of required fields for each flow action type
        required_fields_map = {
            CacheFlowAction.CREATE_DATAMART_CACHE: [
                "database_code",
                "schema_name",
                "tables_to_create_duckdb_fts_index",
            ],
            CacheFlowAction.GET_VERSION_INFO: ["datasets"],
        }

        required_fields = required_fields_map.get(self.flow_action_type, [])

        # Check for missing required fields
        missing = [field for field in required_fields if getattr(
            self, field) is None]

        if missing:
            raise ValueError(
                f"Missing required fields for {self.flow_action_type}: {', '.join(missing)}"
            )
        return self

    class Config:
        # Make model store raw values instead of enum object
        use_enum_values = True
        # Accept field name and aliases as input
        validate_by_name = True

    @model_validator(mode="after")
    def validate_trex_connection_and_flow_action(self) -> Self:
        if (
            self.flow_action_type == CacheFlowAction.GET_VERSION_INFO
            and not self.use_trex_connection
        ):
            raise ValueError(
                f"If flow_action_type is '{CacheFlowAction.GET_VERSION_INFO}', use_trex_connection must be True."
            )
        return self


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
