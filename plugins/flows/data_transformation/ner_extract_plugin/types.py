from pydantic import BaseModel
from typing import Optional

class NerExtractOptions(BaseModel):
    database_code: str
    cache_id: Optional[str] = None
    schema_name: str
    note_table: Optional[str] = 'note'
    note_nlp_table: Optional[str] = 'note_nlp'
