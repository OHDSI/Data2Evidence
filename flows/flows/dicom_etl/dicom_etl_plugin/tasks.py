from __future__ import annotations

import numpy as np
from pydicom import dcmread
from typing import TYPE_CHECKING
from orthanc_api_client import OrthancApiClient

from prefect import task
from prefect.variables import Variable
from prefect.logging import get_run_logger
from prefect.context import TaskRunContext
from prefect.serializers import JSONSerializer
from prefect.filesystems import RemoteFileSystem as RFS

from .utils import *
from .types import *

if TYPE_CHECKING:
    import pandas as pd
    from shared_utils.dao.DBDao import DBDao


@task(log_prints=True)
def ingest_eav_table(mapped_concepts_df: pd.DataFrame, image_occurrence_df: pd.DataFrame, 
                     image_feature_df: pd.DataFrame, dbdao: DBDao):
    table_name = "dicom_file_metadata"
    logger = get_run_logger()
    eav_table_id = dbdao.get_next_record_id(table_name, "metadata_id")

    logger.info(f"{len(mapped_concepts_df)} records to be ingested into '{dbdao.schema_name}.{table_name}' table..")

    ingestion_columns = [
        "metadata_id",
        "data_element_concept_id", # Todo: Using non-standard concept_id
        "person_id",
        "value_as_number",
        "value_as_concept_id", # Todo: Using non-standard concept_id
        "measurement_source_value",
        "metadata_source_name",
        "metadata_source_keyword",
        "metadata_source_tag", 
        "metadata_source_group_number",
        "metadata_source_value_representation",
        "metadata_source_value",
        "is_sequence",
        "sequence_length",
        "parent_sequence_id",
        "is_private",
        "private_creator",
        "sop_instance_id",
        "instance_number",
        "image_occurrence_id",
        "etl_created_datetime",
        "etl_modified_datetime",
    ]

    # Get person_id and image_occurrence_id from image_occurrence dataset
    eav_df = mapped_concepts_df.merge(
        image_occurrence_df[["person_id", "image_occurrence_id", "image_series_uid"]],
        how="left", left_on="image_series_uid", right_on="image_series_uid"
    )

    # Get value_as_number, value_as_concept_id from image_feature dataset
    eav_df = eav_df.merge(
        image_feature_df[["value_as_number", "concept_id_y", "measurement_source_value", "id"]],
        how="left", left_on="id", right_on="id"
    )

    eav_df = eav_df.rename(columns={
        "concept_id": "data_element_concept_id",
        "VR": "metadata_source_value_representation",
        "tag": "metadata_source_tag",
        "value": "metadata_source_value",
        "concept_id_y": "value_as_concept_id"
    })

    # Add new columns
    eav_df["metadata_id"] = eav_df["id"] + eav_table_id - 1
    eav_df["metadata_source_group_number"] =  eav_df["metadata_source_tag"].str[:4]
    eav_df["is_sequence"] =  eav_df["metadata_source_value_representation"].apply(lambda x: x == "SQ")
    eav_df["etl_created_datetime"] = pd.Timestamp.now()
    eav_df["etl_modified_datetime"]= eav_df["etl_created_datetime"]
    
    # Fix data types
    eav_df["metadata_source_value"] = eav_df["metadata_source_value"].apply(coerce_to_string)
    eav_df["parent_sequence_id"] = eav_df["parent_sequence_id"] .astype('Int64')
    eav_df["sequence_length"] = eav_df["sequence_length"] .astype('Int64')
    eav_df["instance_number"] = eav_df["instance_number"] .astype('Int64')


    eav_df_numeric = eav_df[~eav_df['value_as_number'].isna()]
    logger.info(f"eav_df_numeric length is {len(eav_df_numeric)}")

    eav_df = eav_df[eav_df['value_as_number'].isna()]
    logger.info(f"eav_df length is {len(eav_df)}")

    # Insert numeric records
    eav_df_numeric[ingestion_columns].to_sql(table_name, dbdao.engine, if_exists='append', index=False, schema=dbdao.schema_name,
                                             chunksize=50000, method=psql_insert_copy)
    logger.info(f"Successfully ingested {len(eav_df_numeric)} numeric records into '{dbdao.schema_name}.{table_name}' table!")

    # Insert non-numeric records
    ingestion_columns.remove("value_as_number")
    eav_df[ingestion_columns].to_sql(table_name, dbdao.engine, if_exists='append', index=False, schema=dbdao.schema_name, 
                                     chunksize=50000, method=psql_insert_copy)
    logger.info(f"Successfully ingested {len(eav_df)} non-numeric records into '{dbdao.schema_name}.{table_name}' table!")


