from __future__ import annotations

import csv
import pandas as pd
from io import StringIO
from datetime import datetime
from typing import TYPE_CHECKING

from .types import *

if TYPE_CHECKING:
    from typing import Generator
    from pydicom import Sequence
    from pydicom.tag import BaseTag
    from pydicom.dataelem import DataElement

def incrementer() -> Generator[int, None, None]:
    n = 1
    while True:
        yield n
        n += 1


def update_vocabulary_table(dbdao, to_truncate: bool, logger):
    '''
    Add DICOM Vocabulary to Vocabulary table
    '''
    vocabulary_table = "vocabulary"    
    if to_truncate:
        logger.info(f"Truncating '{dbdao.schema_name}.{vocabulary_table}' table..")
    try:
        logger.info(f"Populating '{dbdao.schema_name}.{vocabulary_table}' table..")
        values_to_insert = {
            "vocabulary_id": "DICOM",
            "vocabulary_name": "Digital Imaging and Communications in Medicine (National Electrical Manufacturers Association)",
            "vocabulary_reference": "https://www.dicomstandard.org/current", 
            "vocabulary_version": "NEMA Standard PS3", 
            "vocabulary_concept_id": 2128000000
        }
        dbdao.insert_values_into_table(vocabulary_table, values_to_insert)
    except Exception as e:
        logger.error(f"Failed to insert DICOM Vocabulary into'{dbdao.schema_name}.{vocabulary_table}' table!")
        raise e
    else:
        logger.info(f"Successfully inserted DICOM Vocabulary into '{dbdao.schema_name}.{vocabulary_table}' table!")


def update_concept_class_table(dbdao, to_truncate: bool, logger):
    '''
    Add DICOM Vocabulary to Concept Class table
    '''  
    concept_class_table = "concept_class"

    if to_truncate:
        logger.info(f"Truncating '{dbdao.schema_name}.{concept_class_table}' table..")
        dbdao.truncate_table(concept_class_table)
    try:
        logger.info(f"Populating '{dbdao.schema_name}.{concept_class_table}' table..")
        values_to_insert = [
            {"concept_class_id": "DICOM Attributes", "concept_class_name": "DICOM Attributes", "concept_class_concept_id": 2128000001},
            {"concept_class_id": "DICOM Value Sets", "concept_class_name": "DICOM Value Sets", "concept_class_concept_id": 2128000002}
        ]
        dbdao.insert_values_into_table(concept_class_table, values_to_insert)
    except Exception as e:
        logger.error(f"Failed to insert DICOM Vocabulary into'{dbdao.schema_name}.{concept_class_table}' table!")
        raise e
    else:
        logger.info(f"Successfully inserted DICOM Vocabulary into '{dbdao.schema_name}.{concept_class_table}' table!")


def update_concept_relationship_table(dbdao, to_truncate: bool, logger):
    concept_relationship_table = "concept_relationship"
    columns_to_use = ["concept_id_1", "concept_id_2", "relationship_id"]

    concept_relationship_staging_df = pd.read_pickle(f'{PATH_TO_EXTERNAL_FILES}/part3_to_part16_relationship_via_CID.pkl')
    cs_values_maps_to_value_df = pd.read_csv(f'{PATH_TO_EXTERNAL_FILES}/cs_values_maps_to_value.csv', usecols=columns_to_use)
    cs_values_maps_to_df = pd.read_csv(f'{PATH_TO_EXTERNAL_FILES}/cs_values_maps_to.csv', usecols=columns_to_use)

    if to_truncate:
        logger.info(f"Truncating '{dbdao.schema_name}.{concept_relationship_table}' table..")
        dbdao.truncate_table(concept_relationship_table)

    try:
        logger.info(f"Populating '{dbdao.schema_name}.{concept_relationship_table}' table..")

        concept_relationship_staging_df["valid_start_date"] = pd.to_datetime(concept_relationship_staging_df["valid_start_date"].astype(str), format='%Y%m%d').dt.strftime('%Y%m%d')
        concept_relationship_staging_df["valid_end_date"] = pd.to_datetime(concept_relationship_staging_df["valid_end_date"].astype(str), format='%Y%m%d').dt.strftime('%Y%m%d')

        concept_relationship_staging_df.to_sql(
            name=concept_relationship_table, 
            con=dbdao.engine,
            schema=dbdao.schema_name,
            if_exists="append",
            index=False
        )

        cs_values_maps_to_value_df["valid_start_date"] = pd.to_datetime('1993-01-01')
        cs_values_maps_to_value_df["valid_end_date"] = pd.to_datetime('2099-12-31')

        cs_values_maps_to_value_df.to_sql(
            name=concept_relationship_table, 
            con=dbdao.engine,
            schema=dbdao.schema_name,
            if_exists="append",
            index=False
        )

        cs_values_maps_to_df["valid_start_date"] = pd.to_datetime('1993-01-01')
        cs_values_maps_to_df["valid_end_date"] = pd.to_datetime('2099-12-31')
        
        cs_values_maps_to_df.to_sql(
            name=concept_relationship_table, 
            con=dbdao.engine,
            schema=dbdao.schema_name,
            if_exists="append",
            index=False
        )
    except Exception as e:
        logger.error(f"Failed to insert DICOM Vocabulary into'{dbdao.schema_name}.{concept_relationship_table}' table!")
        raise e
    else:
        logger.info(f"Successfully inserted DICOM Vocabulary into '{dbdao.schema_name}.{concept_relationship_table}' table!")


