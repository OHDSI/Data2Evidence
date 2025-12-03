from pydantic import BaseModel
from typing import List, Optional


class AdminSharePluginType(BaseModel):
    concept_set_ids: Optional[List[int]] = None
    cohort_definition_ids: Optional[List[int]] = None
