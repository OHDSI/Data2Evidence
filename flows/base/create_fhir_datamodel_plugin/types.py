from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field


class CreateFhirDataModelOptions(BaseModel):
    database_code: str
    schema_name: str
    vocab_schema: str

    @property
    def use_cache_db(self) -> str:
        return True
    

class DiscriminatorType(BaseModel):
    propertyName: str
    mapping: dict[str, str]


class PropertyDefinitionType(BaseModel):
    description: str
    #items: Optional[dict[str, str]] = None
    ref: Optional[str] = Field(None, alias="$ref")
    items: Optional[dict] = None
    type: Optional[str] = None
    enum: Optional[list[str]] = None
    const: Optional[str] = None


class FhirDefinitionType(BaseModel):
    oneOf: Optional[list] = None
    type: Optional[str] = None
    description: Optional[str] = None
    pattern: Optional[str] = None
    properties: Optional[dict[str, PropertyDefinitionType]] = None
    additionalProperties: Optional[bool] = None
    required: Optional[list[str]] = None

    # added this for fhir data model
    parsedProperties: Optional[dict[str, list]] = {}


class FhirSchemaJsonType(BaseModel):
    schema_var: str = Field(..., alias="$schema")
    id: str
    description: str
    discriminator: DiscriminatorType
    oneOf: list[dict[str, str]]
    definitions: dict[str, FhirDefinitionType]


class DuckDBDataTypes(str, Enum):
    DECIMAL = "decimal"
    INTEGER = "integer"
    VARCHAR = "varchar"
    BOOLEAN = "boolean"
    JSON = "json"


# To store referenecs to medplum resources that are not yet defined 
MEDPLUM_RESOURCES = [
    "Resource"
]


# Maps fhir data type to duckdb data type
FHIR_TO_DUCKDB = {
    "string": "varchar",
    "number": "integer",
    "decimal": "double",
    "boolean": "boolean",
    "json": "json",
}