@task(log_prints=True)
def ingest_procedure_occurrence(image_occurrence_df: pd.DataFrame, dbdao: DBDao):
    logger = get_run_logger()
    table_name = "procedure_occurrence"

    logger.info(f"{len(image_occurrence_df)} records to be ingested into '{dbdao.schema_name}.{table_name}' table..")
    
    ingestion_columns = [
        "procedure_occurrence_id",
        "person_id",
        "procedure_concept_id", # Todo: Using non-standard concept_id
        "procedure_date",
        "procedure_type_concept_id" # Todo: Using hardcoded value
    ]

    procedure_occurrence_df = image_occurrence_df.rename(columns={
        "modality_concept_id": "procedure_concept_id",
        "image_occurrence_date": "procedure_date", 
        "visit_type_concept_id": "procedure_type_concept_id", 
        })

    logger.info(f"Ingesting {len(procedure_occurrence_df)} records into '{dbdao.schema_name}.{table_name}' table..")
    procedure_occurrence_df[ingestion_columns].to_sql(table_name, dbdao.engine, if_exists='append', index=False, schema=dbdao.schema_name, chunksize=50000)
    logger.info(f"Successfully ingested {len(procedure_occurrence_df)} records into '{dbdao.schema_name}.{table_name}' table!")


@task(log_prints=True)
def ingest_visit_occurrence(image_occurrence_df: pd.DataFrame, dbdao: DBDao):
    logger = get_run_logger()
    table_name = "visit_occurrence"

    logger.info(f"{len(image_occurrence_df)} records to be ingested into '{dbdao.schema_name}.{table_name}' table..")
    
    ingestion_columns = [
        "visit_occurrence_id",
        "person_id",
        "visit_concept_id", # Todo: Using hardcoded value
        "visit_start_date",
        "visit_end_date",
        "visit_type_concept_id" # Todo: Using hardcoded value
    ]

    visit_occurrence_df = image_occurrence_df.rename(columns={
        "image_occurrence_date": "visit_start_date", 
        })
    visit_occurrence_df["visit_end_date"] = visit_occurrence_df["visit_start_date"]

    logger.info(f"Ingesting {len(visit_occurrence_df)} records into '{dbdao.schema_name}.{table_name}' table..")
    visit_occurrence_df[ingestion_columns].to_sql(table_name, dbdao.engine, if_exists='append', index=False, schema=dbdao.schema_name, chunksize=50000)
    logger.info(f"Successfully ingested {len(visit_occurrence_df)} records into '{dbdao.schema_name}.{table_name}' table!")


@task(log_prints=True)
def ingest_image_feature(image_feature_df: pd.DataFrame, dbdao: DBDao):
    logger = get_run_logger()
    table_name = "image_feature"

    logger.info(f"{len(image_feature_df)} records to be ingested into '{dbdao.schema_name}.{table_name}' table..")

    ingestion_columns = [
        "image_feature_id",
        "person_id",
        "image_occurrence_id",
        "image_feature_event_id",
        "image_feature_event_field_concept_id",
        "image_feature_concept_id",
        "image_feature_type_concept_id",
        "anatomic_site_concept_id"
    ]

    image_feature_df["image_feature_event_field_concept_id"] = image_feature_df["image_feature_event_field_id"]

    image_feature_df = image_feature_df.rename(columns={
        "concept_id_x": "image_feature_concept_id", 
        "image_feature_event_type_id": "image_feature_type_concept_id",
        })

    image_feature_df[ingestion_columns].to_sql(table_name, dbdao.engine, if_exists='append', index=False, schema=dbdao.schema_name, 
                                               chunksize=50000, method=psql_insert_copy)
    logger.info(f"Successfully ingested {len(image_feature_df)} records into '{dbdao.schema_name}.{table_name}' table!")


