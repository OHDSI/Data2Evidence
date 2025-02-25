import json
from datetime import datetime

from shared_utils.dao.DBDao import DBDao
from shared_utils.types import EntityCountDistributionType


# List of tables linked to person table
OMOP_NON_PERSON_ENTITIES = {
    "observation_period": "observation_period_id",
    "death": "person_id",
    "visit_occurrence": "visit_occurrence_id",
    "visit_detail": "visit_detail_id",
    "condition_occurrence": "condition_occurrence_id",
    "drug_exposure": "drug_exposure_id",
    "procedure_occurrence": "procedure_occurrence_id",
    "device_exposure": "device_exposure_id",
    "measurement": "measurement_id",
    "observation": "observation_id",
    "note": "note_id",
    "episode": "episode_id",
    "specimen": "specimen_id"
}


def update_metadata_last_fetched_date(portal_server_api, dataset_id: str, logger):
    try:
        # update last fetched metadata date
        metadata_last_fetch_date = datetime.now().strftime('%Y-%m-%d')
        portal_server_api.update_dataset_attributes_table(dataset_id, "metadata_last_fetch_date", metadata_last_fetch_date)
    except Exception as e:
        logger.error(f"Failed to update attribute 'metadata_last_fetch_date' for dataset '{dataset_id}' with value '{metadata_last_fetch_date}': {e}")
    else:
        logger.info(f"Updated attribute 'metadata_last_fetch_date' for dataset '{dataset_id}' with value '{metadata_last_fetch_date}'")


def get_entity_value_str(dbdao: DBDao, table_name: str, 
                         column_name: str, entity_name: str, 
                         logger) -> str:
    try:
        entity_value = dbdao.get_value(table_name, column_name)
        # get date if entity_value is of type datetime
        if isinstance(entity_value, datetime):
            entity_value = str(entity_value).split(" ")[0]
    except Exception as e:
        error_msg = f"Error retrieving '{entity_name}'"
        logger.error(f"{error_msg}: {e}")
        entity_value = error_msg
    return str(entity_value)

def update_entity_value(portal_server_api,
                        dataset_id: str,
                        dbdao: DBDao, 
                        table_name: str, 
                        column_name: str, 
                        entity_name: str, 
                        logger) -> str:
    try:
        entity_value = get_entity_value_str(dbdao, table_name, column_name, entity_name, logger)

        if entity_name == "version" and entity_value[0] in ["v", "V"]: # for cdm versions with a prefix v
            portal_server_api.update_dataset_attributes_table(dataset_id, entity_name, entity_value[1:])
        else:
            portal_server_api.update_dataset_attributes_table(dataset_id, entity_name, entity_value)

    except Exception as e:
        logger.error(f"Failed to update attribute '{entity_name}' for dataset id '{dataset_id}' with value '{entity_value}' : {e}")
    else:
        logger.info(f"Updated attribute '{entity_name} for dataset id '{dataset_id}' with value '{entity_value}'")
    return entity_value


def get_entity_count_str(dbdao: DBDao, table_name: str, 
                         column_name: str, entity_name: str, 
                         logger) -> str:
    try:
        entity_count = dbdao.get_distinct_count(table_name, column_name)
    except Exception as e:
        error_msg = f"Error retrieving '{entity_name}'"
        logger.error(f"{error_msg}: {e}")
        entity_count = error_msg
    return str(entity_count)


def update_entity_distinct_count(portal_server_api,
                                 dataset_id: str,
                                 dbdao: DBDao, 
                                 table_name: str, 
                                 column_name: str, 
                                 entity_name: str, 
                                 logger) -> str:
    try:
        entity_distinct_count: str = get_entity_count_str(dbdao, table_name, column_name, entity_name, logger)
        portal_server_api.update_dataset_attributes_table(dataset_id, entity_name, entity_distinct_count)
    except Exception as e:
        logger.error(f"Failed to update attribute '{entity_name}' for dataset id '{dataset_id}' with value '{entity_distinct_count}' : {e}")
    else:
        logger.info(f"Updated attribute '{entity_name} for dataset id '{dataset_id}' with value '{entity_distinct_count}'")
    return entity_distinct_count


def update_total_entity_count(portal_server_api,
                              dataset_id: str, 
                              entity_count_distribution: dict,
                              logger) -> str:
    try:
        total_entity_count = get_total_entity_count(entity_count_distribution, logger)
        portal_server_api.update_dataset_attributes_table(dataset_id, "entity_count", total_entity_count)
    except Exception as e:
        logger.error(f"Failed to update attribute 'entity_count' for dataset '{dataset_id}' with value '{total_entity_count}': {e}")
    else:
        logger.info(f"Updated attribute 'entity_count' for dataset '{dataset_id}' with value '{total_entity_count}'")
    return total_entity_count


def get_total_entity_count(entity_count_distribution: dict, logger) -> str:
    try:
        total_entity_count = 0
        for entity, entity_count in entity_count_distribution.items():
            # value could be str(int) or "error"
            if entity_count == "error":
                continue
            else:
                total_entity_count += int(entity_count)
    except Exception as e:
        error_msg = f"Error retrieving entity count"
        logger.error(f"{error_msg}: {e}")
        total_entity_count = error_msg
    return str(total_entity_count)


def update_entity_count_distribution(portal_server_api,
                                     dataset_id: str, 
                                     dbdao: DBDao, 
                                     logger) -> EntityCountDistributionType:
    try:
        entity_count_distribution = get_entity_count_distribution(dbdao, logger)
        portal_server_api.update_dataset_attributes_table(dataset_id, 'entity_count_distribution', json.dumps(entity_count_distribution))
    except Exception as e:
        logger.error(f"Failed to update attribute 'entity_count_distribution' for dataset '{dataset_id}' with value '{json.dumps(entity_count_distribution)}': {e}")
    else:
        logger.info(f"Updated attribute 'entity_count_distribution' for dataset '{dataset_id}' with value '{json.dumps(entity_count_distribution)}'")
    return entity_count_distribution


def get_entity_count_distribution(dbdao, logger) -> EntityCountDistributionType:
    entity_count_distribution = {}
    # retrieve count for each entity table
    for table, unique_id_column in OMOP_NON_PERSON_ENTITIES.items():
        try:
            entity_count = dbdao.get_distinct_count(table, unique_id_column)
        except Exception as e:
            logger.error(f"Error retrieving entity count for {table}: {e}")
            entity_count = "error"
        entity_count_key = table.replace("_", " ").title() + " Count"
        if entity_count != "error":
            entity_count_distribution[entity_count_key] = str(entity_count)
    return entity_count_distribution


def extract_version(text_str: str) -> str:
    changeset_folder = text_str.split("/")[4]
    changeset_filename = text_str.split("/")[5].split("_")[0]
    version = changeset_folder + "_" + changeset_filename
    return version