import pandas as pd
from time import time
from datetime import datetime

from prefect import flow, task
from prefect.variables import Variable
from prefect.logging import get_run_logger

from flows.datamart_plugin.types import *
from flows.datamart_plugin.const import *
from flows.datamart_plugin.utils import *

from shared_utils.dao.DBDao import DBDao
from shared_utils.dao.MinioDao import MinioDao
from shared_utils.update_dataset_metadata import *
from shared_utils.types import SupportedDatabaseDialects
from shared_utils.api.PortalServerAPI import PortalServerAPI
from shared_utils.api.PrefectAPI import get_auth_token_from_input

from shared_utils.create_dataset_tasks import create_schema_task, create_and_assign_roles_task
from shared_utils.update_dataset_metadata import update_entity_value, update_entity_distinct_count

@flow(log_prints=True)
def datamart_plugin(options: CreateDatamartOptions):
    match options.flow_action_type:
        case DatamartFlowAction.CREATE_SNAPSHOT | DatamartFlowAction.CREATE_PARQUET_SNAPSHOT:
            create_datamart(options) 
        case DatamartFlowAction.GET_VERSION_INFO:
            update_dataset_metadata(options)   


def create_datamart(options: CreateDatamartOptions):
    logger = get_run_logger()

    database_code = options.database_code
    use_cache_db = options.use_cache_db
    datamart_action = options.flow_action_type
    snapshot_copy_config = options.snapshot_copy_config
    
    match options.dialect:
        case SupportedDatabaseDialects.HANA:
            source_schema = options.source_schema.upper() # schema to copy from
            target_schema = options.schema_name.upper() # schema to copy to
        case SupportedDatabaseDialects.POSTGRES:
            source_schema = options.source_schema.lower() # schema to copy from
            target_schema = options.schema_name.lower() # schema to copy to            
        case _:
            raise ValueError(f"Database dialect {options.dialect} not supported for this plugin")

    source_dbdao = DBDao(use_cache_db=use_cache_db,
                         database_code=database_code, 
                         schema_name=source_schema)
    
    target_dbdao = DBDao(use_cache_db=use_cache_db,
                         database_code=database_code, 
                         schema_name=target_schema)
    
    source_schema_exists = source_dbdao.check_schema_exists()
    if not source_schema_exists:
        raise ValueError(f"Source schema '{source_schema}' does not exist in database '{database_code}'")
    
    try:
        
        if datamart_action == DatamartFlowAction.CREATE_SNAPSHOT:
            create_schema_task(target_dbdao)
    
        
        _, failed_tables = copy_schema(datamart_action,
                                       snapshot_copy_config,
                                       source_dbdao,
                                       target_dbdao)

        if len(failed_tables) > 0:
            error_message = f"The following tables has failed datamart creation: {failed_tables}"
            logger.error(error_message)
            raise Exception(error_message)
        
    except Exception as err:
        error_message = f"Schema: {target_schema} created successful, but failed to load data with Error: {err}"
        logger.error(error_message)
        if datamart_action == DatamartFlowAction.CREATE_SNAPSHOT:
            logger.info(f"Cleaning up schema '{target_schema}'")
            target_dbdao.drop_schema()
            logger.info(f"Successfully dropped schema '{target_schema}'")
            raise Exception(error_message) from err
    else:
        logger.info(
            f"{target_schema} schema created and loaded from source schema: {source_schema} with configuration {snapshot_copy_config}")

        if datamart_action == DatamartFlowAction.CREATE_SNAPSHOT:
            try:
                logger.info(f"Granting read privileges to datamart schema '{target_dbdao.database_code}.{target_dbdao.schema_name}'..")                
                create_and_assign_roles_task(dbdao=target_dbdao)
                logger.info(f"Successfully granted read privileges to datamart schema '{target_dbdao.database_code}.{target_dbdao.schema_name}'!")
            except Exception as err:
                error_message = f"Failed to grant read privileges to datamart schema '{target_dbdao.database_code}.{target_dbdao.schema_name}'!"
                logger.error(error_message)
                logger.info(f"Cleaning up schema '{target_schema}'")
                target_dbdao.drop_schema()
                logger.info(f"Successfully dropped schema '{target_schema}'")
                raise Exception(error_message) from err


