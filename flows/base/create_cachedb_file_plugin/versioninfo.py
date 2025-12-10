from prefect import task
from prefect.logging import get_run_logger

from .types import CreateCacheOptions

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.types import SupportedDatabaseDialects
from _shared_flow_utils.api.PortalServerAPI import PortalServerAPI
from _shared_flow_utils.update_dataset_metadata import (
    update_entity_value,
    update_entity_count,
    update_entity_count_distribution,
    update_metadata_last_fetched_date,
    update_total_entity_count)

@task(log_prints=True)
def update_dataset_metadata(options: CreateCacheOptions):
    logger = get_run_logger()

    if not options.datasets:
        logger.info("No datasets fetched from portal")
    else:
        logger.info(
            f"Successfully fetched {len(options.datasets)} datasets from portal"
        )
        for dataset in options.datasets:
            get_and_update_attributes(options, dataset)


@task(log_prints=True)
def get_and_update_attributes(options: CreateCacheOptions, dataset: dict):
    logger = get_run_logger()

    try:
        dataset_id = dataset.get("id")
        database_code = dataset.get("databaseCode")
        schema_name = dataset.get("schemaName")
    except KeyError as ke:
        missing_key = ke.args[0]
        logger.error(f"'{missing_key} not found in dataset'")
    else:
        dbdao = DBDao(
            dialect=SupportedDatabaseDialects.TREX
            if options.use_trex_connection
            else None,
            use_cache_db=options.use_cache_db,
            database_code=database_code,
        )

        portal_server_api = PortalServerAPI()

        logger.info(f"Checking if schema '{schema_name}' exists in cache for db {database_code} for dataset id '{dataset_id}'")

        schema_exists = dbdao.check_schema_exists(schema_name)

        if schema_exists is False:
            error_msg = f"Schema '{schema_name}' does not exist in cache for db {database_code} for dataset id '{dataset_id}'"
            logger.error(error_msg)
            portal_server_api.update_dataset_attributes_table(
                dataset_id, "schema_version", error_msg
            )
            portal_server_api.update_dataset_attributes_table(
                dataset_id, "latest_schema_version", error_msg
            )
        else:
            error_msg = ""
            
            # update last created_date with cdm_release_date or error msg
            update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                schema_name=schema_name,
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
                schema_name=schema_name,
                table_name="cdm_source",
                column_name="cdm_release_date",
                entity_name="updated_date",
                logger=logger
                )

            # update patient count or error msg
            update_entity_count(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                schema_name=schema_name,
                table_name="person",
                column_name="person_id",
                entity_name="patient_count",
                logger=logger,
                distinct_count=False
                )
            
            # update entity_count_distribution or error msg
            entity_count_distribution = update_entity_count_distribution(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                schema_name=schema_name,
                logger=logger,
                distinct_count=False
            )
            
            # update total_entity_count or error msg
            update_total_entity_count(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                entity_count_distribution=entity_count_distribution,
                logger=logger
            )

            # update cdm version or error msg
            # should come from portal(?)
            cdm_version = update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                schema_name=schema_name,
                table_name="cdm_source",
                column_name="cdm_version",
                entity_name="version",
                logger=logger
                )
            
            update_metadata_last_fetched_date(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                logger=logger
            )

            schema_version = None
            if dataset.get("type") == "omop" and dataset.get("plugin") in ("omop_cdm_plugin", "data_management_plugin"):
                schema_version = cdm_version
            else:
                schema_version = "Not Available"

            portal_server_api.update_dataset_attributes_table(
                dataset_id, "schema_version", str(schema_version)
            )
            portal_server_api.update_dataset_attributes_table(
                dataset_id, "latest_schema_version", str(schema_version)
            )
