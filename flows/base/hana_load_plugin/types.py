from pydantic import BaseModel

class DataloadOptions(BaseModel):
    database_code: str
    schema_name: str
    
    @property
    def use_cache_db(self) -> str:
        return False