@task(log_prints=True)
def ingest_measurement(image_feature_df: pd.DataFrame, dbdao: DBDao):
    logger = get_run_logger()
    table_name = "measurement"

    logger.info(f"{len(image_feature_df)} records to be ingested into '{dbdao.schema_name}.{table_name}' table..")
    
    ingestion_columns = [
        "measurement_id",
        "person_id",
        "measurement_concept_id", # Todo: Using non-standard concept_id
        "measurement_date",
        "measurement_type_concept_id", # Todo: Using hardcoded value
        "value_as_number",
        "value_as_concept_id", # Todo: Using non-standard concept_id
        "measurement_source_value",
        "measurement_source_concept_id" # Todo: Using non-standard concept_id
    ]

    measurement_df = image_feature_df.rename(columns={
        "image_feature_event_id": "measurement_id", 
        "concept_id_x": "measurement_concept_id",
        "image_occurrence_date": "measurement_date",
        "image_feature_event_type_id": "measurement_type_concept_id",
        "concept_id_y": "value_as_concept_id",
        })
    
    measurement_df["measurement_source_concept_id"] = measurement_df["measurement_concept_id"]
    measurement_df_numeric = measurement_df[~measurement_df['value_as_number'].isna()]
    measurement_df = measurement_df[measurement_df['value_as_number'].isna()]

    logger.info(f"Ingesting {len(measurement_df)} records into '{dbdao.schema_name}.{table_name}' table..")
    
    # Insert numeric 
    measurement_df_numeric[ingestion_columns].to_sql(table_name, dbdao.engine, if_exists='append', index=False, schema=dbdao.schema_name,
                                                    chunksize=50000, method=psql_insert_copy)
    logger.info(f"Successfully ingested {len(measurement_df_numeric)} numeric records into '{dbdao.schema_name}.{table_name}' table!")

    # Insert non-numeric 
    ingestion_columns.remove("value_as_number")
    measurement_df[ingestion_columns].to_sql(table_name, dbdao.engine, if_exists='append', index=False, schema=dbdao.schema_name, 
                                             chunksize=50000, method=psql_insert_copy)
    logger.info(f"Successfully ingested {len(measurement_df)} non-numeric records into '{dbdao.schema_name}.{table_name}' table!")


@task(log_prints=True)
def ingest_image_occurrence(image_occurrence_df: pd.DataFrame, dbdao: DBDao):
    logger = get_run_logger()
    table_name = "image_occurrence"

    logger.info(f"{len(image_occurrence_df)} records to be ingested into '{dbdao.schema_name}.{table_name}' table..")
    
    ingestion_columns = [
        "image_occurrence_id",
        "person_id",
        "procedure_occurrence_id",
        "visit_occurrence_id",
        "anatomic_site_concept_id", # Todo: Using non-standard concept_id
        "image_occurrence_date",
        "image_study_uid",
        "image_series_uid",
        "modality_concept_id" # Todo: Using non-standard concept_id
    ]

    logger.info(f"Ingesting {len(image_occurrence_df)} records into '{dbdao.schema_name}.{table_name}' table..")
    image_occurrence_df[ingestion_columns].to_sql(table_name, dbdao.engine, if_exists='append', index=False, schema=dbdao.schema_name, chunksize=50000)
    logger.info(f"Successfully ingested {len(image_occurrence_df)} records into '{dbdao.schema_name}.{table_name}' table!")


