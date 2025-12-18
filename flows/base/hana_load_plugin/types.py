from enum import Enum
from pydantic import BaseModel


class FlowActionType(str, Enum):
    CREATE_DATA_MODEL = "create_datamodel"
    GET_VERSION_INFO = "get_version_info"

# Define the data load options for HANA
class DataloadOptions(BaseModel):
    flow_action_type: FlowActionType
    database_code: str
    schema_name: str
    vocab_schema: str
    results_schema: str
    load_csvs: Optional[bool] = True
    
    @property
    def use_cache_db(self) -> str:
        return False
