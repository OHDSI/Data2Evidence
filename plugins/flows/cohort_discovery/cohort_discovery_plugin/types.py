from typing import Optional, Any
from pydantic import BaseModel

class CohortDiscoveryOptions(BaseModel):
    datasetId: str
    databaseCode: str
    cacheId: Optional[str] = None
    schemaName: str

class ChildTaskResult(BaseModel):
    # One resolved RQuest result, as emitted by the child (from RquestResult.to_dict()).
    analysis: Optional[str] = None      # None => availability; else distribution code
    count: Optional[int] = None
    distributions: dict[str, Any] = {}
    raw: dict[str, Any] = {}            # full to_dict() for traceability

class ChildResult(BaseModel):
    results: list[ChildTaskResult] = []
    error: Optional[str] = None

class ArtifactEnvelope(BaseModel):
    availability: dict[str, Any]
    distributions: dict[str, Any]
    metadata: dict[str, Any]
