from enum import Enum
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel, Field, UUID4, model_validator

FLOW_NAME = "data_management_plugin"

DATAMODEL_CHANGELOG_MAPPING = {
            "omop5-4": "liquibase-changelog-5-4.xml",
            "medical-imaging": "liquibase-changelog-medical-imaging.xml"
        }

class FlowActionType(str, Enum):
    CREATE_DATA_MODEL = "create_datamodel"
    UPDATE_DATA_MODEL = "update_datamodel"
    ROLLBACK_COUNT = "rollback_count"
    ROLLBACK_TAG = "rollback_tag"
    GET_VERSION_INFO = "get_version_info"
    CREATE_CDMSCHEMA = "create_cdm_schema"
    CHANGELOG_SYNC = "changelog_sync"


class DataModelType(BaseModel):
    flow_action_type: FlowActionType
    database_code: str
    data_model: Optional[str] = None
    schema_name: Optional[str] = None
    cleansed_schema_option: Optional[bool] = False
    vocab_schema: Optional[str] = None
    rollback_count: Optional[int] = None
    rollback_tag: Optional[str] = None
    update_count: Optional[int] = None
    datasets: Optional[List] = None

    @property
    def use_cache_db(self) -> str:
        return False

    @property
    def flow_name(self) -> str:
        return FLOW_NAME

    @property
    def changelog_filepath(self) -> str | None:
        if self.data_model:
            return DATAMODEL_CHANGELOG_MAPPING.get(self.data_model, None)
        return None
    
    @property
    def changelog_filepath_list(self) -> Dict:
        return DATAMODEL_CHANGELOG_MAPPING
    
    @model_validator(mode='before')
    def set_default_vocab_schema(cls, values):
        if values.get('vocab_schema') is None:
            values['vocab_schema'] = values.get('schema_name')
        return values




class DataModelBase(BaseModel):
    use_cache_db: bool
    database_code: str = Field(...)
    data_model: str = Field(...)
    schema_name: str = Optional[str]
    dialect: str = Field(...)
    flow_name: str = Field(...)
    changelog_filepath: Optional[str]
    changelog_filepath_list: Dict


class CreateDataModelType(DataModelBase):
    cleansed_schema_option: Optional[bool]
    vocab_schema: str = Field(...)
    update_count: Optional[int]


class UpdateDataModelType(DataModelBase):
    flow_action_type: FlowActionType
    vocab_schema: str = Field(...)


class RollbackCountType(DataModelBase):
    vocab_schema: str = Field(...)
    rollback_count: int = Field(...)


class RollbackTagType(DataModelBase):
    vocab_schema: str = Field(...)
    rollback_tag: str = Field(...)


class CreateSchemaType(DataModelBase):
    vocab_schema: str





class PortalDatasetType(BaseModel):
    id: UUID4 = Field(...)
    databaseName: str = Field(...)
    databaseCode: str = Field(...)
    schemaName: str = Field(...)
    visibilityStatus: Optional[str]
    vocabSchemaName: Optional[str]
    dialect: Optional[str]
    type: Optional[str]
    dataModel: Optional[str]
    paConfigId: Optional[UUID4]
    dashboards: Optional[List]
    tags: Optional[List]
    attributes: Optional[List]
    tenant: Optional[Dict]
    tokenStudyCode: Optional[str]
    studyDetail: Optional[Dict]


class GetVersionInfoType(DataModelBase):
    datasets: List


class ExtractDatasetSchemaType(BaseModel):
    datasets_with_schema: List[PortalDatasetType]
    datasets_without_schema: List[PortalDatasetType]

