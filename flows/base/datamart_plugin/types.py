from enum import Enum
from pydantic import BaseModel
from typing import Optional, List


class DatamartCopyTableConfig(BaseModel):
    tableName: str
    columnsToBeCopied: List[str]
 

class DatamartCopyConfig(BaseModel):
    timestamp: Optional[str]
    tableConfig: Optional[List[DatamartCopyTableConfig]]
    patientsToBeCopied: Optional[List[int]]
    

class DatamartOptionsType(BaseModel):
    sourceSchema: str
    vocabSchema: str
    snapshotCopyConfig: DatamartCopyConfig
    

class DatamartFlowAction(str, Enum):
    CREATE_SNAPSHOT = "create_snapshot"  # Copy as a new db schema
    CREATE_PARQUET_SNAPSHOT = "create_parquet_snapshot"  # Copy as parquet file
    GET_VERSION_INFO = "get_version_info" 


class CreateDatamartOptions(BaseModel):
    flow_action_type: DatamartFlowAction
    dialect: Optional[str] = None
    schema_name: Optional[str] = None
    source_schema: Optional[str] = None
    database_code: Optional[str] = None
    snapshot_copy_config: Optional[DatamartCopyConfig] = None
    datasets: Optional[List] = None

    @property
    def use_cache_db(self) -> str:
        return False


RELEASE_VERSION_MAPPING = {
            "5.3": "v5.3.2",
            "5.4": "v5.4.1"
        }

class CDMVersion(str, Enum):
    OMOP53 = "5.3"
    OMOP54 = "5.4"
