from pydantic import BaseModel
from typing import List, Optional

class FileType(BaseModel):
    path: str
    table_name: str
    truncate: Optional[bool] = False

class DataloadOptions(BaseModel):
    files: List[FileType]
    database_code: str
    cache_id: Optional[str] = None
    schema_name: str
    header: Optional[bool] = True
    delimiter: Optional[str] = ','
    escape_character: Optional[str] = None
    encoding: Optional[str] = None
    empty_string_to_null: Optional[bool] = None
    chunksize: Optional[int] = None