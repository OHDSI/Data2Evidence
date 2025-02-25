from prefect import flow, task
from prefect.logging import get_run_logger

from flows.data_management_plugin.types import *
from flows.data_management_plugin.dataset import *
from flows.data_management_plugin.versioninfo import *
from flows.data_management_plugin.const import get_db_dialect
from flows.data_management_plugin.types import DataModelType, FlowActionType

from shared_utils.create_dataset_tasks import get_plugin_classpath


@flow(log_prints=True, timeout_seconds=3600)
def data_management_plugin(options: DataModelType):
    logger = get_run_logger()

    match options.flow_action_type:
        case FlowActionType.CREATE_DATA_MODEL:
            create_datamodel_flow(options, logger)
        case FlowActionType.UPDATE_DATA_MODEL | FlowActionType.CHANGELOG_SYNC:
            update_datamodel_flow(options, logger)
        case FlowActionType.ROLLBACK_COUNT:
            rollback_count_flow(options, logger)
        case FlowActionType.ROLLBACK_TAG:
            rollback_tag_flow(options, logger)
        case FlowActionType.GET_VERSION_INFO:
            get_version_info_flow(options, logger)
        case FlowActionType.CREATE_CDMSCHEMA:
            create_cdm_schema(options, logger)
        case _:
            error_msg = f"Flow action type '{options.flow_action_type}' not supported, only '{[action.value for action in FlowActionType]}'"
            logger.error(error_msg)
            raise ValueError(error_msg)
            
            
def create_cdm_schema(options: CreateSchemaType, logger):
    db_dialect = get_db_dialect(options)
    try:
        create_cdm_schema_tasks(
            database_code=options.database_code,
            data_model=options.data_model,
            schema_name=options.schema_name,
            vocab_schema=options.vocab_schema,
            changelog_file=options.changelog_filepath_list.get(
                options.data_model),
            plugin_classpath=get_plugin_classpath(options.flow_name),
            dialect=db_dialect
        )
    except Exception as e:
        logger.error(e)
        raise (e)


def create_datamodel_flow(options: CreateDataModelType, logger):
    try:
        db_dialect = get_db_dialect(options)
        create_datamodel(
            database_code=options.database_code,
            data_model=options.data_model,
            schema_name=options.schema_name,
            vocab_schema=options.vocab_schema,
            changelog_file=options.changelog_filepath_list.get(
                options.data_model),
            count=options.update_count,
            cleansed_schema_option=options.cleansed_schema_option,
            plugin_classpath=get_plugin_classpath(options.flow_name),
            dialect=db_dialect
        )
    except Exception as e:
        logger.error(e)
        raise e


def update_datamodel_flow(options: UpdateDataModelType, logger):
    try:
        db_dialect = get_db_dialect(options)

        update_datamodel(
            flow_action_type=options.flow_action_type,
            database_code=options.database_code,
            data_model=options.data_model,
            schema_name=options.schema_name,
            vocab_schema=options.vocab_schema,
            changelog_file=options.changelog_filepath_list.get(
                options.data_model),
            plugin_classpath=get_plugin_classpath(options.flow_name),
            dialect=db_dialect
        )
    except Exception as e:
        logger.error(e)
        raise e


def get_version_info_flow(options: GetVersionInfoType, logger):
    try:
        get_version_info_tasks(
            changelog_filepath_list=options.changelog_filepath_list,
            plugin_classpath=get_plugin_classpath(options.flow_name),
            dataset_list=options.datasets,
            use_cache_db=options.use_cache_db,
        )
    except Exception as e:
        logger.error(e)
        raise e


def rollback_count_flow(options: RollbackCountType, logger):
    try:
        db_dialect = get_db_dialect(options)

        rollback_count_task(
            database_code=options.database_code,
            data_model=options.data_model,
            schema_name=options.schema_name,
            vocab_schema=options.vocab_schema,
            changelog_file=options.changelog_filepath_list.get(
                options.data_model),
            plugin_classpath=get_plugin_classpath(options.flow_name),
            dialect=db_dialect,
            rollback_count=options.rollback_count
        )
    except Exception as e:
        logger.error(e)
        raise e


def rollback_tag_flow(options: RollbackTagType, logger):
    try:
        db_dialect = get_db_dialect(options)

        rollback_tag_task(
            database_code=options.database_code,
            data_model=options.data_model,
            schema_name=options.schema_name,
            vocab_schema=options.vocab_schema,
            changelog_file=options.changelog_filepath_list.get(
                options.data_model),
            plugin_classpath=get_plugin_classpath(options.flow_name),
            dialect=db_dialect,
            rollback_tag=options.rollback_tag
        )
    except Exception as e:
        logger.error(e)
        raise e