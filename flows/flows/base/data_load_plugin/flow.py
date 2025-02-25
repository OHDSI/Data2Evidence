from __future__ import annotations

import csv
import ibis
import numpy as np
import pandas as pd
from io import StringIO
from typing import TYPE_CHECKING

from prefect import flow, task
from prefect.logging import get_run_logger

from flows.data_load_plugin.types import DataloadOptions, FileType

from shared_utils.dao.DBDao import DBDao
from shared_utils.types import SupportedDatabaseDialects

if TYPE_CHECKING:
    from shared_utils.dao.daobase import DaoBase




@flow(log_prints=True)
def data_load_plugin(options: DataloadOptions):
    logger = get_run_logger()
    
    files = options.files
    database_code = options.database_code
    use_cache_db = options.use_cache_db
    header = 0 if options.header else None
    escape_char = options.escape_character if options.escape_character else None
    schema = options.schema_name
    tables_to_truncate = [f.table_name for f in files if f.truncate]
    chunksize = options.chunksize if options.chunksize else None
    
    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code, 
                  schema_name=schema)

    truncate_tables(table_list=tables_to_truncate,
                    dbdao=dbdao,
                    logger=logger)

    for csv_file in files:
       etl_task(dbdao, file=csv_file, escapechar=escape_char, header=header, 
                delimiter=options.delimiter, encoding=options.encoding, 
                chunksize=chunksize, logger=logger)
                


@task(log_prints=True)
def truncate_tables(table_list: list[str], dbdao: DaoBase, logger):   
    # Truncate tables
    for table in table_list:
        logger.info(f"Truncating table '{dbdao.schema_name}.{table}'")
        dbdao.truncate_table(table)


@task(log_prints=True,
      task_run_name="etl_parent_task-{file.table_name}")
def etl_task(dbdao: DaoBase, file: FileType, escapechar: str, header: bool|None, delimiter: str, encoding: str, chunksize: int, logger):
    logger.info(f"Reading data from file '{file.table_name}'")

    for i, data in read_csv(file.path, escapechar=escapechar, header=header, 
                            delimiter=delimiter, encoding=encoding, chunksize=chunksize):

        transformed_df = format_vocab_synpuf_data(dbdao, data, file.table_name, logger) 
        
        load_data(dbdao, transformed_df, header, file, chunksize, i, logger)
        

def load_data(dbdao: DaoBase, df: pd.DataFrame, header: bool|None, file: FileType, chunksize: int, chunkindex: int, logger):
    try:
        if header == 0:
            csv_column_names = df.columns.tolist()
            table_column_names = dbdao.get_columns(file.table_name) # use ibis to get columns from table, raise exception if table is empty
            
            if table_column_names is None:
                raise Exception(f"No columns found for table {file.table_name} in schema {dbdao.schema_name}!")
            # else:
            #     table_column_names = [column_name[0] for column_name in table_column_names]
            common_columns = list(set(csv_column_names) & set(table_column_names))
            df[common_columns].to_sql(file.table_name, dbdao.engine, if_exists='append', index=False, schema=dbdao.schema_name, chunksize=chunksize, method=psql_insert_copy)
        elif header is None:
            df.to_sql(file.table_name, dbdao.engine, if_exists="append", index=False, schema=dbdao.schema_name, chunksize=chunksize, method=psql_insert_copy)
    except Exception as e:
        logger.error(f"'Data load failed for the table '{dbdao.schema_name}.{file.table_name}' at the chunk index: {chunkindex}  with error: {e}")
        raise e
    else:
        logger.info(f"Data load succeeded for table '{dbdao.schema_name}.{file.table_name}'!")


def read_csv(filepath, escapechar, header, delimiter, encoding, chunksize):
    i = 1
    if chunksize:
        for chunk in pd.read_csv(filepath, escapechar=escapechar, header=header, delimiter=delimiter, encoding=encoding, chunksize=chunksize, keep_default_na=False):
            yield i, chunk
            i += 1
    else:
        yield i, pd.read_csv(filepath)

