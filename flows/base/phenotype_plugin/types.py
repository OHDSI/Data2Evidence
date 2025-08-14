from pydantic import BaseModel, model_validator
from typing import Optional

class PhenotypeOptionsType(BaseModel):
    cohorts_id: str   # "25,3,4" or 'default'
    materialize: bool = False
    
    # Database materialization parameters (required when materialize=True)
    database_code: Optional[str] = None  # alpdev_pg
    cdmschema_name: Optional[str] = None   # cdmdefault
    cohortschema_name: Optional[str] = None   # cdmdefault
    vocabschema_name: Optional[str] = None # cdmvocab
    
    # API creation parameters (required when materialize=False)
    user_name: Optional[str] = None
    dataset_id: Optional[str] = None
    
    @model_validator(mode='after')
    def validate_conditional_fields(self):
        if self.materialize:
            # When materialize=True, database parameters are required
            required_db_fields = ['database_code', 'cdmschema_name', 'cohortschema_name', 'vocabschema_name']
            for field in required_db_fields:
                if not getattr(self, field):
                    raise ValueError(f'{field} is required when materialize=True')
        else:
            # When materialize=False, API parameters are required
            required_api_fields = ['dataset_id']
            for field in required_api_fields:
                if not getattr(self, field):
                    raise ValueError(f'{field} is required when materialize=False')
        
        return self
    
    @property
    def use_cache_db(self) -> str:
        return False