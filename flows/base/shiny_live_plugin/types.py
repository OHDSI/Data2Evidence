from pydantic import BaseModel
from enum import Enum


class FlowLanguageType(str, Enum):
    PYTHON = "python"
    R = "r"


class ShinyLivePluginType(BaseModel):
    dataset_id: str
    language: FlowLanguageType = FlowLanguageType.PYTHON
    app_code: str
    config_type: str
    name: str