@task(log_prints=True)
def copy_schema(datamart_action: str,
                snapshot_copy_config: DatamartCopyConfig,
                source_dbdao,
                target_dbdao):
    logger = get_run_logger()
    date_filter, table_filter, patient_filter = parse_datamart_copy_config(snapshot_copy_config)
    tables_to_copy = get_tables_to_copy(source_dbdao, table_filter, logger)
    
    successful_tables: list[str] = []
    failed_tables: list[str] = []
    


    for table in tables_to_copy:
        # get the columns to copy for each table
        columns_to_copy = get_columns_to_copy(source_dbdao, table, table_filter)

        base_config_table = BASE_CONFIG_LIST.get(table, {})

        if source_dbdao.__class__.__name__ == "IbisDao" and datamart_action == DatamartFlowAction.CREATE_PARQUET_SNAPSHOT:
            filter_conditions = {}
        else:
            filter_conditions = []

        # Filter by patients if patient_filter and person_id_column is provided
        person_id_column = base_config_table.get("person_id_column", "")
        if len(patient_filter) > 0 and person_id_column:
            # Ibis implementation            
            if source_dbdao.__class__.__name__ == "IbisDao" and datamart_action == DatamartFlowAction.CREATE_PARQUET_SNAPSHOT:
                filter_conditions["patient_filter"] = {
                    "person_id_column": person_id_column,
                    "patients_to_filter": patient_filter
                }
            
            else:
                # SqlAlchemy implmentation
                person_id_column_obj = source_dbdao.get_sqlalchemy_columns(table_name=table, column_names=[person_id_column])
                filter_conditions.append(
                    person_id_column_obj.get(person_id_column).in_(patient_filter)
                )

        # Filter by timestamp if date_filter and timestamp_column is provided
        timestamp_column = base_config_table.get("timestamp_column", "")
        if date_filter and timestamp_column:
            # Ibis implementation
            if source_dbdao.__class__.__name__ == "IbisDao" and datamart_action == DatamartFlowAction.CREATE_PARQUET_SNAPSHOT:
                filter_conditions["date_filter"] = {
                    "timestamp_column": timestamp_column,
                    "dates_to_filter": date_filter
                }
            else:
                # SqlAlchemy implementation
                timestamp_column_obj = source_dbdao.get_sqlalchemy_columns(table_name=table, column_names=[timestamp_column])
                filter_conditions.append(
                    date_filter >= timestamp_column_obj.get(timestamp_column)
                )

        match datamart_action:
            case DatamartFlowAction.CREATE_SNAPSHOT:
                try:
                    # copy from source schema to target schema
                    rows_copied = source_dbdao.copy_table(source_table_name=table, 
                                                          target_table_name=table,
                                                          target_schema_name=target_dbdao.schema_name,
                                                          columns_to_copy=columns_to_copy,
                                                          filter_conditions=filter_conditions)
                except Exception as err:
                    logger.error(f"""Datamart copying failed from {source_dbdao.schema_name} to {
                        target_dbdao.schema_name} for table: {table} with Error:{err}""")
                    failed_tables.append(table)                    
                else:
                    logger.info(f"""Succesfully copied {rows_copied} rows from {
                        source_dbdao.schema_name} to {target_dbdao.schema_name} for table: {table}""")
                    successful_tables.append(table)
            case DatamartFlowAction.CREATE_PARQUET_SNAPSHOT:
                try:
                    datamart_df = source_dbdao.copy_table_as_dataframe(source_table_name=table, 
                                                                       columns_to_copy=columns_to_copy, 
                                                                       filter_conditions=filter_conditions)
                    upload_df_as_parquet(target_dbdao.schema_name, table, datamart_df, logger)
                except Exception as err:
                    logger.error(f"""Datamart parquet creation failed for {source_dbdao.schema_name} to {
                        target_dbdao.schema_name} for table: {table} with Error:{err}""")
                    failed_tables.append(table)
                else:
                    logger.info(f"""Succesfully created parquet file for {source_dbdao.schema_name} to {
                        target_dbdao.schema_name} for table: {table}""")
                    successful_tables.append(table)

                    
    logger.info(f"Successful Tables: {successful_tables}")
    logger.info(f"Failed Tables: {failed_tables}")
    return successful_tables, failed_tables


