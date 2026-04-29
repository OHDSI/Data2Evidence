from prefect.logging import get_run_logger

from .types import OmopCDMPluginOptions
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.PortalServerAPI import PortalServerAPI
from _shared_flow_utils.update_dataset_metadata import (
    update_entity_value,
    update_entity_count,
    update_entity_count_distribution,
    update_total_entity_count,
    update_metadata_last_fetched_date,
)


def update_dataset_metadata_flow(options: OmopCDMPluginOptions):
    logger = get_run_logger()
    dataset_list = options.datasets
    use_cache_db = options.use_cache_db
    
    if (dataset_list is None) or (len(dataset_list) == 0):
        logger.info("No datasets fetched from portal")
    else:
        logger.info(f"Successfully fetched {len(dataset_list)} datasets from portal")

        for dataset in dataset_list:
            get_and_update_attributes(dataset, use_cache_db)

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
        try:
            dbdao = DBDao(
                use_cache_db=use_cache_db,
                database_code=database_code,
            )
        except Exception as e:
            logger.error(f"Failed to connect to database '{database_code}': {e}")
            return

        portal_server_api = PortalServerAPI()

        # Check schema existence
        if not dbdao.check_schema_exists(schema_name):
            error_msg = f"Schema '{schema_name}' does not exist in db {database_code}"
            logger.error(error_msg)

            portal_server_api.update_dataset_attributes_table(dataset_id, "schema_version", error_msg)
            portal_server_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", error_msg)
            return

        # created_date: cdm_source.cdm_release_date
        update_entity_value(
            portal_server_api=portal_server_api,
            dataset_id=dataset_id,
            dbdao=dbdao,
            schema_name=schema_name,
            table_name="cdm_source",
            column_name="cdm_release_date",
            entity_name="created_date",
            logger=logger,
        )

        # metadata_last_fetched_date
        update_metadata_last_fetched_date(
            portal_server_api=portal_server_api,
            dataset_id=dataset_id,
            logger=logger,
        )

        # patient_count: DISTINCT person_id
        update_entity_count(
            portal_server_api=portal_server_api,
            dataset_id=dataset_id,
            dbdao=dbdao,
            schema_name=schema_name,
            table_name="person",
            column_name="person_id",
            entity_name="patient_count",
            logger=logger,
            distinct_count=True,
        )

        # entity_count_distribution
        entity_dist = update_entity_count_distribution(
            portal_server_api=portal_server_api,
            dataset_id=dataset_id,
            dbdao=dbdao,
            schema_name=schema_name,
            logger=logger,
            distinct_count=True,
        )

        # total_entity_count
        update_total_entity_count(
            portal_server_api=portal_server_api,
            dataset_id=dataset_id,
            entity_count_distribution=entity_dist,
            logger=logger,
        )

        # OMOP version (cdm_version)
        cdm_version = update_entity_value(
                            portal_server_api=portal_server_api,
                            dataset_id=dataset_id,
                            dbdao=dbdao,
                            schema_name=schema_name,
                            table_name="cdm_source",
                            column_name="cdm_version",
                            entity_name="version",
                            logger=logger,
                        )

        schema_version = "Not Available"
        try:
            # Accept only OMOP 5.x or v5.x
            if cdm_version.lower().startswith("5.") or cdm_version.lower().startswith("v5."):
                schema_version = cdm_version

            portal_server_api.update_dataset_attributes_table(dataset_id, "schema_version", schema_version)
            portal_server_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", schema_version)
        except Exception as e:
            logger.error(f"Failed to update attribute 'cdm_version' for dataset '{dataset_id}' with value '{schema_version}': {e}")
        else:
            logger.info(f"Updated attribute 'cdm_version' for dataset '{dataset_id}' with value '{schema_version}'")
