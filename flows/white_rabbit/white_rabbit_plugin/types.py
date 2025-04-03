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
    SERVER_LOCATION: Optional[str] = None
    USER_NAME: Optional[str] = None
    PASSWORD: Optional[str] = None
    DATABASE_NAME: Optional[str] = None
    DELIMITER: str
    TABLES_TO_SCAN: str
    SCAN_FIELD_VALUES: str
    MIN_CELL_COUNT: int
    MAX_DISTINCT_VALUES: int
    ROWS_PER_TABLE: int
    CALCULATE_NUMERIC_STATS: str
    NUMERIC_STATS_SAMPLER_SIZE: int

    class Config:
        validate_assignment = True

    @validator('DELIMITER', pre=True, always=True)
    def set_delimiter(cls, DELIMITER):
        return DELIMITER or ","

    @validator('TABLES_TO_SCAN', pre=True, always=True)
    def set_tables_to_scan(cls, TABLES_TO_SCAN):
        return TABLES_TO_SCAN or "*"

    @validator('SCAN_FIELD_VALUES', pre=True, always=True)
    def set_scan_field_values(cls, SCAN_FIELD_VALUES):
        return SCAN_FIELD_VALUES or "yes"

    @validator('MIN_CELL_COUNT', pre=True, always=True)
    def set_min_cell_count(cls, MIN_CELL_COUNT):
        return MIN_CELL_COUNT or 5

    @validator('MAX_DISTINCT_VALUES', pre=True, always=True)
    def set_max_distinct_values(cls, MAX_DISTINCT_VALUES):
        return MAX_DISTINCT_VALUES or 1000

    @validator('ROWS_PER_TABLE', pre=True, always=True)
    def set_rows_per_table(cls, ROWS_PER_TABLE):
        return ROWS_PER_TABLE or 100000

    @validator('CALCULATE_NUMERIC_STATS', pre=True, always=True)
    def set_calculate_numeric_stats(cls, CALCULATE_NUMERIC_STATS):
        return CALCULATE_NUMERIC_STATS or "no"

    @validator('NUMERIC_STATS_SAMPLER_SIZE', pre=True, always=True)
    def set_numeric_stats_sampler_size(cls, NUMERIC_STATS_SAMPLER_SIZE):
        return NUMERIC_STATS_SAMPLER_SIZE or 500
