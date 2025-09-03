from pydantic import BaseModel
from typing import List, Optional

class FileType(BaseModel):
    path: str
    table_name: str
    truncate: Optional[bool] = False

class DataloadOptions(BaseModel):
    files: List[FileType]
    
    @property
    def use_cache_db(self) -> str:
        return False
