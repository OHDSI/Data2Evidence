from functools import partial
from datetime import datetime

from prefect import task
from prefect.logging import get_run_logger

from .hooks import *
from .const import *
from .liquibase import Liquibase, LiquibaseAction
from .types import FlowActionType

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.create_dataset_tasks import *
from _shared_flow_utils.types import DBCredentialsType

def create_datamodel(database_code: str,
                     data_model: str,
                     schema_name: str,
                     vocab_schema: str,
                     changelog_file: str,
                     plugin_classpath: str,
                     dialect: str,
                     count: int = 0,
                     cleansed_schema_option: bool = False):

    dbdao = DBDao(use_cache_db=False, database_code=database_code)
    tenant_configs = dbdao.tenant_configs

    task_status = create_schema_tasks(
        dialect=dialect,
        database_code=database_code,
        data_model=data_model,
        changelog_file=changelog_file,
        schema_name=schema_name,
        vocab_schema=vocab_schema,
        tenant_configs=tenant_configs,
        plugin_classpath=plugin_classpath,
        count=count
    )

    if task_status and cleansed_schema_option:
        cleansed_schema_name = schema_name + "_cleansed"
        cleansed_task_status = create_schema_tasks(
            dialect=dialect,
            database_code=database_code,
            data_model=data_model,
            changelog_file=changelog_file,
            schema_name=cleansed_schema_name,
            vocab_schema=vocab_schema,
            tenant_configs=tenant_configs,
            plugin_classpath=plugin_classpath,
            count=count
        )


def create_schema_tasks(dialect: str,
                        database_code: str,
                        data_model: str,
                        changelog_file: str,
                        schema_name: str,
                        vocab_schema: str,
                        tenant_configs: DBCredentialsType,
                        plugin_classpath: str,
                        count: int) -> bool:
    try:
        schema_dao = DBDao(database_code=database_code, use_cache_db=False)
        
        create_db_schema_wo = create_schema_task.with_options(
            on_completion=[partial(create_dataset_schema_hook,
                                   **dict(schema_dao=schema_dao))],
            on_failure=[partial(create_dataset_schema_hook,
                                **dict(schema_dao=schema_dao))])

        # create schema if not exists
        create_db_schema_wo(schema_dao, schema_name)
        if count == 0 or count is None:
            action = LiquibaseAction.UPDATE
        elif count > 0:
            action = LiquibaseAction.UPDATECOUNT

        create_tables_wo = run_liquibase_update_task.with_options(
            on_failure=[partial(drop_schema_hook,
                                **dict(dbdao=schema_dao, schema=schema_name))])

        create_tables_wo(action=action,
                         dialect=dialect,
                         data_model=data_model,
                         changelog_file=changelog_file,
                         schema_name=schema_name,
                         vocab_schema=vocab_schema,
                         tenant_configs=tenant_configs,
                         plugin_classpath=plugin_classpath,
                         count=count
                         )

        # task
        enable_audit_policies_wo = enable_and_create_audit_policies_task.with_options(
            on_failure=[partial(drop_schema_hook, **dict(dbdao=schema_dao, schema=schema_name))])
        
        enable_audit_policies_wo(schema_dao, schema_name)

        # task
        create_and_assign_roles_wo = create_and_assign_roles_task.with_options(
            on_failure=[partial(drop_schema_hook, **dict(dbdao=schema_dao, schema=schema_name))])
        
        create_and_assign_roles_wo(schema_dao, schema_name)

        if data_model in OMOP_DATA_MODELS:
            cdm_version = DATAMODEL_CDM_VERSION.get(data_model)
            insert_cdm_version_wo = insert_cdm_version.with_options(
                on_completion=[partial(update_cdm_version_hook,
                                       **dict(db=database_code, schema=schema_name))],
                on_failure=[partial(update_cdm_version_hook,
                                    **dict(db=database_code, schema=schema_name))])

            insert_cdm_version_wo(schema_dao, schema_name, cdm_version)
        print("Dataset schema successfully created and privileges assigned!")
        return True
    except Exception as e:
        print(f"Dataset schema creation failed! Error: {e}")
        raise e


