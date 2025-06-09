from pathlib import Path

from prefect import flow
from prefect.logging import get_run_logger

from .types import *
from .tasks import *

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.DicomServerAPI import DicomServerAPI


@flow(log_prints=True)
def dicom_etl_plugin(options: DICOMETLOptions):
    logger = get_run_logger()

    flow_action_type = options.flow_action_type
    database_code = options.database_code
    medical_imaging_schema = options.medical_imaging_schema_name
    vocab_schema = options.vocab_schema_name
    cdm_schema = options.cdm_schema_name
    to_truncate = options.to_truncate
    use_cache_db = options.use_cache_db
    ingest_eav_table = options.ingest_eav_table

    dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)

    match flow_action_type:
        case FlowActionType.LOAD_VOCAB:
            # Populate vocabulary and concept tables with DICOM
            setup_vocab(dbdao, vocab_schema, to_truncate)

        case FlowActionType.INGEST_METADATA:
            dicom_files_abs_path = options.dicom_files_abs_path
            upload_files = options.upload_files
            person_patient_mapping = options.person_to_patient_mapping
            person_mapping_schema = person_patient_mapping.schema_name
            mapping_dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)

            # Check if schemas exist
            mi_schema_exists = dbdao.check_schema_exists(schema=medical_imaging_schema)
            vocab_schema_exists = dbdao.check_schema_exists(schema=vocab_schema)
            cdm_schema_exists = dbdao.check_schema_exists(schema=cdm_schema)
            person_mapping_schema_exists = dbdao.check_schema_exists(schema=person_mapping_schema)

            if all(schema_exists is False for schema_exists in [mi_schema_exists, vocab_schema_exists, cdm_schema_exists, person_mapping_schema_exists]):
                raise Exception(
                    f"Flow failed! Please ensure all schemas exist before running flow [{medical_imaging_schema}, {vocab_schema}, {cdm_schema}, {person_mapping_schema}]")

            if to_truncate:
                # Truncate medical imaging schema
                dbdao.truncate_table(cdm_schema, "procedure_occurrence")
                dbdao.truncate_table(cdm_schema, "visit_occurrence")
                dbdao.truncate_table(medical_imaging_schema,"image_occurrence")

                if ingest_eav_table == True:
                    dbdao.truncate_table(medical_imaging_schema, "dicom_file_metadata")
                else:
                    dbdao.truncate_table(medical_imaging_schema, "image_feature")
                    dbdao.truncate_table(cdm_schema, "measurement")

            root_dir = Path(dicom_files_abs_path)
            dcm_files = list(root_dir.rglob('*.dcm')) + \
                list(root_dir.rglob('*.DCM'))
            logger.info(f"Found {len(dcm_files)} DICOM files for processing!")

            # Extract all data elements into a single df
            extracted_data_df = extract_data_elements(dcm_files)

            # Map tags to concept_ids
            mapped_concepts_df = get_concept_ids_for_tags(
                extracted_data_df, vocab_schema, dbdao)

            # Assume person record already exists in person table
            new_image_occurrence_id = dbdao.get_next_record_id(
                medical_imaging_schema, "image_occurrence", "image_occurrence_id")
            new_procedure_occurrence_id = dbdao.get_next_record_id(
                cdm_schema, "procedure_occurrence", "procedure_occurrence_id")
            new_visit_occurrence_id = dbdao.get_next_record_id(
                cdm_schema, "visit_occurrence", "visit_occurrence_id")
            next_record_ids = (
                new_image_occurrence_id, new_procedure_occurrence_id, new_visit_occurrence_id)

            # Transform for image occurrence
            image_occurrence_df = transform_for_image_occurrence(mapped_concepts_df, 
                                                                 vocab_schema,
                                                                 dbdao, 
                                                                 person_patient_mapping, 
                                                                 next_record_ids)

            new_image_feature_id = dbdao.get_next_record_id(
                medical_imaging_schema, "image_feature", "image_feature_id")
            new_measurement_id = dbdao.get_next_record_id(
                cdm_schema, "measurement", "measurement_id")

            # Transform for Image Feature table
            image_feature_df = transform_for_image_feature(mapped_concepts_df, image_occurrence_df,
                                                           new_image_feature_id, new_measurement_id,
                                                           vocab_schema, dbdao)

            # Insert into tables
            ingest_procedure_occurrence(image_occurrence_df, cdm_schema, dbdao)
            ingest_visit_occurrence(image_occurrence_df, cdm_schema, dbdao)
            ingest_image_occurrence(image_occurrence_df, medical_imaging_schema, dbdao)

            if ingest_eav_table == True:
                ingest_eav(mapped_concepts_df,
                           image_occurrence_df,
                           image_feature_df,
                           medical_imaging_schema,
                           dbdao)
            else:
                ingest_measurement(image_feature_df, cdm_schema, dbdao)
                ingest_image_feature(image_feature_df, medical_imaging_schema, dbdao)

            if len(mapped_concepts_df) > 0 and upload_files:
                dicom_server_api = DicomServerAPI()
                file_upload_result = upload_file_to_server(
                    mapped_concepts_df, image_occurrence_df, dicom_server_api)
