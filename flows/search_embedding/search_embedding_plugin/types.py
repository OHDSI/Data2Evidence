from pydantic import BaseModel
from typing import Optional

# PATH_TO_EXTERNAL_FILES = r"external"

class SearchEmbeddingType(BaseModel):
    recreate: bool
    database_code: str
    schema_name: str

    @property
    def use_cache_db(self) -> str:
        return False