@task(log_prints=True)
def transform_for_image_feature(mapped_concepts_df: pd.DataFrame, image_occurrence_df: pd.DataFrame, 
                                new_measurement_id: int, new_image_feature_id: int, vocab_dbdao: DBDao) -> pd.DataFrame:
    
    logger = get_run_logger()
    
    # Filter dicom data elements by VR to ingest:
    # 1. Concept id cannot be null
    # 2. Value cannot be null
    # 3. VR must be in VR_FILTER_LIST or the tag 00080070 (Manufacturer) which is of VR LO
    # 4. If the concept_id is not null and in the VR_FILTER_LIST, len(value) cannot be > 50 char
    
    # This gets the tags for criteria 4
    excluded_list = mapped_concepts_df[
        (~mapped_concepts_df["concept_id"].isna()) & 
        (mapped_concepts_df["VR"].isin(VR_FILTER)) & 
        (mapped_concepts_df["value"].str.len()>50) &
        (mapped_concepts_df["value"]!= "{}")
    ]

    logger.info("Number of data elements excluded by tags:")
    grouped__excluded_list = excluded_list.groupby("tag").size().reset_index(name="count")
    logger.info(grouped__excluded_list.sort_values(by="count", ascending=False))
    
    selected_data_elements = mapped_concepts_df[
        (~mapped_concepts_df["concept_id"].isna()) & 
        (~mapped_concepts_df["value"].isna()) &
        (~mapped_concepts_df["tag"].isin(excluded_list)) &
        ((mapped_concepts_df["VR"].isin(VR_FILTER)) | (mapped_concepts_df['tag'].isin(["00080070"]))) # always include manufacturer tag
    ]

    # Coerce all values to string
    selected_data_elements["value"] = selected_data_elements["value"].apply(coerce_to_string)

    logger.info("Number of data elements selected for ingestion into image_feature and measurement tables by VR:")
    grouped__selected_data_elements = selected_data_elements.groupby("VR").size().reset_index(name="count")
    logger.info(grouped__selected_data_elements.sort_values(by="count", ascending=False))


    # Attempt to map concept_ids for CS values
    with vocab_dbdao.ibis_connect() as conn:
        concept_table = conn.table(name="concept", database=vocab_dbdao.schema_name)
        concept_df = concept_table[["concept_id", "concept_code", "concept_name"]].execute()
        concept_df['concept_code'] = concept_df['concept_code'].astype(str)
        concept_df['concept_code'] = concept_df['concept_code'].str.upper()

        concept_relationship_table = conn.table(name="concept_relationship", database=vocab_dbdao.schema_name)
        concept_relationship_df = concept_relationship_table.filter(concept_relationship_table.relationship_id == "Maps to value")[
            ["concept_id_1", "concept_id_2"]].execute()

    logger.info("Mapping concept table to concept_relationship table..")
    att_to_value = concept_relationship_df[["concept_id_1", "concept_id_2"]].merge(
        concept_df[["concept_id", "concept_code", "concept_name"]], left_on = "concept_id_2", right_on = "concept_id")
    att_to_value[["concept_id_1", "concept_id_2", "concept_id"]] = att_to_value[["concept_id_1", "concept_id_2", "concept_id"]].astype('int64')

    logger.info("Mapping concept ids for CS data elements..")

    new_image_features_cs = selected_data_elements[selected_data_elements["VR"]=="CS"].merge(
        att_to_value, how="inner", left_on=["concept_id", "value"], right_on=["concept_id_1", "concept_code"]
    )

    logger.info("Mapping concept ids for CS values..")
    new_image_features_cs_no_duplicates = new_image_features_cs[["tag", "concept_name_x", "value"]].drop_duplicates()
    logger.info("List of mappable CS values with tags:")
    logger.info(new_image_features_cs_no_duplicates)

    # Handle unmappable CS values and non-CS values
    mapped_cs_attributes = new_image_features_cs_no_duplicates["value"].unique().tolist()
    new_image_features_non_cs = selected_data_elements[~selected_data_elements['value'].isin(mapped_cs_attributes)]
    new_image_features_non_cs = new_image_features_non_cs.rename(columns={
        'concept_id': 'concept_id_x', # left df concept_id col renamed after merge
        'concept_name': 'concept_name_x', # left df concept_name col renamed after merge
        'concept_code': 'concept_code_x' # left df concept_name col renamed after merge
        })
    
    
    new_image_features = pd.concat([new_image_features_cs, new_image_features_non_cs])
    new_image_features['concept_id_y'] = new_image_features['concept_id_y'].astype('Int64') # right df concept_id col renamed after merge
    new_image_features['concept_id_y'] = new_image_features['concept_id_y'].fillna(0) # For unmappable values, concept_id is set to 0

    # Get image_occurrence values used for image_feature table
    new_image_features = new_image_features.merge(image_occurrence_df[
        ['image_occurrence_id', 'person_id', 'image_series_uid', 'image_occurrence_date', 'anatomic_site_concept_id']
        ], how = 'left', on = 'image_series_uid')
    
    # Todo: Update hardcoded values
    new_image_features['image_feature_event_field_id'] = 1147330 # measurement
    new_image_features['image_feature_event_type_id'] = 32817 # EHR
    new_image_features["image_feature_id"] = range(new_image_feature_id, len(new_image_features)+new_image_feature_id)
    new_image_features['image_feature_event_id'] = range(new_measurement_id, len(new_image_features)+new_measurement_id)


    new_image_features['value_as_number'] = new_image_features.apply(
        lambda row: row['value'] if row['VR'] not in ['CS', 'LO'] else None, axis=1) # measurement table value as number col
    new_image_features['measurement_source_value'] = new_image_features['value'].astype(str).str[:50] # measurement table source value col is varchar(50)
    new_image_features = new_image_features.where(pd.notnull(new_image_features), None)

    new_image_features['value_as_number'] = pd.to_numeric(new_image_features['value'], errors='coerce')

    return new_image_features


