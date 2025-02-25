from __future__ import annotations

import os

from functools import partial
from datetime import datetime
from typing import TYPE_CHECKING
from sqlalchemy import String, TIMESTAMP

from prefect import flow, task
from prefect_shell import ShellOperation
from prefect.logging import get_run_logger

from flows.i2b2_plugin.types import *
from flows.i2b2_plugin.utils import *

from shared_utils.dao.DBDao import DBDao
from shared_utils.update_dataset_metadata import *
from shared_utils.api.PortalServerAPI import PortalServerAPI
from shared_utils.api.PrefectAPI import get_auth_token_from_input
from shared_utils.create_dataset_tasks import (create_schema_task, 
                                               create_and_assign_roles_task, 
                                               drop_schema_hook)


if TYPE_CHECKING:
    from shared_utils.dao.daobase import DaoBase


@flow(log_prints=True)
def i2b2_plugin(options: i2b2PluginType):
    match options.flow_action_type:
        case FlowActionType.CREATE_DATA_MODEL:
            create_i2b2_dataset_flow(options)
        case FlowActionType.GET_VERSION_INFO:
            update_dataset_metadata_flow(options)


def create_i2b2_dataset_flow(options: i2b2PluginType):
    database_code = options.database_code
    schema_name = options.schema_name
    use_cache_db = options.use_cache_db

    dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code=database_code, 
                  schema_name=schema_name)
    
    # Create schema if there is no existing schema first
    create_schema_task(dbdao)
    
    # Parent task with hook to drop schema on failure
    setup_and_create_datamodel_wo = setup_and_create_datamodel.with_options(
        on_failure=[partial(
            drop_schema_hook, **dict(dbdao=dbdao)
        )]
    )
    setup_and_create_datamodel_wo(tag_name=options.tag_name,
                                  data_model=options.data_model,
                                  dbdao=dbdao,
                                  load_demo_data=options.load_demo_data
                                  )


@task(log_prints=True, timeout_seconds=1800)
def setup_and_create_datamodel(tag_name: str,
                               data_model: str, 
                               dbdao: DBDao,
                               load_demo_data):
    logger = get_run_logger()
    setup_plugin(tag_name, dbdao, logger)
    version = get_version_from_tag(tag_name)
    create_crc_tables_and_procedures(version, dbdao, logger)
    create_metadata_table(dbdao, tag_name, data_model[1:], logger)
    create_and_assign_roles_task(dbdao)
    if load_demo_data:
        load_demo_i2b2_data(dbdao, logger)


def update_dataset_metadata_flow(options: i2b2PluginType):
    logger = get_run_logger()
    dataset_list = options.datasets
    use_cache_db = options.use_cache_db

    if (dataset_list is None) or (len(dataset_list) == 0):
        logger.info("No datasets fetched from portal")
    else:
        logger.info(f"Successfully fetched {len(dataset_list)} datasets from portal")

        # Store token in cache
        get_auth_token_from_input()
        
        for dataset in dataset_list:
            get_and_update_attributes(dataset, use_cache_db)


@task(log_prints=True)
def setup_plugin(tag_name: str, dbdao: DBDao, logger):
    '''
    Download i2b2 source code and overwrite db.properties file
    '''
    repo_dir = "flows/i2b2_plugin/i2b2_data"
    path = os.path.join(os.getcwd(), repo_dir)
    
    os.makedirs(f"{path}", 0o777, True)
    os.chdir(f"{path}")
    
    try:
        logger.info(f"Ovewriting db.properties..")
        new_install_dir = f"{path_to_ant(tag_name)}/NewInstall/Crcdata"
        os.chdir(f"{new_install_dir}")
        
        database_name = dbdao.tenant_configs.databaseName
        pg_user = dbdao.tenant_configs.adminUser
        pg_password = dbdao.tenant_configs.adminPassword.get_secret_value()
        host = dbdao.tenant_configs.host
        port = dbdao.tenant_configs.port
        
        with open('db.properties', 'w') as file:
            file.write(f'''
                    db.type=postgresql
                    db.username={pg_user}
                    db.password={pg_password}
                    db.driver=org.postgresql.Driver
                    db.url=jdbc:postgresql://{host}:{port}/{database_name}?currentSchema={dbdao.schema_name}
                    db.project=demo
                       ''')
    except Exception as e:
        logger.error(e)
        raise(e)


