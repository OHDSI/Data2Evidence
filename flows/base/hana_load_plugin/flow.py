import os

from functools import partial

from prefect import flow, get_run_logger

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.create_dataset_tasks import *

from .types import OmopCDMPluginOptions, FlowActionType, CDMVersion
from .constants import EXTRACT_DIR, ZIP_PATH

from .versioninfo import update_dataset_metadata_flow
from .load import download_eunomia, unzip_dataset, load_csvs_to_hana
from .create import create_cdm_tables, create_concept_recommended_table, insert_cdm_version

os.environ["plugin_name"] = "hana_load_plugin"


@flow(log_prints=True)
def hana_load_plugin(options: OmopCDMPluginOptions):
    match options.flow_action_type:
        case FlowActionType.CREATE_DATA_MODEL:
            create_datamodel(options)
        case FlowActionType.GET_VERSION_INFO:
            update_dataset_metadata_flow(options)
        case _:
            logger = get_run_logger()
            error_msg = f"Flow action type '{options.flow_action_type}' not supported, only '{[action.value for action in FlowActionType]}'"
            logger.error(error_msg)
            raise ValueError(error_msg)


def create_datamodel(options: OmopCDMPluginOptions):
    logger = get_run_logger()

    database_code = options.database_code
    use_cache_db = options.use_cache_db
    schema = options.schema_name.upper()
    results_schema = options.results_schema.upper()
    load_csvs = options.load_csvs
    data_model = options.data_model
    cdm_version = options.cdm_version

    dbdao = DBDao(use_cache_db=use_cache_db, database_code=database_code)

    logger.info(f"Creating OMOP CDM schema '{schema}' in database '{database_code}'..")
    create_schema_task(dbdao, schema)

    logger.info(f"Creating OMOP CDM {cdm_version} tables in schema '{schema}'..")
    create_datamodel_wo = create_cdm_tables.with_options(
        on_failure=[partial(
            drop_schema_hook, **dict(dbdao=dbdao, schema=schema)
        )]
    )

    create_datamodel_wo(schema, data_model, dbdao)

    logger.info(f"Creating 'concept_recommended' table in schema '{schema}'..")
    create_concept_recommended_table_wo = create_concept_recommended_table.with_options(
        on_failure=[partial(
            drop_schema_hook, **dict(dbdao=dbdao, schema=schema)
        )]
    )

    create_concept_recommended_table_wo(dbdao, schema)

    if not load_csvs or cdm_version != CDMVersion.OMOP53:
        logger.info(f"Insert CDM Version '{cdm_version}' record into 'cdm_source' table in schema '{schema}'..")
        insert_cdm_version_wo = insert_cdm_version.with_options(
            on_failure=[partial(
                drop_schema_hook, **dict(dbdao=dbdao, schema=schema)
            )]
        ) 

        insert_cdm_version_wo(cdm_version, dbdao, schema)        

    # Create results schema
    logger.info(f"Creating results schema '{results_schema}' in database '{database_code}'..")
    create_schema_task(dbdao, results_schema)

    logger.info(f"Creating results tables in schema '{results_schema}'..")
    create_results_tables = create_results_tables_parent_task.with_options(
        on_failure=[partial(
            drop_schema_hook, **dict(dbdao=dbdao, schema=results_schema)
        )]
    )

    create_results_tables(dbdao, results_schema)

    if load_csvs and cdm_version == CDMVersion.OMOP53:
        logger.info(f"Loading CSVs into OMOP CDM schema '{schema}'..")
        # Extract dataset if folder missing or empty
        
        if not (EXTRACT_DIR.exists() and any(EXTRACT_DIR.iterdir())):
            # Download dataset if zip is missing
            if not ZIP_PATH.exists():
                zip_path = download_eunomia()
                folder = unzip_dataset(zip_path)
            else:
                logger.info("Zip already exists, skipping download.")
                folder = unzip_dataset(ZIP_PATH)
        else:
            logger.info("Extracted folder already exists, skipping unzip.")
            folder = EXTRACT_DIR

        load_csvs_to_hana(folder, schema, dbdao)
    else:
        if load_csvs and cdm_version == CDMVersion.OMOP54:
            logger.warning(f"CSV loading is not supported for CDM version '{CDMVersion.OMOP54}', skipping CSV loading.")
        else:
            logger.info("Skipping CSV loading as per configuration.")