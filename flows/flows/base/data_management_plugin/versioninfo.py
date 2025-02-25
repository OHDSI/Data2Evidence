import json
from datetime import datetime
from typing import List, Dict
from prefect import task
from prefect.logging import get_run_logger

from flows.data_management_plugin.const import OMOP_DATA_MODELS, check_table_case, convert_case
from flows.data_management_plugin.types import (PortalDatasetType, 
                                                ExtractDatasetSchemaType)

from shared_utils.dao.DBDao import DBDao
from shared_utils.liquibase import Liquibase
from shared_utils.api.PortalServerAPI import PortalServerAPI
from shared_utils.api.PrefectAPI import get_auth_token_from_input
from shared_utils.types import (UserType, 
                                LiquibaseAction,
                                EntityCountDistributionType)
from shared_utils.update_dataset_metadata import (extract_version,
                                                  OMOP_NON_PERSON_ENTITIES,
                                                  update_entity_value,
                                                  update_entity_distinct_count,
                                                  update_entity_count_distribution,
                                                  update_total_entity_count,
                                                  update_metadata_last_fetched_date)


def get_version_info_tasks(changelog_filepath_list: Dict,
                          plugin_classpath: str,
                          dataset_list: List[PortalDatasetType],
                          use_cache_db: bool):
    logger = get_run_logger()
    if (dataset_list is None) or (len(dataset_list) == 0):
        logger.info("No datasets fetched from portal")
    else:
        logger.info(
            f"Successfully fetched {len(dataset_list)} datasets from portal")

        # Store token in cache
        get_auth_token_from_input()

        dataset_schema_list = extract_db_schema(dataset_list)

        for dataset in dataset_schema_list["datasets_with_schema"]:
            get_and_update_attributes(
                dataset, changelog_filepath_list, plugin_classpath, use_cache_db)


@task(log_prints=True)
def extract_db_schema(dataset_list: List[PortalDatasetType]) -> ExtractDatasetSchemaType:
    datasets_with_schema = []
    datasets_without_schema = []
    for _dataset in dataset_list:
        try:
            # validate dataset
            PortalDatasetType(**_dataset)
        except Exception as e:
            # dataset has no db_name and study name
            id = _dataset["id"]
            get_run_logger().error(
                f"Unable to validate dataset with id'{id}': {e}")
            datasets_without_schema.append(_dataset)
        else:
            datasets_with_schema.append(_dataset)
    return {"datasets_with_schema": datasets_with_schema,
            "datasets_without_schema": datasets_without_schema}


