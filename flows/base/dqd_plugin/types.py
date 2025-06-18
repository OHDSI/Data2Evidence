from pydantic import BaseModel
from typing import Optional, List, Dict

DQD_THREAD_COUNT = 1

class DqdOptionsType(BaseModel):
    datasetId: str
    schemaName: str
    databaseCode: str
    cdmVersionNumber: str
    vocabSchemaName: str
    releaseDate: str
    cohortDefinitionId: Optional[str] = None
    checkNames: Optional[List[str]] = None
    cohortDatabaseSchema: Optional[str] = None
    cohortTableName: Optional[str] = None
    
    @property
    def use_cache_db(self) -> str:
        return False