# @task(log_prints=True,
#       task_run_name="format_vocab_synpuf_data_task-{table_name}")
def format_vocab_synpuf_data(dbdao, data: pd.DataFrame, table_name: str, logger) -> pd.DataFrame:
    match dbdao.dialect:
        case SupportedDatabaseDialects.POSTGRES:
            
            # convert all cols to string
            data = data.astype(str)
            
            # convert into ibis in-mem table
            logger.info(f"Registering '{table_name}' as in-memory ibis table..")
            t = ibis.memtable(data, name=table_name)
            
            if table_name in columns_to_drop.keys():
                t = t.drop(columns_to_drop.get(table_name))
            
            # rename columns to lower case
            renamed = t.rename({col.lower(): col for col in t.columns})
            
            # Todo: for some reason uses the old column names so need to transform back into df
            data = renamed.execute()

        case SupportedDatabaseDialects.HANA:
            if table_name in columns_to_drop.keys():
                data.drop(columns=columns_to_drop.get(table_name), inplace=True, axis=1)
                
            match table_name:
                case "concept_relationship" | "concept" | "drug_strength":
                    data["valid_start_date"] = pd.to_datetime(data["valid_start_date"].astype(str))
                    data["valid_end_date"] =  pd.to_datetime(data["valid_end_date"].astype(str))
                    if table_name == "drug_strength":
                        # Integer columns use pd.NA
                        data["amount_unit_concept_id"].replace('', pd.NA, inplace=True)
                        data["box_size"].replace('', pd.NA, inplace=True)
                        data["numerator_unit_concept_id"].replace('', pd.NA, inplace=True)
                        data["denominator_unit_concept_id"].replace('', pd.NA, inplace=True)
                        
                        # Float Columns use np.nan
                        data["amount_value"].replace('', np.nan, inplace=True)
                        data["numerator_value"].replace('', np.nan, inplace=True)
                        data["denominator_value"].replace('', np.nan, inplace=True)
                        
                        # Convert to integer
                        data["amount_unit_concept_id"] = pd.to_numeric(data["amount_unit_concept_id"], errors="coerce").astype('Int64')
                        data["box_size"] = pd.to_numeric(data["box_size"], errors="coerce").astype('Int64')
                        data["numerator_unit_concept_id"] = pd.to_numeric(data["numerator_unit_concept_id"], errors="coerce").astype('Int64')
                        data["denominator_unit_concept_id"] = pd.to_numeric(data["denominator_unit_concept_id"], errors="coerce").astype('Int64')
                        
                        # Convert to float
                        data["amount_value"] = pd.to_numeric(data["amount_value"], errors="coerce").astype('float64')
                        data["numerator_value"] = pd.to_numeric(data["numerator_value"], errors="coerce").astype('float64')
                        data["denominator_value"] = pd.to_numeric(data["denominator_value"], errors="coerce").astype('float64')

            data = data.replace("N/A", "N/A")
            data = data.rename(columns=str.lower)
    return data

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
        
        
columns_to_drop = {
    "location": ['COUNTRY_CONCEPT_ID', 'COUNTRY_SOURCE_VALUE', 'LATITUDE', 'LONGITUDE'],
    "care_site": ["LOCATION_ID"],
    "condition_occurrence": ['CONDITION_END_DATETIME', 'PROVIDER_ID', 'VISIT_DETAIL_ID'],
    "cost": ['TOTAL_CHARGE', 'TOTAL_COST', 'PAID_BY_PAYER', 'PAID_PATIENT_COPAY', 'PAID_PATIENT_DEDUCTIBLE', 'PAID_BY_PRIMARY', 'PAID_INGREDIENT_COST', 'PAID_DISPENSING_FEE', 'PAYER_PLAN_PERIOD_ID', 'AMOUNT_ALLOWED', 'REVENUE_CODE_CONCEPT_ID', 'REVENUE_CODE_SOURCE_VALUE', 'DRG_SOURCE_VALUE'],
    "death": ['CAUSE_CONCEPT_ID', 'DEATH_DATETIME'],
    "device_exposure": ['DEVICE_EXPOSURE_END_DATETIME', 'UNIQUE_DEVICE_ID', 'QUANTITY', 'PROVIDER_ID', 'VISIT_DETAIL_ID', 'UNIT_CONCEPT_ID', 'UNIT_SOURCE_VALUE', 'UNIT_SOURCE_CONCEPT_ID'],
    "drug_exposure": ['DRUG_EXPOSURE_END_DATETIME', 'VERBATIM_END_DATE', 'REFILLS', 'QUANTITY', 'DAYS_SUPPLY', 'ROUTE_CONCEPT_ID', 'LOT_NUMBER', 'PROVIDER_ID', 'VISIT_OCCURRENCE_ID', 'VISIT_DETAIL_ID', 'ROUTE_SOURCE_VALUE', 'DOSE_UNIT_SOURCE_VALUE'],
    "measurement": ['MEASUREMENT_DATETIME', 'MEASUREMENT_TIME', 'OPERATOR_CONCEPT_ID', 'VALUE_AS_NUMBER', 'UNIT_CONCEPT_ID', 'RANGE_LOW', 'RANGE_HIGH', 'PROVIDER_ID', 'VISIT_DETAIL_ID', 'MEASUREMENT_SOURCE_CONCEPT_ID', 'VALUE_SOURCE_VALUE', 'MEASUREMENT_EVENT_ID', 'MEAS_EVENT_FIELD_CONCEPT_ID', 'UNIT_SOURCE_CONCEPT_ID'],
    "observation": ['OBSERVATION_DATETIME', 'OBSERVATION_EVENT_ID', 'VALUE_AS_NUMBER', 'VALUE_AS_STRING', 'QUALIFIER_CONCEPT_ID', 'UNIT_CONCEPT_ID', 'PROVIDER_ID', 'VISIT_DETAIL_ID', 'UNIT_SOURCE_VALUE', 'QUALIFIER_SOURCE_VALUE', 'OBS_EVENT_FIELD_CONCEPT_ID'],
    "payer_plan_period": ['PAYER_CONCEPT_ID', 'PAYER_SOURCE_VALUE', 'PAYER_SOURCE_CONCEPT_ID', 'PLAN_CONCEPT_ID', 'PLAN_SOURCE_CONCEPT_ID', 'SPONSOR_CONCEPT_ID', 'SPONSOR_SOURCE_VALUE', 'SPONSOR_SOURCE_CONCEPT_ID', 'FAMILY_SOURCE_VALUE', 'STOP_REASON_CONCEPT_ID', 'STOP_REASON_SOURCE_VALUE', 'STOP_REASON_SOURCE_CONCEPT_ID'],
    "person": ['BIRTH_DATETIME', 'PROVIDER_ID', 'CARE_SITE_ID', 'GENDER_SOURCE_CONCEPT_ID', 'RACE_SOURCE_CONCEPT_ID', 'ETHNICITY_SOURCE_CONCEPT_ID'],
    "procedure_occurrence": ['PROCEDURE_END_DATE', 'PROCEDURE_END_DATETIME', 'MODIFIER_CONCEPT_ID', 'QUANTITY', 'PROVIDER_ID', 'VISIT_DETAIL_ID', 'MODIFIER_SOURCE_VALUE'],
    "provider": ['YEAR_OF_BIRTH', 'SPECIALTY_SOURCE_VALUE', 'GENDER_SOURCE_VALUE'],
    "visit_occurrence": ['VISIT_START_DATETIME', 'VISIT_END_DATETIME', 'PROVIDER_ID', 'CARE_SITE_ID', 'VISIT_SOURCE_CONCEPT_ID', 'PRECEDING_VISIT_OCCURRENCE_ID']
}