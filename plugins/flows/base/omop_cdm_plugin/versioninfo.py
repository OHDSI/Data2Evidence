from prefect import task
from prefect.logging import get_run_logger
from _shared_flow_utils.types import SupportedDatabaseDialects

from _shared_flow_utils.update_dataset_metadata import *
from _shared_flow_utils.api.PortalServerAPI import PortalServerAPI

from .types import OmopCDMPluginOptions, RELEASE_VERSION_MAPPING


SOURCE_DATASET_TYPE = "source"


def sanitize_id_for_cache_id(dataset_id: str) -> str:
    # Mirrors portal's sanitizeIdForCacheId (dataset.entity.ts).
    cleaned = dataset_id.replace("-", "_")
    return f"_{cleaned}" if cleaned[:1].isdigit() else cleaned


def bigquery_trex_catalog(dataset: dict) -> str:
    """
    trex catalog a BigQuery dataset's metadata is read from.

    A `source` row has no cache of its own: create_cachedb_file_plugin writes its
    cache to the child cache dataset's catalog, and that child gets its metadata
    from the cache plugin's own get_version_info. So, like a postgres source row,
    it is read from the source database itself -- trex's live attach
    `<databaseCode>__srcdb` (its cache_id, the databaseCode catalog, stays empty).

    Every other row reads its per-dataset DuckDB cache. The Study payload omits
    cacheId, so that is derived like portal's sanitizeIdForCacheId.
    """
    if dataset.get("type") == SOURCE_DATASET_TYPE:
        return f"{dataset.get('databaseCode')}__srcdb"
    return dataset.get("cacheId") or sanitize_id_for_cache_id(dataset.get("id"))


def update_dataset_metadata_flow(options: OmopCDMPluginOptions):
    logger = get_run_logger()
    dataset_list = options.datasets
    
    if (dataset_list is None) or (len(dataset_list) == 0):
        logger.info("No datasets fetched from portal")
    else:
        logger.info(f"Successfully fetched {len(dataset_list)} datasets from portal")

        for dataset in dataset_list:
            get_and_update_attributes(dataset)


@task(log_prints=True)
def get_and_update_attributes(dataset: dict):
    logger = get_run_logger()

    try:
        dataset_id = dataset.get("id")
        database_code = dataset.get("databaseCode")
        cache_id = dataset.get("cacheId")
        schema_name = dataset.get("schemaName")
    except KeyError as ke:
        missing_key = ke.args[0]
        logger.error(f"'{missing_key} not found in dataset'")
    else:
        is_bigquery = dataset.get("dialect") == SupportedDatabaseDialects.BIGQUERY
        is_source = dataset.get("type") == SOURCE_DATASET_TYPE

        try:
            if is_bigquery:
                dbdao = DBDao(
                    dialect=SupportedDatabaseDialects.TREX,
                    database_code=database_code,
                    cache_id=bigquery_trex_catalog(dataset),
                )
            else:
                dbdao = DBDao(database_code=database_code, cache_id=cache_id)
        except Exception as e:
            logger.error(e)
            return

        if is_bigquery and is_source:
            # trex's __srcdb ATTACH caches the BigQuery catalog, so a schema created
            # after the attach is invisible until cleared (as analytics-svc does
            # before its schema check). A stale cache only risks a false "missing
            # schema", so a failure here is logged, not raised.
            try:
                dbdao.execute_sql("CALL bigquery_clear_cache();")
            except Exception as e:
                logger.warning(f"Could not clear the trex BigQuery catalog cache: {e}")

        portal_server_api = PortalServerAPI()
        
        # check if schema exists
        schema_exists = dbdao.check_schema_exists(schema_name)
        if schema_exists is False:
            if is_bigquery and not is_source:
                error_msg = f"Schema '{schema_name}' does not exist in cache for db {database_code} for dataset id '{dataset_id}'; refresh the dataset cache first"
            else:
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
                logger=logger
                )
            
            # update entity_count_distribution or error msg
            entity_count_distribution = update_entity_count_distribution(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dbdao,
                schema_name=schema_name,
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
                schema_name=schema_name,
                table_name="cdm_source",
                column_name="cdm_version",
                entity_name="version",
                logger=logger
                )

            schema_version = None
            latest_schema_version = None

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