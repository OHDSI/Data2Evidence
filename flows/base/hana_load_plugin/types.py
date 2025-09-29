from pydantic import BaseModel

# Define the data load options for HANA
class DataloadOptions(BaseModel):
    database_code: str
    schema_name: str
    results_schema: str
    
    @property
    def use_cache_db(self) -> str:
        return False