@task(log_prints=True)
def transform_for_image_occurrence(mapped_concepts_df: pd.DataFrame, vocab_dbdao: DBDao, mapping_dbdao: DBDao, 
                                   person_patient_mapping: PersonPatientMapping, next_record_ids: tuple[int, int, int]) -> pd.DataFrame:
    
    task_logger = get_run_logger()
    
    # Tags used for image_occurrence, procedure_occurrence, visit_occurrence
    # 00080020: Study Date, 00100020: Patient ID, 00080060: Modality
    # 00180015: Body Part Examined (Optional in Image Occurrence table)
    tags_for_columns = ["00080020", "00100020", "00080060", "00180015"]

    # Select only rows with the above tags
    df_subset = mapped_concepts_df[mapped_concepts_df["tag"].isin(tags_for_columns)][["image_study_uid",
                                                                                      "image_series_uid",
                                                                                      "tag",
                                                                                      "value"]]
    # Pivot to wide format and select only keep unique series uids
    df_subset_pivoted = df_subset.pivot_table(index=["image_study_uid", "image_series_uid"], columns="tag", values="value", aggfunc="first")
    df_subset_pivoted.reset_index(inplace=True)
    df_subset_pivoted = df_subset_pivoted.drop_duplicates(subset=["image_study_uid", "image_series_uid"])


    # Create "00180015" BodyPartExamined column if it doesn't exist and fill with NaN  
    if '00180015' not in df_subset_pivoted.columns:
        df_subset_pivoted['00180015'] = np.nan

    # Create "00180015" StudyDate column if it doesn't exist and fill with 19930101 i.e. earliest vocab valid date  
    if '00080020' not in df_subset_pivoted.columns:
        df_subset_pivoted['00080020'] = "19930101"

    # Map Person ID
    person_id_col = person_patient_mapping.person_id_column_name
    patient_id_col = person_patient_mapping.patient_id_column_name
    
    with mapping_dbdao.ibis_connect() as conn:
        mapping_table = conn.table(name=person_patient_mapping.table_name,
                                   database=person_patient_mapping.schema_name)
        
        mapping_df = mapping_table[[person_id_col, patient_id_col]].execute()


    image_occurrence_df = df_subset_pivoted.merge(mapping_df[[person_id_col, patient_id_col]],
                                                  how="left", left_on="00100020", right_on=patient_id_col)
    image_occurrence_df.rename(columns={person_id_col: 'person_id'}, inplace=True)

    # Use person_id = 0 for unmatched patient_ids
    image_occurrence_df['person_id'] = image_occurrence_df['person_id'].fillna(0)
    image_occurrence_df['person_id'] = image_occurrence_df['person_id'].astype('Int64')

    # Get concept id for modality and body part
    with vocab_dbdao.ibis_connect() as conn:
        concept_table = conn.table(name="concept", database=vocab_dbdao.schema_name)
        concept_df = concept_table.filter(concept_table.vocabulary_id == "DICOM")[["concept_id", "concept_code"]].execute()
        concept_df['concept_code'] = concept_df['concept_code'].astype(str)
        concept_df['concept_code'] = concept_df['concept_code'].str.upper()
       
    # Todo: Update with standard concept ids
    # Get concept id for BodyPartExamined -> anatomic_site_concept_id
    task_logger.info("Mapping BodyPartExamined tag to concept_id..")
    image_occurrence_df = image_occurrence_df.merge(concept_df[["concept_id", "concept_code"]], 
                                                    how="left", left_on="00180015", right_on="concept_code")
    image_occurrence_df.rename(columns={"concept_id": "anatomic_site_concept_id"}, inplace=True)

    # Use anatomic_site_concept_id = 0 for unmatched patient_ids
    image_occurrence_df['anatomic_site_concept_id'] = image_occurrence_df['anatomic_site_concept_id'].fillna(0)
    image_occurrence_df['anatomic_site_concept_id'] = image_occurrence_df['anatomic_site_concept_id'].astype('Int64')


    # Todo: Update with standard concept id
    # Get concept id for Modality -> modality_concept_id
    task_logger.info("Mapping Modality tag to concept_id..")
    image_occurrence_df = image_occurrence_df.merge(concept_df[["concept_id", "concept_code"]], 
                                                    how="left", left_on="00080060", right_on="concept_code")
    image_occurrence_df.rename(columns={"concept_id": "modality_concept_id"}, inplace=True)

    # Use modality_concept_id = 0 for unmatched patient_ids
    image_occurrence_df['modality_concept_id'] = image_occurrence_df['modality_concept_id'].fillna(0)
    image_occurrence_df['modality_concept_id'] = image_occurrence_df['modality_concept_id'].astype('Int64')

    # Todo: Update wadors_uri, local_path, visit_type_concept_id & visit_concept_id
    image_occurrence_df['image_occurrence_date'] = pd.to_datetime(image_occurrence_df['00080020'])
    image_occurrence_df['image_occurrence_date'] = image_occurrence_df['image_occurrence_date'].fillna(pd.to_datetime("1993-01-01"))

    image_occurrence_df['visit_type_concept_id'] = 32817 # EHR
    image_occurrence_df['visit_concept_id'] = 9202 # Outpatient visit

    image_occurrence_df['image_occurrence_id'] = pd.Series(range(next_record_ids[0], 
                                                                 next_record_ids[0] + len(image_occurrence_df)))
    image_occurrence_df['procedure_occurrence_id'] = pd.Series(range(next_record_ids[1], 
                                                                     next_record_ids[1] + len(image_occurrence_df)))
    image_occurrence_df['visit_occurrence_id'] = pd.Series(range(next_record_ids[2], 
                                                                 next_record_ids[2] + len(image_occurrence_df)))

    task_logger.info("Successfully created records for image occurrence, procedure occurrence and visit occurrence tables!")
    return image_occurrence_df
    

