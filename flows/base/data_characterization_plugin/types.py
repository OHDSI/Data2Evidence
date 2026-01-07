from typing import Optional
from pydantic import BaseModel


class DCOptionsType(BaseModel):
    schemaName: str
    databaseCode: str
    cdmVersionNumber: str
    vocabSchemaName: str
    releaseDate: Optional[str] = None
    resultsSchema: str
    executeConceptRecordCount: Optional[bool] = True

    @property
    def use_cache_db(self) -> bool:
        return False

    @property
    def use_trex_connection(self) -> bool:
        """
        Whether to use the TREX sql connection or direct database connection.
        """
        return True


class AchillesParams(DCOptionsType):
    # Achilles-specific parameters with defaults
    outputFolder: str = "achilles_output"
    setDBDriverEnv: str
    connectionDetails: str

    numThreads: int = 1
    excludeAnalysisIds: str = ""

    createTable: bool = True
    createIndices: bool = True
    sqlOnly: bool = False
    verboseMode: bool = False