def update_datamodel(flow_action_type: str,
                     database_code: str,
                     data_model: str,
                     schema_name: str,
                     vocab_schema: str,
                     changelog_file: str,
                     plugin_classpath: str,
                     dialect: str):

    logger = get_run_logger()
    
    schema_dao = DBDao(use_cache_db=False, database_code=database_code)
    tenant_configs = schema_dao.tenant_configs

    
    match flow_action_type:
        case FlowActionType.UPDATE_DATA_MODEL:
            action = LiquibaseAction.UPDATE
        case FlowActionType.CHANGELOG_SYNC:
            action = LiquibaseAction.CHANGELOG_SYNC

    try:
        update_schema_wo = run_liquibase_update_task.with_options(
            on_completion=[partial(update_schema_hook,
                                   **dict(db=database_code, schema=schema_name))],
            on_failure=[partial(update_schema_hook,
                                **dict(db=database_code, schema=schema_name))])

        update_schema_wo(action=action,
                         dialect=dialect,
                         data_model=data_model,
                         changelog_file=changelog_file,
                         schema_name=schema_name,
                         vocab_schema=vocab_schema,
                         tenant_configs=tenant_configs,
                         plugin_classpath=plugin_classpath
                         )

        if data_model in OMOP_DATA_MODELS:
            cdm_version = DATAMODEL_CDM_VERSION.get(data_model)
            
            # check if cdm source table is empty
            cdm_source_row_count = schema_dao.get_table_row_count(schema_name, "cdm_source")
            if cdm_source_row_count == 0:
                # insert cdm version
                insert_cdm_version(schema_dao, schema_name, cdm_version) 
            else:
                # update cdm version
                update_cdm_version_wo = update_cdm_version.with_options(
                    on_completion=[partial(update_cdm_version_hook,
                                        **dict(db=database_code, schema=schema_name))],
                    on_failure=[partial(update_cdm_version_hook,
                                        **dict(db=database_code, schema=schema_name))])
                update_cdm_version_wo(schema_dao, cdm_version)
        logger.info(
            "Dataset schema successfully updated!")
    except Exception as e:
        logger.error(f"Dataset schema update failed! Error: {e}")
        raise e


def rollback_count_task(use_cache_db: bool,
                        database_code: str,
                        data_model: str,
                        schema_name: str,
                        vocab_schema: str,
                        changelog_file: str,
                        plugin_classpath: str,
                        dialect: str,
                        rollback_count: int):

    dbdao = DBDao(use_cache_db=use_cache_db, 
                  database_code=database_code)
    tenant_configs = dbdao.tenant_configs

    try:
        rollback_count_wo = run_liquibase_update_task.with_options(
            on_completion=[partial(rollback_count_hook,
                                   **dict(db=database_code, schema=schema_name))],
            on_failure=[partial(rollback_count_hook,
                                **dict(db=database_code, schema=schema_name))])
        rollback_count_wo(action=LiquibaseAction.ROLLBACK_COUNT,
                          dialect=dialect,
                          data_model=data_model,
                          changelog_file=changelog_file,
                          schema_name=schema_name,
                          vocab_schema=vocab_schema,
                          tenant_configs=tenant_configs,
                          plugin_classpath=plugin_classpath,
                          rollback_count=rollback_count
                          )

    except Exception as e:
        print(e)
        raise e



def rollback_tag_task(use_cache_db: bool,
                      database_code: str,
                      data_model: str,
                      schema_name: str,
                      vocab_schema: str,
                      changelog_file: str,
                      plugin_classpath: str,
                      dialect: str,
                      rollback_tag: str):

    dbdao = DBDao(use_cache_db=use_cache_db, 
                  database_code=database_code)
    tenant_configs = dbdao.tenant_configs


    try:
        rollback_tag_wo = run_liquibase_update_task.with_options(
            on_completion=[partial(rollback_tag_hook,
                                   **dict(db=database_code, schema=schema_name))],
            on_failure=[partial(rollback_tag_hook,
                                **dict(db=database_code, schema=schema_name))])
        rollback_tag_wo(action=LiquibaseAction.ROLLBACK_TAG,
                        dialect=dialect,
                        data_model=data_model,
                        changelog_file=changelog_file,
                        schema_name=schema_name,
                        vocab_schema=vocab_schema,
                        tenant_configs=tenant_configs,
                        plugin_classpath=plugin_classpath,
                        rollback_tag=rollback_tag
                        )

    except Exception as e:
        print(e)
        raise e