@task(log_prints=True)
def get_concept_ids_for_tags(extracted_data_df: pd.DataFrame, vocab_dbdao: DBDao) -> pd.DataFrame:
    task_logger = get_run_logger()

    with vocab_dbdao.ibis_connect() as conn:
        concept_table = conn.table(name="concept", database=vocab_dbdao.schema_name)
        concept_df = concept_table.filter(concept_table.vocabulary_id == "DICOM")[["concept_id",
                                                                                   "concept_name",
                                                                                   "concept_code"
                                                                                   ]].execute()
    assert len(concept_df) > 0

    # Get concept IDs for extracted tags by joining with concept table
    task_logger.info(f"Retrieving concept_ids for tags..")    
    dicom_tags_omop_df = extracted_data_df.merge(concept_df[['concept_id', 'concept_code', 'concept_name']], how = 'left', left_on = 'tag', right_on = 'concept_code')
    
    # update concept_id data type to int 
    dicom_tags_omop_df['concept_id'] = dicom_tags_omop_df['concept_id'].astype('Int64')

    return dicom_tags_omop_df


@task(log_prints=True)
def extract_data_elements(dicom_files) -> pd.DataFrame:
    logger = get_run_logger()

    extracted_metadata = []
    error_elements = []
    generator_fn = incrementer()

    logger.info(f"Extracting metadata from {len(dicom_files)} files..")

    for filepath in dicom_files:
        with dcmread(filepath) as dicom_f:

            study_instance_uid = dicom_f.get("StudyInstanceUID") # [0x0020, 0x000D]
            series_instance_uid = dicom_f.get("SeriesInstanceUID") # [0x0020, 0x000E]
            sop_instance_uid = dicom_f.get("SOPInstanceUID") # [0x0008,0x0018]
            instance_number = dicom_f.get("InstanceNumber", None) # [0x0020,0x0013]

            record = {
                "image_study_uid": study_instance_uid,
                "image_series_uid": series_instance_uid,
                "sop_instance_id": sop_instance_uid,
                "instance_number": instance_number,
                "filepath": filepath
            }

            for data_elem in dicom_f:
                if convert_tag_to_string(data_elem.tag) == "7FE00010" or data_elem.VR == "UN": # Filter out values that are too large to store in db
                    continue # skip
                else:
                    try:
                        extracted_metadata.extend(data_elem_to_dict(data_elem, record, generator_fn))
                    except Exception as e:
                        error_msg = f"Failed to process {data_elem.name}: {e}"
                        error_elements.append(
                            {
                                "filepath": str(filepath),
                                "data_element_name": data_elem.name,
                                "data_element_tag": data_elem.tag,
                                "data_element_vr": data_elem.VR
                            }
                        )
                        logger.error(error_msg)

    logger.info(f"Successfully extracted metadata for {len(extracted_metadata)} data elements")

    if len(error_elements) > 0:
        processing_error_msg = f"Failed to extract metadata for {len(error_elements)} data elements"
        logger.error(processing_error_msg)
        raise Exception(processing_error_msg) 
                
    extracted_metadata_df = pd.DataFrame(extracted_metadata)

    assert extracted_metadata_df["sop_instance_id"].nunique() == len(dicom_files)
    assert extracted_metadata_df["id"].nunique() == len(extracted_metadata)

    return extracted_metadata_df


