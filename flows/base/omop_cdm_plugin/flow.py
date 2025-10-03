
from functools import partial

from prefect import flow

from .types import *
from .update import update_omop_cdm_dataset_flow
from .versioninfo import update_dataset_metadata_flow
from .create import create_datamodel_parent_task

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.create_dataset_tasks import *

from flows.create_cachedb_file_plugin.flow import create_cache_flow
from flows.create_cachedb_file_plugin.types import CreateCacheOptions, CacheFlowAction

import os
import time
os.environ['plugin_name'] = 'omop_cdm_plugin'


@flow(log_prints=True)
def omop_cdm_plugin(options: OmopCDMPluginOptions):
    logger = get_run_logger()
    match options.flow_action_type:
        case FlowActionType.CREATE_DATA_MODEL:
            create_omop_cdm_dataset_flow(options)
        case FlowActionType.GET_VERSION_INFO:
            update_dataset_metadata_flow(options)
        case FlowActionType.UPDATE_DATA_MODEL:
            update_omop_cdm_dataset_flow(options)
        case FlowActionType.CREATE_SEED_SCHEMAS:
            create_seed_schemas_flow(options)
        case _:
            error_msg = f"Flow action type '{options.flow_action_type}' not supported, only '{[action.value for action in FlowActionType]}'"
            logger.error(error_msg)
            raise ValueError(error_msg)


def create_omop_cdm_dataset_flow(options: OmopCDMPluginOptions):
    logger = get_run_logger()
    database_code = options.database_code
    schema_name = options.schema_name
    use_cache_db = options.use_cache_db

    omop_cdm_dao = DBDao(use_cache_db=use_cache_db,
                         database_code=database_code)

    # Create schema if there is no existing schema first
    create_schema_task(omop_cdm_dao, schema_name)

    # Parent task with hook to drop schema on failure
    create_datamodel_wo = create_datamodel_parent_task.with_options(
        on_failure=[partial(
            drop_schema_hook, **dict(dbdao=omop_cdm_dao, schema=schema_name)
        )]
    )
    create_datamodel_wo(cdm_version=options.cdm_version,
                        schema_dao=omop_cdm_dao,
                        cdm_schema=schema_name,
                        vocab_schema=options.vocab_schema
                        )

    # TODO
    # run data_load_plugin for the source schema
    # maybe i no need load the data
    # cannot run data load here unless i call job plugins endpoint

    if options.cache_schema_name:
        logger.info(f"Creating cache schema {options.cache_schema_name}")
        time.sleep(180)  # wait for schema to be created
        createCacheOptions = CreateCacheOptions(
            flowActionType=CacheFlowAction.CREATE_DATAMART_CACHE,
            databaseCode=options.database_code,
            schemaName=options.cache_schema_name,
            snapshotSchemaName=options.cache_schema_name
        )
        logger.info(f"Creating result schema {options.cache_schema_name}")
        create_cache_flow(createCacheOptions)


def create_seed_schemas_flow(options: OmopCDMPluginOptions):
    create_vocab_schema(options)
    create_dataset_schema(options)


def create_vocab_schema(options: OmopCDMPluginOptions):
    new_options = update_parameters(
        options, "schema_name", options.vocab_schema)
    create_omop_cdm_dataset_flow(options=new_options)


def create_dataset_schema(options: OmopCDMPluginOptions):
    new_options = update_parameters(
        options, "vocab_schema", options.schema_name)
    create_omop_cdm_dataset_flow(options=new_options)


def update_parameters(options: OmopCDMPluginOptions,
                      field: str, new_value: str) -> OmopCDMPluginOptions:
    # Create a copy of the model with the updated field
    return options.model_copy(update={field: new_value})
