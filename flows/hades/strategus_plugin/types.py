
from enum import Enum

class CohortNodeType(Enum):
	EVENT = "event"
	TARGET = "target"
	EXIT = "exit"
	OUTCOME = "outcome"
	COMPARATOR = "comparator"