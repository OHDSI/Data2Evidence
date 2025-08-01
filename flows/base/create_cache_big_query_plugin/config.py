from pydantic import BaseModel

class CreateDuckdbDatabaseFileType(BaseModel):
    databaseCode: str