def update_concept_table(dbdao, to_truncate: bool, logger):
    concept_table = "concept"

    if to_truncate:
        dbdao.truncate_table(concept_table)


    logger.info(f"Populating '{dbdao.schema_name}.{concept_table}' table..")
    try:
        concept_df = pd.read_csv(f"{PATH_TO_EXTERNAL_FILES}/omop_table_staging_v3.csv")
        
        # Adjust its data types
        concept_df['valid_start_date'] = pd.to_datetime('1993-01-01')
        concept_df['valid_end_date'] = pd.to_datetime('2099-12-31')
        concept_df['standard_concept'] = ' '
        concept_df['invalid_reason'] = ' '

        # make sure string values have datatype of str
        varchar_columns = ['concept_name', 'domain_id', 'vocabulary_id', 'concept_class_id', 'standard_concept', 'concept_code', 'invalid_reason']
        for col in varchar_columns:
            concept_df[col] = concept_df[col].astype(str)

        # handle NULLs for SQL 
        concept_df = concept_df.where(pd.notnull(concept_df), None)

        concept_df.to_sql(
            name=concept_table, 
            con=dbdao.engine,
            schema=dbdao.schema_name,
            if_exists="append",
            index=False
        )
    except Exception as e:
        logger.error(f"Failed to insert DICOM Concepts into'{dbdao.schema_name}.{concept_table}' table!")
        raise e
    else:
        logger.info(f"Successfully inserted DICOM Concepts into '{dbdao.schema_name}.{concept_table}' table!")


def extract_metadata(data_element: DataElement, record: dict, id: int, parent_sequence_id: int = None) -> DataElementType:
    sequence_length = get_sequence_length(data_element) if data_element.VR == "SQ" else None
    metadata = {
        "id": id,
        "metadata_source_name": data_element.name,
        "metadata_source_keyword": data_element.keyword,
        "tag": convert_tag_to_string(data_element.tag),
        "tag_tuple": convert_tag_to_tuple(data_element.tag),
        "VR": data_element.VR,
        "value": None if data_element.VR == "SQ" else extract_data_element_value(data_element),
        "is_sequence": True if data_element.VR == "SQ" else False,
        "sequence_length": sequence_length,
        "parent_sequence_id": parent_sequence_id if parent_sequence_id else None,
        "is_private": data_element.is_private,
        "private_creator": data_element.private_creator,
    }
    metadata.update(record)
    return metadata


def extract_data_element_value(data_element: DataElement):
    if data_element.value: 
        return data_element.value
    return None


def get_sequence_length(data_element: DataElement) -> int:
    # Gets the number of elements stored in the first level
    if data_element.value:
        sq_dataset: Sequence = data_element.value # Access the sequence 
        return len(sq_dataset[0])
    else:
        # Empty sequences don't have a .value
        return 0

def convert_tag_to_string(tag: BaseTag) -> str:
    tag_str =  f"{tag.group:04X}{tag.element:04X}"
    return tag_str


def convert_tag_to_tuple(tag: BaseTag) -> str:
    tag_tuple=  f"({tag.group:04X},{tag.element:04X})"
    return tag_tuple


def data_elem_to_dict(data_element: DataElement, record: dict, generator_fn: Generator, 
                      parent_seq_id: int = None) -> list[DataElementType]:
    
    id = next(generator_fn)

    result = [extract_metadata(data_element, record, id, parent_seq_id)]
    
    if data_element.VR == "SQ": # Include nested data elements in sequences
        sq_dataset = data_element.value

        if len(sq_dataset) > 0: # non-empty sequence
            for sq_data_elem in sq_dataset[0]: # Use the 0 idx to access data elements in the dataset in the sequence
                result.extend(data_elem_to_dict(data_element=sq_data_elem, record=record,
                                                generator_fn=generator_fn, parent_seq_id=id))
    return result


def coerce_to_string(val: any) -> str:
    return str(val)


def psql_insert_copy(table, conn, keys, data_iter):
    dbapi_conn = conn.connection
    with dbapi_conn.cursor() as cur:
        s_buf = StringIO()
        writer = csv.writer(s_buf)
        writer.writerows(data_iter)
        s_buf.seek(0)

        columns = ', '.join('"{}"'.format(k) for k in keys)
        if table.schema:
            table_name = '{}.{}'.format(table.schema, table.name)
        else:
            table_name = table.name

        sql = 'COPY {} ({}) FROM STDIN WITH CSV'.format(
            table_name, columns)
        cur.copy_expert(sql=sql, file=s_buf)