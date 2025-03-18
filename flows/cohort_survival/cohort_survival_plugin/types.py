from pydantic import BaseModel


class CohortSurvivalOptionsType(BaseModel):
    databaseCode: str
    schemaName: str
    targetCohortDefinitionId: int
    outcomeCohortDefinitionId: int
    datasetId: str
    
    @property
    def use_cache_db(self) -> str:
        return False