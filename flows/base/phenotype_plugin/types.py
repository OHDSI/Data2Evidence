from pydantic import BaseModel

class PhenotypeOptionsType(BaseModel):
    databaseCode: str   # alpdev_pg
    cdmschemaName: str   # cdmdefault
    cohortschemaName: str   # cdmdefault
    cohortsId: str   # as.integer(c(25,3,4)) or 'default'
    vocabschemaName: str # cdmvocab
    
    @property
    def use_cache_db(self) -> str:
        return False