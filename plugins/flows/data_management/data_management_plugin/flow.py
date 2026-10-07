from prefect import flow, task
from prefect.logging import get_run_logger

from .types import *
from .dataset import *
from .versioninfo import *
from .const import get_db_dialect
from .types import DataModelType, FlowActionType

import os
os.environ['plugin_name'] = 'data_management_plugin'

@flow(log_prints=True, timeout_seconds=3600)
def data_management_plugin(options: DataModelType):
    logger = get_run_logger()
    match options.flow_action_type:
        case FlowActionType.CREATE_DATA_MODEL:
            create_datamodel_flow(options, logger)
        case FlowActionType.UPDATE_DATA_MODEL | FlowActionType.CHANGELOG_SYNC:
            update_datamodel_flow(options, logger)
        case FlowActionType.GET_VERSION_INFO:
            get_version_info_flow(options, logger)
        case FlowActionType.CREATE_CDMSCHEMA:
            create_cdm_schema(options, logger)
        case _:
            error_msg = f"Flow action type '{options.flow_action_type}' not supported, only '{[action.value for action in FlowActionType]}'"
            logger.error(error_msg)
            raise ValueError(error_msg)


def create_cdm_schema(options: CreateSchemaType, logger):
    logger.info(f"Flow parameters received: {options.json()}")
    db_dialect = get_db_dialect(options)
    try:
        create_cdm_schema_tasks(
            database_code=options.database_code,
            data_model=options.data_model,
            schema_name=options.schema_name,
            vocab_schema=options.vocab_schema,
            dialect=db_dialect
        )
    except Exception as e:
        logger.error(e)
        raise (e)


def create_datamodel_flow(options: CreateDataModelType, logger):
    logger.info(f"Flow parameters received: {options.json()}")
    try:
        db_dialect = get_db_dialect(options)
        create_datamodel(
            database_code=options.database_code,
            data_model=options.data_model,
            schema_name=options.schema_name,
            vocab_schema=options.vocab_schema,
            count=options.update_count,
            dialect=db_dialect
        )
    except Exception as e:
        logger.error(e)
        raise e


def update_datamodel_flow(options: UpdateDataModelType, logger):
    logger.info(f"Flow parameters received: {options.json()}")
    try:
        db_dialect = get_db_dialect(options)

        update_datamodel(
            flow_action_type=options.flow_action_type,
            database_code=options.database_code,
            data_model=options.data_model,
            schema_name=options.schema_name,
            vocab_schema=options.vocab_schema,
            dialect=db_dialect
        )
    except Exception as e:
        logger.error(e)
        raise e


def get_version_info_flow(options: GetVersionInfoType, logger):
    try:
        get_version_info_tasks(
            dataset_list=options.datasets,
            cache_id=options.cache_id,
        )
    except Exception as e:
        logger.error(e)
        raise e
