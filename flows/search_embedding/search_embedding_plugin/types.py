from pydantic import BaseModel
from typing import Optional

# PATH_TO_EXTERNAL_FILES = r"external"


class SearchEmbeddingType(BaseModel):
    database_code: str
    schema_name: str

    @property
    def use_cache_db(self) -> str:
        return False

    @property
    def use_trex_connection(self) -> bool:
        """
        Whether to use the TREX sql connection or direct database connection.
        """
        return False
