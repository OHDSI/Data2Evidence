from typing import Optional, Any
from pydantic import BaseModel, Field

class CohortDiscoveryOptions(BaseModel):
    datasetId: str
    databaseCode: str
    cacheId: Optional[str] = None
    schemaName: str

class ChildTaskResult(BaseModel):
    """One resolved RQuest result, as emitted by the child.

    Field sources, pinned against Bunny v1.7.0 `RquestResult.to_dict()`, whose
    top-level keys are `uuid`/`status`/`collection_id`/`message`/
    `protocolVersion`/`queryResult` — there is no top-level `count` and no
    `distributions` key at all:
      - `count`  <- to_dict()["queryResult"]["count"]
      - `files`  <- to_dict()["queryResult"]["files"] (distribution payloads,
                    base64 TSV per Bunny's `File` model)
    `analysis` is the task's `analysis` value ("DISTRIBUTION" for distribution
    tasks, absent for availability); `code` is the distribution code
    (DEMOGRAPHICS / GENERIC / ICD-MAIN).
    """
    analysis: Optional[str] = None      # None => availability task
    code: Optional[str] = None          # distribution code, when applicable
    count: Optional[int] = None
    files: list[dict[str, Any]] = Field(default_factory=list)
    raw: dict[str, Any] = Field(default_factory=dict)   # full to_dict() for traceability

class ChildResult(BaseModel):
    results: list[ChildTaskResult] = Field(default_factory=list)
    error: Optional[str] = None

class ArtifactEnvelope(BaseModel):
    availability: dict[str, Any]
    distributions: dict[str, Any]
    metadata: dict[str, Any]
    # Populated on hard-fail so the failure is inspectable in the persisted artifact.
    errors: list[Any] = Field(default_factory=list)
