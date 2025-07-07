from typing import Optional
from pydantic import BaseModel


class DCOptionsType(BaseModel):
    schemaName: str
    databaseCode: str
    cdmVersionNumber: str
    vocabSchemaName: str
    releaseDate: Optional[str] = None
    resultsSchema: str

    @property
    def use_cache_db(self) -> str:
        return False