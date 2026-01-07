from enum import Enum

from typing import Optional, List
from typing_extensions import Self

from pydantic import BaseModel, model_validator


RELEASE_VERSION_MAPPING = {
    "5.3": "v5.3.2",
    "5.4": "v5.4.1"
}

class CDMVersion(str, Enum):
    OMOP53 = "5.3"
    OMOP54 = "5.4"

class FlowActionType(str, Enum):
    CREATE_DATA_MODEL = "create_datamodel"
    GET_VERSION_INFO = "get_version_info"

# Define the data load options for HANA
class OmopCDMPluginOptions(BaseModel):
    flow_action_type: FlowActionType
    database_code: str
    schema_name: Optional[str] = None
    vocab_schema: Optional[str] = None
    results_schema: Optional[str] = None
    datasets: Optional[List] = None
    load_csvs: Optional[bool] = False
    data_model: Optional[str] = None
    
    @property
    def use_cache_db(self) -> str:
        return False
    
    @property
    def cdm_version(self) -> str:
        return self.data_model[-3:].replace("-", ".")

    @model_validator(mode="after")
    def check_required_fields(self) -> Self:
        # Mapping of required fields for each flow action type
        required_fields_map = {
            FlowActionType.CREATE_DATA_MODEL: [
                "database_code",
                "data_model",
                "schema_name",
                "results_schema",
                "vocab_schema"
            ],
            FlowActionType.GET_VERSION_INFO: ["datasets"],
        }

        required_fields = required_fields_map.get(self.flow_action_type, [])

        # Check for missing required fields
        missing = [field for field in required_fields if getattr(self, field) is None]

        if missing:
            raise ValueError(
                f"Missing required fields for {self.flow_action_type}: {', '.join(missing)}"
            )
        return self