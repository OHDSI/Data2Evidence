from pydantic import BaseModel
from enum import Enum
from typing import Optional

class FlowActionType(str, Enum):
    MIMIC_TO_DATABASE = "mimic_to_database"
    MIMIC_TO_DUCKDB = "mimic_to_duckdb"
    DUCKDB_TO_DATABASE = "duckdb_to_database"
    
class MimicOMOPOptionsType(BaseModel):
    duckdb_file_path: str = '/app/mimic_omop/mimic/mimic_omop_duckdb'
    mimic_dir: str = "/app/mimic_omop/mimic"
    vocab_dir: str = "/app/mimic_omop/vocab"
    load_mimic_vocab: bool = True
    database_code: None | str = None
    cache_id: Optional[str] = None
    schema_name: None | str = None
    overwrite_schema: bool = False
    chunk_size: int = 5000
    flow_action_type: FlowActionType
