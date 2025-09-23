from typing import Optional, List
from pydantic import BaseModel, computed_field


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
    cohortTableName: Optional[str] = "cohort"

    @property
    def use_cache_db(self) -> str:
        return False

    @property
    def use_trex_connection(self) -> bool:
        """
        Whether to use the TREX sql connection or direct database connection.
        """
        return True


class DqdParams(DqdOptionsType):
    # DQD-specific parameters with defaults
    outputFolder: str
    setDBDriverEnv: str
    connectionDetails: str
    materializedCohortDatabaseSchema: Optional[str] = None

    numThreads: int = 1
    checkLevels: list = ['TABLE','FIELD','CONCEPT']
    writeToTable: bool = False
    sqlOnly: bool = False
    verboseMode: bool = True

    @computed_field
    def outputFile(self) -> str:
        return f"{self.schemaName}.json" if self.schemaName else "output.json"
    
    @computed_field
    def cohortDatabaseSchemaR(self) -> str:
        # Returns the assigned value if set, otherwise falls back to materializedCohortDatabaseSchema, cohortDatabaseSchema, or schemaName
        return (
            self.materializedCohortDatabaseSchema
            or self.cohortDatabaseSchema
            or self.schemaName
        )

    def to_json_dict(self) -> dict:
        """
        Serialize only the required fields for DQD R script input.
        """
        return {
            "schemaName": self.schemaName,
            "databaseCode": self.databaseCode,
            "cdmVersionNumber": self.cdmVersionNumber,
            "vocabSchema": self.vocabSchemaName,
            "releaseDate": self.releaseDate,
            "cohortDefinitionId": self.cohortDefinitionId,
            "outputFolder": self.outputFolder,
            "checkNames": self.checkNames,
            "cohortDatabaseSchema": self.cohortDatabaseSchemaR,
            "cohortTableName": self.cohortTableName,
        }
