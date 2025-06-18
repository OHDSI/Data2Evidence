import duckdb
import os

from prefect import flow
from prefect.logging import get_run_logger

from .types import MimicOMOPOptionsType, FlowActionType
from .load_data import load_mimic_data, load_vocab
from .omop_conversion import staging_mimic_data, ETL_transformation, final_cdm_tables, export_data
from _shared_flow_utils.dao.DBDao import DBDao

@flow(log_prints=True, persist_result=True)
def mimic_omop_conversion_plugin(options:MimicOMOPOptionsType):
    logger = get_run_logger()
    logger.info("<--------- MIMIC-IV-to-OMOP conversion workflow --------->")
    match options.flow_action_type:
        case FlowActionType.MIMIC_TO_DATABASE:
            mimic_to_duckdb_flow(options)
            duckdb_to_database_flow(options)
            cleanup(options)
        case FlowActionType.MIMIC_TO_DUCKDB:    
            mimic_to_duckdb_flow(options)
        case FlowActionType.DUCKDB_TO_DATABASE:
            duckdb_to_database_flow(options)

def mimic_to_duckdb_flow(options:MimicOMOPOptionsType):
    logger = get_run_logger()
    logger.info("<--------- Loading MIMIC-IV data to DuckDB --------->")
    # Get options
    duckdb_file_name = options.duckdb_file_path
    mimic_dir = options.mimic_dir
    vocab_dir = options.vocab_dir
    load_mimic_vocab = options.load_mimic_vocab
    
    # Load data to duckdb
    if load_mimic_vocab:
        # every connection in duckdb will release the memory
        with duckdb.connect(duckdb_file_name) as conn:
            logger.info("*** Loading MIMICIV data and Vocabulories ***")
            load_mimic_data(conn, mimic_dir)
            load_vocab(conn, vocab_dir)
        with duckdb.connect(duckdb_file_name) as conn:
            staging_mimic_data(conn)
            conn.execute("DROP SCHEMA mimiciv_hosp CASCADE")
            conn.execute("DROP SCHEMA mimiciv_icu CASCADE")
            conn.execute("DROP SCHEMA mimic_staging CASCADE")
    # ETL process
    with duckdb.connect(duckdb_file_name) as conn:
        logger.info("*** Doing ETL transformations ***")
        ETL_transformation(conn)
        logger.info("*** Creating final CDM tables and copy data into them ***")
        final_cdm_tables(conn)
    # Cleanup schemas
    with duckdb.connect(duckdb_file_name) as conn:
        conn.execute("DROP SCHEMA mimic_etl CASCADE")
        # conn.execute("DROP SCHEMA cdm CASCADE")

def duckdb_to_database_flow(options:MimicOMOPOptionsType):
    logger = get_run_logger()
    logger.info("<--------- Exporting CDM tables to Database --------->")
    # Get options
    duckdb_file_name = options.duckdb_file_path
    schema_name = options.schema_name
    use_cache_db = options.use_cache_db
    database_code = options.database_code
    to_dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)
    overwrite_schema = options.overwrite_schema
    chunk_size = options.chunk_size
    # Export OMOP tables to Database
    logger.info("*** Exporting CDM tables to Database ***") 
    export_data(duckdb_file_name=duckdb_file_name, schema_name=schema_name, to_dbdao=to_dbdao, overwrite_schema=overwrite_schema, chunk_size=chunk_size)

def cleanup(options:MimicOMOPOptionsType):
    logger = get_run_logger()
    logger.info("<--------- Cleaning up DuckDB file --------->")
    # Get options
    duckdb_file_name = options.duckdb_file_path
    os.remove(duckdb_file_name)
    logger.info(f"File '{duckdb_file_name}' deleted successfully.")
    logger.info("<--------- Workflow complete --------->")