@task(log_prints=True)
def insert_cdm_version(schema_dao: DBDao, schema_name: str, cdm_version: str):
    #Todo: make cdm_holder value more generic
    get_run_logger().info(f"Inserting cdm version '{cdm_version}' into '{schema_name}.cdm_source' table..")
    is_lower_case = check_table_case(schema_dao, schema_name)
    if is_lower_case:
        values_to_insert = {
            "cdm_source_name": schema_name,
            "cdm_source_abbreviation": schema_name[0:25],
            "cdm_holder": "D4L",
            "source_release_date": datetime.now(),
            "cdm_release_date": datetime.now(),
            "cdm_version": cdm_version
        }
        schema_dao.insert_values_into_table(schema_name, "cdm_source", values_to_insert)
    else:
        # for hana & pg schemas before conversion to lower case
        values_to_insert = {
            "CDM_SOURCE_NAME": schema_name,
            "CDM_SOURCE_ABBREVIATION": schema_name[0:25],
            "CDM_HOLDER": "D4L",
            "SOURCE_RELEASE_DATE": datetime.now(),
            "CDM_RELEASE_DATE": datetime.now(),
            "CDM_VERSION": cdm_version
        }
        schema_dao.insert_values_into_table(schema_name, "CDM_SOURCE", values_to_insert)
    get_run_logger().info(f"Successfully inserted cdm version '{cdm_version}' into '{schema_name}.cdm_source' table..")

@task(log_prints=True)
def update_cdm_version(schema_dao: DBDao, schema_name, cdm_version: str):
    get_run_logger().info(f"Updating cdm version '{cdm_version}' for '{schema_name}.cdm_source' table..")
    schema_dao.update_cdm_version(schema_name, cdm_version)
    get_run_logger().info(f"Successfully updated cdm version '{cdm_version}' for '{schema_name}.cdm_source' table..")

def create_cdm_schema_tasks(database_code: str,
                            data_model: str,
                            schema_name: str,
                            vocab_schema: str,
                            changelog_file: str,
                            plugin_classpath: str,
                            dialect: str):
    logger = get_run_logger()
    
    dbdao = DBDao(use_cache_db=False,
                  database_code=database_code)
    
    vocab_schema_exists = dbdao.check_schema_exists(vocab_schema)
    
    if (vocab_schema_exists == False):
        try:
            # create vocab schema
            create_datamodel(database_code=database_code,
                             data_model=data_model,
                             schema_name=vocab_schema,
                             vocab_schema=vocab_schema,
                             changelog_file=changelog_file,
                             plugin_classpath=plugin_classpath,
                             dialect=dialect)
        except Exception as e:
            logger.error(
                f"Failed to create schema {vocab_schema} in db with code:{database_code}: {e}")
            return False

    if (schema_name != vocab_schema):
        cdm_schema_exists = dbdao.check_schema_exists(schema_name)
        if (cdm_schema_exists == False):
            try:
                # create cdm schema
                create_datamodel(database_code=database_code,
                                 data_model=data_model,
                                 schema_name=schema_name,
                                 vocab_schema=vocab_schema,
                                 changelog_file=changelog_file,
                                 plugin_classpath=plugin_classpath,
                                 dialect=dialect)
            except Exception as e:
                logger.error(
                    f"Failed to create schema {schema_name} in db with code:{database_code}: {e}")
                return False

@task(log_prints=True)
def run_liquibase_update_task(**kwargs):
    liquibase = Liquibase(**kwargs)
    liquibase.update_schema()