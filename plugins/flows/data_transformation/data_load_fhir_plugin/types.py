from pydantic import BaseModel
from typing import List, Optional

class FileType(BaseModel):
    path: str
    
class DataloadOptions(BaseModel):
    files: List[FileType]
    truncate_tables: Optional[bool] = False
    dataset_token: str
    cache_id: Optional[str] = None