@task(log_prints=True)
def create_crc_tables_and_procedures(version: str, dbdao: DBDao, logger):
    '''
    Runs apache ant commands to create i2b2 tables and stored procedures
    '''
    ShellOperation(
        commands=[
            f"ant -f data_build.xml create_crcdata_tables_release_{version}"
        ]).run()
    
    check_table_creation(dbdao)
    
    ShellOperation(
        commands=[
            f"ant -f data_build.xml create_procedures_release_{version}"
        ]).run()


@task(log_prints=True)
def load_demo_i2b2_data(dbdao: DBDao, logger):
    logger.info("Loading demo i2b2 data..")
    ShellOperation(
        commands = [
            "ant -f data_build.xml db_demodata_load_data"
        ]
    ).run()
    logger.info("Successfully loaded demo i2b2 data!")
    dbdao.update_data_ingestion_date()


@task(log_prints=True)
def create_metadata_table(dbdao: DBDao, tag_name: str, version: str, logger):
    columns_to_create = {
            "schema_name": String,
            "created_date": TIMESTAMP,
            "updated_date": TIMESTAMP,
            "data_ingestion_date": TIMESTAMP,
            "tag": String,
            "release_version": String
        }
    dbdao.create_table('dataset_metadata', columns_to_create)
    values_to_insert = {
        "schema_name": dbdao.schema_name,
        "created_date": datetime.now(),
        "updated_date": datetime.now(),
        "tag": tag_name,
        "release_version": version
    }
    dbdao.insert_values_into_table('dataset_metadata', values_to_insert)
        

@task(log_prints=True)
def get_and_update_attributes(dataset: dict, use_cache_db: bool):
    logger = get_run_logger()
    
    try:
        dataset_id = dataset.get("id")
        database_code = dataset.get("databaseCode")
        schema_name = dataset.get("schemaName")
        data_model = dataset.get("dataModel").split(" ")[0]
    except KeyError as ke:
        missing_key = ke.args[0]
        logger.error(f"'{missing_key} not found in dataset'")
    else:
        dbdao = DBDao(use_cache_db=use_cache_db,
                      database_code=database_code, 
                      schema_name=schema_name)
        portal_server_api = PortalServerAPI()
        
        # check if schema exists
        schema_exists = dbdao.check_schema_exists()
        if schema_exists == False:
            error_msg = f"Schema '{schema_name}' does not exist in db {database_code} for dataset id '{dataset_id}'"
            logger.error(error_msg)
            portal_server_api.update_dataset_attributes_table(dataset_id, "schema_version", error_msg)
            portal_server_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", error_msg)
        else:
            # update patient count or error msg
            update_entity_distinct_count(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                table_name="patient_dimension",
                column_name="patient_num",
                entity_name="patient_count",
                logger=logger
                )                
                
            try:
                # update release version or error msg
                release_version = data_model[1:]
                portal_server_api.update_dataset_attributes_table(dataset_id, "version", release_version)
            except Exception as e:
                logger.error(f"Failed to update attribute 'version' for dataset '{dataset_id}' with value '{release_version}': {e}")
            else:
                logger.info(f"Updated attribute 'version' for dataset '{dataset_id}' with value '{release_version}'")

            try:
                # update release tag or error msg
                tag = RELEASE_TAG_MAPPING.get(data_model)
                portal_server_api.update_dataset_attributes_table(dataset_id, "schema_version", tag)
                portal_server_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", tag)
            except Exception as e:
                logger.error(f"Failed to update attribute 'schema_version', 'latest_schema_version' for dataset '{dataset_id}' with value '{tag}': {e}")
            else:
                logger.info(f"Updated attribute 'schema_version', 'latest_schema_version' for dataset '{dataset_id}' with value '{tag}'")

            # update created_date or error msg
            update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                table_name="dataset_metadata",
                column_name="created_date",
                entity_name="created_date",
                logger=logger
                )
                
            # update updated_date or error msg
            update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                table_name="dataset_metadata",
                column_name="updated_date",
                entity_name="updated_date",
                logger=logger
                )
            
            # update data_ingestion_date or error msg
            update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                table_name="dataset_metadata",
                column_name="data_ingestion_date",
                entity_name="data_ingestion_date",
                logger=logger
                )

            # update last fetched metadata date or error msg
            update_metadata_last_fetched_date(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                logger=logger
            )