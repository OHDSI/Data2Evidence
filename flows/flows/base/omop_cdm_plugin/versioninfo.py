from prefect import task
from prefect.logging import get_run_logger

from shared_utils.update_dataset_metadata import *
from shared_utils.api.PortalServerAPI import PortalServerAPI
from shared_utils.api.PrefectAPI import get_auth_token_from_input

from flows.omop_cdm_plugin.types import OmopCDMPluginOptions, RELEASE_VERSION_MAPPING


def update_dataset_metadata_flow(options: OmopCDMPluginOptions):
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
def get_and_update_attributes(dataset: dict, use_cache_db: bool):
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
            
            
            # update last created_date with cdm_release_date or error msg
            update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                table_name="cdm_source",
                column_name="cdm_release_date",
                entity_name="created_date",
                logger=logger
                )
            
            # update updated_date with cdm_release_date or error msg
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
                # update schema version or error msg
                if cdm_version[0] in ["v", "V"]: # for cdm version with a prefix 'V'
                    schema_version = cdm_version
                else:
                    schema_version = RELEASE_VERSION_MAPPING.get(cdm_version)
                portal_server_api.update_dataset_attributes_table(dataset_id, "schema_version", schema_version)
            except Exception as e:
                logger.error(f"Failed to update attribute 'schema_version' for dataset '{dataset_id}' with value '{schema_version}': {e}")
            else:
                logger.info(f"Updated attribute 'schema_version' for dataset '{dataset_id}' with value '{schema_version}'")


            try:
                # update latest schema version or error msg
                if cdm_version[0] in ["v", "V"]: # for broadsea atlas i.e. v5.3.1
                    latest_schema_version = cdm_version
                else:
                    latest_schema_version = RELEASE_VERSION_MAPPING.get("5.4")
                portal_server_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", latest_schema_version)
            except Exception as e:
                logger.error(f"Failed to update attribute 'latest_schema_version' for dataset '{dataset_id}' with value '{latest_schema_version}': {e}")
            else:
                logger.info(f"Updated attribute 'latest_schema_version' for dataset '{dataset_id}' with value '{latest_schema_version}'")


            update_metadata_last_fetched_date(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                logger=logger
            )