def upload_df_as_parquet(target_schema: str, table_name: str, df: pd.DataFrame, logger):
    alp_system_id = Variable.get("alp_system_id")
    if not alp_system_id:
        raise ValueError("'alp_system_id' prefect variable is undefined")

    bucket_name = f"parquetsnapshots-{alp_system_id}"
    file_name = f"{target_schema}-{table_name}-{int(time()*1000)}.parquet"

    minio_dao = MinioDao()
    try:  
        minio_dao.put_dataframe_as_parquet(bucket_name, file_name, df)
    except Exception as err:
        logger.error(
            f"""Datamart parquet uploading to object store failed at {bucket_name}/{file_name}""")
        raise err
    else:
        logger.info(f"""Succesfully uploaded parquet file at {
            bucket_name}/{file_name}""")


def update_dataset_metadata(options: CreateDatamartOptions):
    logger = get_run_logger()
    dataset_list = options.datasets
    use_cache_db = options.use_cache_db
    
    if (dataset_list is None) or (len(dataset_list) == 0):
        logger.info("No datasets fetched from portal")
    else:
        
        # Store token in cache
        get_auth_token_from_input()

        logger.info(f"Successfully fetched {len(dataset_list)} datasets from portal")
        for dataset in dataset_list:
            get_and_update_attributes(use_cache_db, dataset)


@task(log_prints=True)
def get_and_update_attributes(use_cache_db: bool, dataset: dict):
    logger = get_run_logger()
        
    try:
        dataset_id = dataset.get("id")
        database_code = dataset.get("databaseCode")
        schema_name = dataset.get("schemaName")
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
        if schema_exists is False:
            error_msg = f"Schema '{schema_name}' does not exist in db {database_code} for dataset id '{dataset_id}'"
            logger.error(error_msg)
            portal_server_api.update_dataset_attributes_table(dataset_id, "schema_version", error_msg)
            portal_server_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", error_msg)
        else:
            
            # update data model creation date with cdm_release_date or error msg
            update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                table_name="cdm_source",
                column_name="cdm_release_date",
                entity_name="created_date",
                logger=logger
            )
            
            # update last updated date with cdm_release_date or error msg
            update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                table_name="cdm_source",
                column_name="cdm_release_date",
                entity_name="updated_date",
                logger=logger
                )

            # update patient count or error msg
            update_entity_distinct_count(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                table_name="person",
                column_name="person_id",
                entity_name="patient_count",
                logger=logger
                )
            
            
            # update entity_count_distribution or error msg
            entity_count_distribution = update_entity_count_distribution(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                logger=logger
            )

            # update total_entity_count or error msg
            update_total_entity_count(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                entity_count_distribution=entity_count_distribution,
                logger=logger
            )

            # update cdm version or error msg
            cdm_version = update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                table_name="cdm_source",
                column_name="cdm_version",
                entity_name="version",
                logger=logger
                )

            try:
                # update schema version, latest_schema_version or error msg
                schema_version = get_schema_version(dbdao, cdm_version, logger)
                latest_schema_version = schema_version
                portal_server_api.update_dataset_attributes_table(dataset_id, "schema_version", schema_version)
                portal_server_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", latest_schema_version)
            except Exception as e:
                logger.error(f"Failed to update attribute 'schema_version', 'latest_schema_version' for dataset '{dataset_id}' with value '{schema_version}': {e}")
            else:
                logger.info(f"Updated attribute 'schema_version', 'latest_schema_version' for dataset '{dataset_id}' with value '{schema_version}'")


            update_metadata_last_fetched_date(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                logger=logger
            )