from enum import Enum
from typing import Optional
from pydantic import BaseModel

PATH_TO_EXTERNAL_FILES = "flows/dicom_etl_plugin/external"


# Only include these value representations for ingestion
VR_FILTER = ["AT", "CS", "DA", "DT", "DS", "FL", "FD", "IS", "SL", "SS", "SV", "TM", "UL", "US", "UV"]


class DataElementType(BaseModel):
    id: int
    study_uid: str
    series_uid: str
    sop_uid: str
    instance_number: Optional[int] 
    is_private: bool
    private_creator: Optional[str]
    metadata_source_keyword: str
    metadata_source_name: str
    tag: str
    # tag_tuple: str
    VR: str
    value: Optional[None]
    sequence_length: Optional[int]
    parent_sequence_id: Optional[int]


class FlowActionType(str, Enum):
    INGEST_METADATA = "ingest_metadata"
    LOAD_VOCAB = "load_vocab"

class PersonPatientMapping(BaseModel):
    schema_name: str
    table_name: str
    person_id_column_name: str
    patient_id_column_name: str

class DICOMETLOptions(BaseModel):
    flow_action_type: FlowActionType
    database_code: str
    medical_imaging_schema_name: str
    cdm_schema_name: str
    vocab_schema_name: str
    to_truncate: Optional[bool] = False
    dicom_files_abs_path: Optional[str]
    upload_files: Optional[bool] = False
    person_to_patient_mapping: PersonPatientMapping

    @property
    def use_cache_db(self) -> str:
        return False
    
class FileUploadRecord(BaseModel):
    sop_instance_id: str
    filepath: str
    image_series_uid: str
    image_occurrence_id: int
    orthanc_instance_id: str
    uploaded_filename: str
    
class FileUploadResultType(BaseModel):
    flow_run_id: str
    task_run_id: str
    record: list[FileUploadRecord]


