from typing import Optional
from pydantic import BaseModel


class CohortSurvivalOptionsType(BaseModel):
    databaseCode: str
    schemaName: str
    targetCohortDefinitionId: int
    outcomeCohortDefinitionId: int
    datasetId: str
    analysisType: str = "single_event"  # Default to single event analysis
    competingOutcomeCohortDefinitionId: Optional[int] = (
        None  # Optional for competing risk analysis
    )
    strataCohorts: list = []

    @property
    def use_cache_db(self) -> str:
        return False
