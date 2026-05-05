from enum import Enum
from typing import Optional
from typing_extensions import Self

from pydantic import BaseModel, Field, model_validator


class HanaCacheFlowAction(str, Enum):
    CREATE_HANA_CACHE = "create_hana_cache"


class CreateHanaCacheOptions(BaseModel):
    flow_action_type: HanaCacheFlowAction = Field(alias="flowActionType")
    database_code: Optional[str] = Field(default=None, alias="databaseCode")
    schema_name: Optional[str] = Field(default=None, alias="schemaName")

    @model_validator(mode="after")
    def check_required_fields(self) -> Self:
        required_fields_map = {
            HanaCacheFlowAction.CREATE_HANA_CACHE: ["database_code", "schema_name"],
        }
        required_fields = required_fields_map.get(self.flow_action_type, [])
        missing = [f for f in required_fields if getattr(self, f) is None]
        if missing:
            raise ValueError(
                f"Missing required fields for {self.flow_action_type}: {', '.join(missing)}"
            )
        return self

    class Config:
        use_enum_values = True
        validate_by_name = True
