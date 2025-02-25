
from functools import partial

from prefect import flow

from flows.omop_cdm_plugin.types import *
from flows.omop_cdm_plugin.update import update_omop_cdm_dataset_flow
from flows.omop_cdm_plugin.versioninfo import update_dataset_metadata_flow
from flows.omop_cdm_plugin.create import create_datamodel_parent_task

from shared_utils.dao.DBDao import DBDao
from shared_utils.create_dataset_tasks import *



@flow(log_prints=True)
def omop_cdm_plugin(options: OmopCDMPluginOptions):
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
    database_code = options.database_code
    schema_name = options.schema_name
    use_cache_db = options.use_cache_db

    omop_cdm_dao = DBDao(use_cache_db=use_cache_db,
                         database_code=database_code, 
                         schema_name=schema_name)
    
    # Create schema if there is no existing schema first
    create_schema_task(omop_cdm_dao)

    # Parent task with hook to drop schema on failure
    create_datamodel_wo = create_datamodel_parent_task.with_options(
        on_failure=[partial(
            drop_schema_hook, **dict(dbdao=omop_cdm_dao)
        )]
    )
    create_datamodel_wo(cdm_version=options.cdm_version, 
                        schema_dao=omop_cdm_dao,
                        vocab_schema=options.vocab_schema
                        )


def create_seed_schemas_flow(options: OmopCDMPluginOptions):
    create_vocab_schema(options)
    create_dataset_schema(options)


def create_vocab_schema(options: OmopCDMPluginOptions):
    new_options = update_parameters(options, "schema_name", options.vocab_schema)
    create_omop_cdm_dataset_flow(options=new_options)

 
def create_dataset_schema(options: OmopCDMPluginOptions):
    new_options = update_parameters(options, "vocab_schema", options.schema_name)
    create_omop_cdm_dataset_flow(options=new_options)


def update_parameters(options: OmopCDMPluginOptions, 
                      field: str, new_value: str) -> OmopCDMPluginOptions:
    # Create a copy of the model with the updated field
    return options.model_copy(update={field: new_value})
    
