from pydantic import BaseModel
from typing import Optional


class CohortJsonType(BaseModel):
    id: int
    name: str
    createdDate: int
    modifiedDate: int
    hasWriteAccess: bool
    tags: list
    expressionType: str
    expression: dict


class CohortGeneratorOptionsType(BaseModel):
    databaseCode: str
    schemaName: str
    vocabSchemaName: str
    cohortJson: CohortJsonType
    datasetId: str
    description: str

    # Optional, if provided, will not create cohort definition
    cohortDefinitionId: Optional[int] = None

    @property
    def use_cache_db(self) -> str:
        return False
