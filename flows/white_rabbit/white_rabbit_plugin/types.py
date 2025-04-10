from pydantic import BaseModel, Field, validator
from typing import Optional
from enum import Enum


class ServiceCredentials(BaseModel):
    PG__DB_NAME: str = Field(..., strict=True)
    PG__PORT: str = Field(..., strict=True)
    PG__HOST: str = Field(..., strict=True)
    PERSEUS__FILES_MANAGER_HOST: str = Field(..., strict=True)
    PG_ADMIN_USER: str = Field(..., strict=True)
    PG_ADMIN_PASSWORD: str = Field(..., strict=True)


class WhiteRabbitRunTypes(str, Enum):
    SCAN_REPORT_FILES = 'SCAN_REPORT_FILES'  # can be by files or db
    SCAN_REPORT_DB = 'SCAN_REPORT_DB'
    GENERATE_ETL_REPORT = 'GENERATE_ETL_REPORT'


class WhiteRabbitRequestType(BaseModel):
    url: str = Field(..., strict=True)
    headers: dict = Field(..., strict=True)  # object type
    run_type: WhiteRabbitRunTypes
    data: Optional[dict] = None


class iniSettings(BaseModel):
    WORKING_FOLDER: str
    DATA_TYPE: str
    SERVER_LOCATION: str
    USER_NAME: str
    PASSWORD: str
    DATABASE_NAME: str
    DELIMITER: str
    TABLES_TO_SCAN: str
    SCAN_FIELD_VALUES: str
    MIN_CELL_COUNT: str
    MAX_DISTINCT_VALUES: str
    ROWS_PER_TABLE: str
    CALCULATE_NUMERIC_STATS: str
    NUMERIC_STATS_SAMPLER_SIZE: str


class FileSaveResponse(BaseModel):
    id: int
    username: str
    dataKey: str
    fileName: str
