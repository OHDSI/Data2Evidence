from dataclasses import dataclass
from typing import List


@dataclass
class ConceptSetConcept:
    id: int
    useMapped: bool
    useDescendants: bool


@dataclass
class ConceptSet:
    id: int
    name: str
    shared: bool
    concepts: List[ConceptSetConcept]
    userName: str
    createdBy: str
    modifiedBy: str
    createdDate: str
    modifiedDate: str
