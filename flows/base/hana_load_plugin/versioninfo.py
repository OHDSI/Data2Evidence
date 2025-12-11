from prefect.logging import get_run_logger

from .types import DataloadOptions
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.PortalServerAPI import PortalServerAPI
from _shared_flow_utils.update_dataset_metadata import (
    update_entity_value,
    update_entity_count,
    update_entity_count_distribution,
    update_total_entity_count,
    update_metadata_last_fetched_date,
)


def get_version_info_tasks(options: DataloadOptions):
    """
    HANA load plugin has only ONE dataset (one schema),
    Therefore this function updates metadata for the 
    single schema in DataloadOptions.
    """

    logger = get_run_logger()
    dataset_id = options.schema_name
    database_code = options.database_code
    schema_name = options.schema_name

    logger.info(f"Updating version info for HANA dataset '{schema_name}'")

    # Create DB connection for this dataset
    try:
        dbdao = DBDao(
            use_cache_db=options.use_cache_db,
            database_code=database_code,
        )
    except Exception as e:
        logger.error(f"Failed to connect to database '{database_code}': {e}")
        return

    portal_api = PortalServerAPI()

    # Check schema existence
    if not dbdao.check_schema_exists(schema_name):
        error_msg = f"Schema '{schema_name}' does not exist in db {database_code}"
        logger.error(error_msg)

        portal_api.update_dataset_attributes_table(dataset_id, "schema_version", error_msg)
        portal_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", error_msg)
        return

    # created_date: cdm_source.cdm_release_date
    update_entity_value(
        portal_server_api=portal_api,
        dataset_id=dataset_id,
        dbdao=dbdao,
        schema_name=schema_name,
        table_name="cdm_source",
        column_name="cdm_release_date",
        entity_name="created_date",
        logger=logger,
    )

    # updated_date: fallback to cdm_release_date or DB implementation
    try:
        if hasattr(dbdao, "get_datamodel_updated_date"):
            updated_date = str(dbdao.get_datamodel_updated_date(schema_name)).split(" ")[0]
            portal_api.update_dataset_attributes_table(dataset_id, "updated_date", updated_date)
        else:
            # fallback
            update_entity_value(
                portal_server_api=portal_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                schema_name=schema_name,
                table_name="cdm_source",
                column_name="cdm_release_date",
                entity_name="updated_date",
                logger=logger,
            )
    except Exception as e:
        logger.error(f"Failed to update updated_date: {e}")

    # metadata_last_fetched_date
    update_metadata_last_fetched_date(
        portal_server_api=portal_api,
        dataset_id=dataset_id,
        logger=logger,
    )

    # patient_count: DISTINCT person_id
    update_entity_count(
        portal_server_api=portal_api,
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
        portal_server_api=portal_api,
        dataset_id=dataset_id,
        dbdao=dbdao,
        schema_name=schema_name,
        logger=logger,
        distinct_count=True,
    )

    # total_entity_count
    update_total_entity_count(
        portal_server_api=portal_api,
        dataset_id=dataset_id,
        entity_count_distribution=entity_dist,
        logger=logger,
    )

    # OMOP version (cdm_version)
    update_entity_value(
        portal_server_api=portal_api,
        dataset_id=dataset_id,
        dbdao=dbdao,
        schema_name=schema_name,
        table_name="cdm_source",
        column_name="cdm_version",
        entity_name="version",
        logger=logger,
    )
