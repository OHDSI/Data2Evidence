from pydantic import BaseModel
from typing import Optional, Union

Concept_ls_Standard = 'flows/loyalty_score_plugin/external/concept_ls_Standard.csv'
Coefficients = 'flows/loyalty_score_plugin/external/coefficients.json'

class CalculateConfig(BaseModel):
    schema_name: str
    database_code: str
    index_date: str
    lookback_years: int
    coeff_table_name: Optional[str]
    loyalty_cohort_table_name: str  # Table name to store the loyalty score result

    @property
    def use_cache_db(self) -> str:
        return False

class RetrainConfig(BaseModel):
    schema_name: str
    database_code: str
    index_date: str
    train_years: int = 2
    return_years: int = 1
    test_ratio: float = 0.2
    retraincoeff_table_name: str

    @property
    def use_cache_db(self) -> str:
        return False

class LoyaltyPluginType(BaseModel):
    config: Union[CalculateConfig, RetrainConfig]