@task(log_prints=True)
def setup_vocab(dbdao, to_truncate: bool):
    task_logger = get_run_logger()
    update_vocabulary_table(dbdao, to_truncate, task_logger)
    update_concept_class_table(dbdao, to_truncate, task_logger)
    update_concept_table(dbdao, to_truncate, task_logger)
    update_concept_relationship_table(dbdao, to_truncate, task_logger)
    


@task(
    log_prints=True,
    result_storage=RFS.load(Variable.get("flows_results_sb_name")),
    result_storage_key="dicom_etl_{flow_run.id}.json",
    result_serializer=JSONSerializer(),
    persist_result=True
    )
def upload_file_to_server(mapped_concepts_df: pd.DataFrame, image_occurrence_df: pd.DataFrame, 
                          api) -> FileUploadResultType:     
    logger = get_run_logger()   
    service_routes = Variable.get("service_routes")
    dicom_server_url = service_routes.get("dicomServer")

    file_df = mapped_concepts_df[["sop_instance_id", "filepath", "image_series_uid"]]
    file_df = file_df.drop_duplicates(subset=["sop_instance_id", "filepath"])

    file_df = file_df[["sop_instance_id", "filepath", "image_series_uid"]].merge(
        image_occurrence_df[["image_occurrence_id", "image_series_uid"]], how="left", 
        left_on="image_series_uid", right_on="image_series_uid"
    )

    logger.info("Connecting to DICOM server..")
    # Todo: Uncomment when there is a dicom server
    #orthanc_a = OrthancApiClient(dicom_server_url, user='', pwd='')
    
    logger.info(f"Uploading {len(file_df)} files to DICOM server..")
    # Todo: Uncomment when there is a dicom server
    # for index, row in file_df.iterrows():
    #     orthanc_instance_id = orthanc_a.upload_file(row["filepath"])
    #     if orthanc_instance_id:
    #         file_df.at[index, "orthanc_instance_id"] = orthanc_instance_id

    #         # because file is renamed to a random uuid when uploaded to dicom server
    #         uploaded_filename = api.get_uploaded_file_name(orthanc_instance_id[0])
    #         file_df.at[index, "uploaded_filename"] = uploaded_filename
    #     else:
    #         error_msg = f"Orthanc_instance_id is {orthanc_instance_id}. Failed to upload file '{row["filepath"]}'"
    #         logger.error(error_msg)
    #         raise Exception(error_msg)


    task_run_context = TaskRunContext.get().task_run.dict()
    task_run_id = str(task_run_context.get("id"))
    flow_run_id = str(task_run_context.get("flow_run_id"))

    upload_results = file_df.to_dict(orient="records")
 
    file_upload_result = {
        "flow_run_id": flow_run_id,
        "task_run_id": task_run_id,
        "record": upload_results
    }
    
    # Persist as prefect result
    return file_upload_result
