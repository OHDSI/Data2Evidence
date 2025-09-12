from .config import CreateCacheOptions

from prefect import task
from prefect.logging import get_run_logger

from .utils import execute_statement

from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.types import SupportedDatabaseDialects
from _shared_flow_utils.api.PortalServerAPI import PortalServerAPI
from _shared_flow_utils.update_dataset_metadata import update_metadata_last_fetched_date, OMOP_NON_PERSON_ENTITIES, get_total_entity_count
#     extract_version,
#     update_entity_value,
#     update_total_entity_count,
#     update_entity_distinct_count,
#     update_entity_count_distribution,
#     update_metadata_last_fetched_date,
# )

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
            logger.info(f"dataset: {dataset}")
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

        logger.info(f"Updating attributes for dataset '{dataset_id}'.")
        logger.info(f"database_code '{database_code}'.")
        logger.info(f"schema_name '{schema_name}'.")

        dbdao = DBDao(
            dialect=SupportedDatabaseDialects.TREX
            if options.use_trex_connection
            else None,
            use_cache_db=options.use_cache_db,
            database_code=database_code,
        )

        portal_server_api = PortalServerAPI()

        logger.info(f"Checking if schema '{schema_name}' exists in cache for db {database_code} for dataset id '{dataset_id}'")
        # Todo: check if schema exists in cache
        schema_exists = dbdao.check_schema_exists(schema_name)

        logger.info(f"Schema exists: {schema_exists}")

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

            # update data model creation date with cdm_release_date or error msg
            cdm_release_date_query = f"SELECT cdm_release_date FROM {database_code}.{schema_name}.cdm_source LIMIT 1"
            cdm_release_date = str(dbdao.execute_sql(cdm_release_date_query)[0][0])
            logger.info(f"cdm_release_date: {cdm_release_date}")
            logger.info(f"cdm_release_date type: {type(cdm_release_date)}")
            # Todo: uncomment
            # portal_server_api.update_dataset_attributes_table(
            #     dataset_id, "created_date", cdm_release_date
            # )

            # update last updated date with cdm_release_date or error msg
            # Todo: uncomment
            # portal_server_api.update_dataset_attributes_table(
            #     dataset_id, "updated_date", cdm_release_date
            # )

            # update patient count or error msg
            patient_count_query = f"SELECT COUNT(DISTINCT person_id) AS patient_count FROM {database_code}.{schema_name}.person"
            patient_count = str(dbdao.execute_sql(patient_count_query)[0][0]) 
            logger.info(f"patient_count: {patient_count}")
            # Uncomment
            # portal_server_api.update_dataset_attributes_table(
            #     dataset_id, "patient_count", patient_count
            # )

            entity_count_distribution = {}
            for table in OMOP_NON_PERSON_ENTITIES:
                query = f"SELECT COUNT(*) FROM {database_code}.{schema_name}.{table}"
                try:
                    count = str(dbdao.execute_sql(query)[0][0])
                except Exception as e:
                    logger.error(f"Error fetching count for {table}: {e}")
                    count = "0"
                entity_count_distribution[table] = count
            # Todo: uncomment
            # portal_server_api.update_dataset_attributes_table(
            #     dataset_id, "entity_count_distribution", entity_count_distribution
            # )
            logger.info(f"entity_count_distribution: {entity_count_distribution}")


            total_entity_count = get_total_entity_count(entity_count_distribution, logger)
            logger.info(f"total_entity_count: {total_entity_count}")
            # Todo: uncomment
            # portal_server_api.update_dataset_attributes_table(
            #     dataset_id, "total_entity_count", total_entity_count
            # )

            # update cdm version or error msg
            cdm_version_query = f"SELECT cdm_version FROM {database_code}.{schema_name}.cdm_source LIMIT 1"
            cdm_version = str(dbdao.execute_sql(cdm_version_query)[0][0])
            logger.info(f"cdm_version: {cdm_version}")
            # portal_server_api.update_dataset_attributes_table(
            #     dataset_id, "version", cdm_version
            # )

            update_metadata_last_fetched_date(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                logger=logger,
            )
