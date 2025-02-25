from pydantic import BaseModel

class PhenotypeOptionsType(BaseModel):
    databaseCode: str   # alpdev_pg
    cdmschemaName: str   # cdmdefault
    cohortschemaName: str   # cdmdefault
    cohorttableName: str   # cohorts_devtest1_phenotype
    cohortsId: str   # as.integer(c(25,3,4)) or 'default'
    vocabschemaName: str # cdmvocab
    description: str   
    owner: str   
    # token: str   # bear token
    
    @property
    def use_cache_db(self) -> str:
        return False