@task(log_prints=True)
def get_and_update_attributes(dataset: PortalDatasetType,
                              changelog_filepath_list: Dict,
                              plugin_classpath: str,
                              use_cache_db: bool
                              ):
    logger = get_run_logger()

    dataset_id = dataset.get("id")
    database_code = dataset.get("databaseCode")
    schema_name = dataset.get("schemaName")
    vocab_schema = dataset.get("vocabSchemaName")
    data_model = dataset.get("dataModel").split(" ")[0]
    changelog_file = changelog_filepath_list.get(data_model)

    try:
        # handle case of wrong db credentials
        dataset_dao = DBDao(use_cache_db=use_cache_db, database_code=database_code, schema_name=schema_name)
    except Exception as e:
        logger.error(f"Failed to connect to database")
        raise e
    else:
        portal_server_api = PortalServerAPI()
        
        # handle case where schema does not exist in db
        schema_exists = dataset_dao.check_schema_exists()
        if schema_exists == False:
            error_msg = f"Schema '{schema_name}' does not exist in db {database_code} for dataset id '{dataset_id}'"
            logger.error(error_msg)
            portal_server_api.update_dataset_attributes_table(dataset_id, "schema_version", error_msg)
            portal_server_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", error_msg)
        else:
            # update data model creation date with cdm_release_date or error msg
            update_entity_value(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                dbdao=dataset_dao,
                table_name="cdm_source",
                column_name="cdm_release_date",
                entity_name="created_date",
                logger=logger
            )
            
            try:
                # update with data model last updated date
                updated_date = get_updated_date(dataset_dao)
                portal_server_api.update_dataset_attributes_table(dataset_id, "updated_date", updated_date)
            except Exception as e:
                logger.error(
                    f"Failed to update attribute 'updated_date' for dataset id '{dataset_id}' with value '{updated_date}' : {e}")
            else:
                logger.info(
                    f"Updated attribute 'updated_date' for dataset id '{dataset_id}' with value '{updated_date}'")


            update_metadata_last_fetched_date(
                portal_server_api=portal_server_api,
                dataset_id=dataset_id,
                logger=logger
            )

            try:
                # update with current version count or error msg
                current_schema_version = get_current_version(dataset_dao)
                portal_server_api.update_dataset_attributes_table(dataset_id, "schema_version", current_schema_version)
            except Exception as e:
                logger.error(
                    f"Failed to update attribute 'current_schema_version' for dataset id '{dataset_id}' with value '{current_schema_version}' : {e}")
            else:
                logger.info(
                    f"Updated attribute 'current_schema_version' for dataset id '{dataset_id}' with value '{current_schema_version}'")

            if data_model in OMOP_DATA_MODELS:
                
                # used for hana datasets and pg datasets created before default
                is_lower_case = check_table_case(dataset_dao)

                # update patient count or error msg
                update_entity_distinct_count(
                    portal_server_api=portal_server_api,
                    dataset_id=dataset_id,
                    dbdao=dataset_dao,
                    table_name=convert_case("person", is_lower_case),
                    column_name=convert_case("person_id", is_lower_case),
                    entity_name="patient_count",
                    logger=logger
                    )

                try:
                    # update with entity distribution json string
                    entity_count_distribution = get_entity_count_distribution(
                        dataset_dao, is_lower_case)
                    portal_server_api.update_dataset_attributes_table(dataset_id, "entity_count_distribution", json.dumps(entity_count_distribution))
                except Exception as e:
                    logger.error(
                        f"Failed to update attribute 'entity_count_distribution' for dataset id '{dataset_id}' with value '{entity_count_distribution}' : {e}")
                else:
                    logger.info(
                        f"Updated attribute 'entity_count_distribution' for dataset id '{dataset_id}'  with value '{entity_count_distribution}'")

                # update total_entity_count or error msg
                update_total_entity_count(
                    portal_server_api=portal_server_api,
                    dataset_id=dataset_id,
                    entity_count_distribution=entity_count_distribution,
                    logger=logger
                )

                # update cdm version or error msg
                update_entity_value(
                    portal_server_api=portal_server_api,
                    dataset_id=dataset_id,
                    dbdao=dataset_dao,
                    table_name=convert_case("cdm_source", is_lower_case),
                    column_name=convert_case("cdm_version", is_lower_case),
                    entity_name="version",
                    logger=logger
                    )
            try:
                # update with latest version or error msg
                db_dialect = dataset_dao.dialect
                tenant_configs = dataset_dao.tenant_configs

                latest_available_schema_version = get_latest_available_version(dialect=db_dialect,
                                                                               data_model=data_model,
                                                                               changelog_file=changelog_file,
                                                                               schema_name=schema_name,
                                                                               vocab_schema=vocab_schema,
                                                                               tenant_configs=tenant_configs,
                                                                               plugin_classpath=plugin_classpath)
                portal_server_api.update_dataset_attributes_table(dataset_id, "latest_schema_version", latest_available_schema_version)
            except Exception as e:
                logger.error(
                    f"Failed to update attribute 'latest_schema_version' for dataset id '{dataset_id}' with value '{latest_available_schema_version}' : {e}")
            else:
                logger.info(
                    f"Updated attribute 'latest_schema_version' for dataset id '{dataset_id}'  with value '{latest_available_schema_version}'")


def get_latest_available_version(**kwargs) -> str:
    kwargs["action"] = LiquibaseAction.STATUS
    try:
        liquibase = Liquibase(**kwargs)
        liquibase_output = liquibase.get_latest_available_version()
        latest_available_schema_version = extract_version(liquibase_output)
    except Exception as e:
        error_msg = f"Error retrieving latest available version"
        get_run_logger().error(f"{error_msg}: {e}")
        latest_available_schema_version = error_msg
    return latest_available_schema_version


def get_current_version(dao_obj: DBDao) -> str:
    try:
        latest_executed_changeset = dao_obj.get_last_executed_changeset()
        current_version = extract_version(latest_executed_changeset)
    except Exception as e:
        error_msg = f"Error retrieving current version"
        get_run_logger().error(f"{error_msg}: {e}")
        current_version = error_msg
    return current_version


def get_updated_date(dao_obj: DBDao) -> str:
    try:
        updated_date = str(dao_obj.get_datamodel_updated_date()).split(" ")[0]
    except Exception as e:
        error_msg = f"Error retrieving updated date"
        get_run_logger().error(f"{error_msg}: {e}")
        updated_date = error_msg
    return updated_date


def get_entity_count_distribution(dao_obj: DBDao, is_lower_case: bool) -> EntityCountDistributionType:
    entity_count_distribution = {}
    # retrieve count for each entity table
    for table, unique_id_column in OMOP_NON_PERSON_ENTITIES.items():
        try:
            if is_lower_case:
                entity_count = dao_obj.get_distinct_count(
                    table, unique_id_column)
            else:
                entity_count = dao_obj.get_distinct_count(
                    table.upper(), unique_id_column.upper())
        except Exception as e:
            get_run_logger().error(
                f"Error retrieving entity count for {table}: {e}")
            entity_count = "error"
        entity_count_key = table.replace("_", " ").title() + " Count"
        if entity_count != "error":
            entity_count_distribution[entity_count_key] = str(entity_count)
    return entity_count_distribution