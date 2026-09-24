from typing import Optional, List
from pydantic import BaseModel, Field, computed_field

# dqd_plugin's flow-level timeout (flow.py) must clear this, not equal it --
# shared so the two can't drift apart.
TASK_TIMEOUT_SECONDS_MAX = 86400


class DqdOptionsType(BaseModel):
    datasetId: str
    schemaName: str
    databaseCode: str
    cacheId: Optional[str] = None
    cdmVersionNumber: str
    vocabSchemaName: str
    resultsSchemaName: str
    releaseDate: str
    cohortDefinitionId: Optional[str] = None
    checkNames: Optional[List[str]] = None
    cohortDatabaseSchema: Optional[str] = None
    cohortTableName: Optional[str] = "cohort"
    # Run against the source database instead of the trex cache. The trex pgwire
    # passthrough cannot resolve HANA schemas, so a HANA dataset routed through
    # it fails before reaching the database and DQD had no way to opt out.
    # Mirrors DCOptionsType.useSourceConnection.
    useSourceConnection: Optional[bool] = False
    # How long execute_dqd may run before Prefect force-ends it (#2964: it was
    # unbounded, so a wedged DB connection left the flow run RUNNING forever).
    # numThreads is pinned to 1 (sequential checks), so runtime scales directly with
    # CDM size -- callers with a larger dataset should raise this per-run. Bounds
    # match validateDataQualityFlowRunDto's HTTP-layer check; enforced here too so a
    # Prefect Custom Run (which validates against this model directly, bypassing the
    # jobplugins API) can't set 0/negative or an unbounded value.
    taskTimeoutSeconds: int = Field(default=14400, ge=60, le=TASK_TIMEOUT_SECONDS_MAX)

    @property
    def use_trex_connection(self) -> bool:
        """
        Whether to use the TREX sql connection or direct database connection.
        """
        return not self.useSourceConnection


class DqdParams(DqdOptionsType):
    # DQD-specific parameters with defaults
    outputFolder: str = "dqd_output"
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
            or self.resultsSchemaName
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
            "resultsSchema": self.resultsSchemaName,
            "releaseDate": self.releaseDate,
            "cohortDefinitionId": self.cohortDefinitionId,
            "outputFolder": self.outputFolder,
            "checkNames": self.checkNames,
            "cohortDatabaseSchema": self.cohortDatabaseSchemaR,
            "cohortTableName": self.cohortTableName,
        }
