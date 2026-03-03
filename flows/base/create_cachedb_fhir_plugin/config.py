from typing import Optional

from pydantic import BaseModel


class CreateDuckdbDatabaseFileType(BaseModel):
    databaseCode: str
    schemaName: str
    cacheSchemaName: str
    # tokenStudyCode of the dataset – used as the project name in the fhir gateway
    # project route so the export is scoped to this dataset's FHIR project only.
    studyCode: str
    # Optional allow-list of FHIR resource types to load (e.g. ["Patient", "Observation"]).
    # When None all resource types returned by the export are loaded.
    resourceTypes: Optional[list[str]] = None

    @property
    def sourceDatabase(self) -> str:
        return f"{self.databaseCode}__srcdb"