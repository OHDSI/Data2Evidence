from pydantic import BaseModel
from typing import Optional


class SearchEmbeddingType(BaseModel):
    database_code: str
    cache_id: Optional[str] = None
    schema_name: str
    chunksize: int = 1024

    @property
    def use_cache_db(self) -> str:
        return False
    
    @property
    def use_trex_connection(self) -> bool:
        """
        Whether to use the TREX sql connection or direct database connection.
        """
        return True