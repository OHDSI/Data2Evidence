from enum import Enum
from datetime import date
from pydantic import BaseModel, Field
from typing import Annotated, Union, Literal, Optional


class NodeType(str, Enum):
    CSV = "csv_node"
    SQL = "sql_node"
    PYTHON = "python_node"
    PY2TABLE = "py2table_node"
    RNODE = "r_node"
    DBREADER = "db_reader_node"
    DBWRITER = "db_writer_node"
    SQLQUERY = "sql_query_node"
    DATAMAPPING = "data_mapping_node"
    SUBFLOW = "subflow"

class DataflowUITraceConfigType(BaseModel):
    trace_db: str
    trace_mode: bool
    
    @property
    def use_cache_db(self) -> str:
        return False


class DataflowUIOptionsType(BaseModel):
    test_mode: bool
    trace_config: DataflowUITraceConfigType


class DataflowUIJsonGraphType(BaseModel):
    nodes: dict
    edges: dict
    

class DataflowUIType(BaseModel):
    json_graph: DataflowUIJsonGraphType
    options: DataflowUIOptionsType
    
    
class JoinType(str, Enum):
    INNER_JOIN = "inner_join"
    LEFT_OUTER = "left_outer"
    FULL_OUTER = "full_outer"
    

class Edge(BaseModel):
    sourceHandle: str # source table or sourcetable-sourcefield
    targetHandle: str # target table or targettable-targetfield


class FieldSourceHandleData(BaseModel):
    label: str # source column name
    tableName: str # source table name
    isField: Literal[True]
    columnType: str
    type: Literal["input"]


class FunctionType(BaseModel): 
    type: Optional[str] = None # Value is null if SQL enabled is set to True then False in UI
    value: Optional[dict] =  None # Value is null if SQL enabled is set to True then False in UI


class FieldTargetHandleData(FieldSourceHandleData):
    type: Literal["output"]
    isNullable: Literal["Yes", "No"]

    # C in UI
    constantValue: Optional[str] = None

    # T in UI
    isSqlEnabled: Optional[bool] = None
    sqlViewMode: Optional[Literal["manual", "visual"]] = None
    functions: Optional[list[FunctionType]] = None
    sql: Optional[str] = None

    # Lookup in UI
    isLookupEnabled: Optional[bool] = None 
    lookupName: Optional[str] = None # Vocabulary ID from vocab table
    lookupSql: Optional[str] = None # A where clause

FieldHandleData = Annotated[
    Union[FieldSourceHandleData, FieldTargetHandleData],
    Field(discriminator="type")
]


class FieldHandle(BaseModel):
    id: str
    data: FieldHandleData


class FieldType(BaseModel):
    edges: list[Edge] # Field to field mapping
    sourceHandles: dict[str, list[FieldHandle]] # Contains column metadata of source tables
    targetHandles: dict[str, list[FieldHandle]] # Contains column metadata of target tables


class TableType(BaseModel):
    edges: list[Edge] # Table to table mapping


class DataMappingType(BaseModel):
    table: TableType
    field : FieldType


class ColumnType(str, Enum):
    VARCHAR = str
    TEXT = str
    INT = int
    FLOAT = float
    BOOLEAN = bool
    DATE = date


class DatePartType(str, Enum):
    YEAR = "Year"
    MONTH = "Month"
    DAY = "Day"
    HOUR = "Hour"
    MINUTE = "Minute"
    SECOND = "Second"


class TableSourceType(str, Enum):
    CSV = "csv"
    DB = "database"


class SqlViewMode(str, Enum):
    VISUAL = "visual"
    MANUAL = "manual"


class FunctionType(str, Enum):
    REPLACE = "REPLACE"
    DATEPART = "DATEPART"
    DATEADD = "DATEADD"
    CASE = "CASE"
    TRIM = "TRIM"
    UPPER = "UPPER"
    LOWER = "LOWER"

    # Todo: Not implemented in visual mode
    # ABS = "ABS"
    # CAST = "CAST"
    # COALESCE = "COALESCE"
    # CONCAT = "CONCAT"
    # FLOOR = "FLOOR"
    # LEFT = "LEFT"
    # RIGHT = "RIGHT"
    # LTRIM = "LTRIM"
    # RTRIM = "RTRIM"
    # SUBSTRING = "SUBSTRING"
