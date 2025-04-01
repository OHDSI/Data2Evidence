from pydantic import BaseModel
from enum import Enum


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
    
