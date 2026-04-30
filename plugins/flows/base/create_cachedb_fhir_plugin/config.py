from typing import Optional
from pydantic import BaseModel


class CreateDuckdbDatabaseFileType(BaseModel):
    databaseCode: str
    schemaName: str
    cacheSchemaName: str
    # tokenStudyCode of the dataset – used to look up fhir_project_id via the portal API.
    studyCode: str
    fhirProjectId: Optional[str] = None
    use_cache_db: bool = False

    @property
    def database_code(self) -> str:
        """Snake-case alias used by DBDao (mirrors CreateCacheOptions pattern)."""
        return self.databaseCode

    @property
    def sourceDatabase(self) -> str:
        return f"{self.databaseCode}__srcdb"
