from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


WHITERABBIT_DIR_PATH = '/app/whiterabbit'
WHITERABBIT_BIN_PATH = f'{WHITERABBIT_DIR_PATH}/dist/bin'
WHITERABBIT_CSV_DIR = f'{WHITERABBIT_DIR_PATH}/csvfiles'


class WhiteRabbitRunType(str, Enum):
    SCAN_REPORT_FILES = 'SCAN_REPORT_FILES'
    SCAN_REPORT_DB = 'SCAN_REPORT_DB'
    GENERATE_ETL_REPORT = 'GENERATE_ETL_REPORT'


class WhiteRabbitRequestType(BaseModel):
    run_type: WhiteRabbitRunType
    data: Optional[dict] = None
    username: Optional[str] = None


class INISettings(BaseModel):

    scan_type: WhiteRabbitRunType

    # For scanning source database tables
    server_location: str = Field(default="")
    user_name: str = Field(default="")
    password: str = Field(default="")
    schema: str = Field(default="")
    database: str = Field(default="")
    data_type: str = Field(default="")

    # For scanning CSV Files, currently on ',' supported
    delimiter: str = Field(default=",")

    tables_to_scan: str = Field(default="*", description="Tables to scan")
    scan_field_values: str = Field(default="yes")
    min_cell_count: str = Field(default="5")
    max_distinct_values: str = Field(default="1000")
    rows_per_table: str = Field(default="100000")
    calculate_numeric_stats: str = Field(default="yes", description="Numeric stats")
    numeric_stats_sampler_size: str = Field(default="500", description="Numeric stats reservoir size")

    @property
    def working_folder(self) -> str:
        if self.scan_type == WhiteRabbitRunType.SCAN_REPORT_FILES:
            return WHITERABBIT_CSV_DIR
        return WHITERABBIT_DIR_PATH
    
    @property
    def scan_report_path(self) -> str:
        """Get the expected path for the ScanReport.xlsx file based on scan type."""
        return f"{self.working_folder}/ScanReport.xlsx"
    
    @property
    def data_type_source(self) -> str:
        if self.scan_type == WhiteRabbitRunType.SCAN_REPORT_FILES:
            return "Delimited text files"
        elif self.scan_type == WhiteRabbitRunType.SCAN_REPORT_DB:
            return self.data_type

    def dump_settings_json(self) -> dict:
        '''
        Serialize only the required fields to create the config.ini file
        '''
        return {
            "working_folder": self.working_folder,
            "data_type": self.data_type_source,
            "server_location": self.server_location,
            "user_name": self.user_name,
            "password": self.password,
            "database_name": self.schema,
            "delimiter": self.delimiter,
            "tables_to_scan": self.tables_to_scan,
            "scan_field_values": self.scan_field_values,
            "min_cell_count": self.min_cell_count,
            "max_distinct_values": self.max_distinct_values,
            "rows_per_table": self.rows_per_table,
            "calculate_numeric_stats": self.calculate_numeric_stats,
            "numeric_stats_sampler_size": self.numeric_stats_sampler_size,
        }

# Todo: Check if need to remove
class FileSaveResponse(BaseModel):
    id: int
    username: str
    dataKey: str
    fileName: str
