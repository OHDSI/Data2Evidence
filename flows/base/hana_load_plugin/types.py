from enum import Enum
from pydantic import BaseModel
from typing import Optional, List


class FlowActionType(str, Enum):
    CREATE_DATA_MODEL = "create_datamodel"
    GET_VERSION_INFO = "get_version_info"

# Define the data load options for HANA
class DataloadOptions(BaseModel):
    flow_action_type: FlowActionType
    database_code: str
    schema_name: Optional[str] = None
    vocab_schema: Optional[str] = None
    results_schema: Optional[str] = None
    datasets: Optional[List] = None
    
    @property
    def use_cache_db(self) -> str:
        return False
