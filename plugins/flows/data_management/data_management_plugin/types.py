from enum import Enum
from datetime import datetime
from typing import List, Dict, Optional
from pydantic import BaseModel, Field, UUID4, model_validator

FLOW_NAME = "data_management_plugin"


class FlowActionType(str, Enum):
    CREATE_DATA_MODEL = "create_datamodel"
    UPDATE_DATA_MODEL = "update_datamodel"
    GET_VERSION_INFO = "get_version_info"
    CREATE_CDMSCHEMA = "create_cdm_schema"
    CHANGELOG_SYNC = "changelog_sync"


class DataModelType(BaseModel):
    flow_action_type: FlowActionType
    database_code: str
    cache_id: Optional[str] = None
    data_model: Optional[str] = None
    schema_name: Optional[str] = None
    vocab_schema: Optional[str] = None
    update_count: Optional[int] = None
    datasets: Optional[List] = None

    @property
    def flow_name(self) -> str:
        return FLOW_NAME

    @model_validator(mode='before')
    def set_default_vocab_schema(cls, values):
        if values.get('vocab_schema') is None:
            values['vocab_schema'] = values.get('schema_name')
        return values


class DataModelBase(BaseModel):
    database_code: str = Field(...)
    cache_id: Optional[str] = None
    data_model: str = Field(...)
    schema_name: str = Optional[str]
    dialect: str = Field(...)
    flow_name: str = Field(...)


class CreateDataModelType(DataModelBase):
    vocab_schema: str = Field(...)
    update_count: Optional[int]


class UpdateDataModelType(DataModelBase):
    vocab_schema: str = Field(...)


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
