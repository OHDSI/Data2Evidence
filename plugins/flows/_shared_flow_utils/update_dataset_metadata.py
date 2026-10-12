from datetime import datetime

from _shared_flow_utils.dao.DBDao import DBDao


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
    metadata_last_fetch_date = None
    try:
        # update last fetched metadata date
        metadata_last_fetch_date = datetime.now().strftime('%Y-%m-%d')
        portal_server_api.update_dataset_attributes_table(dataset_id, "metadata_last_fetch_date", metadata_last_fetch_date)
    except Exception as e:
        logger.error(f"Failed to update attribute 'metadata_last_fetch_date' for dataset '{dataset_id}' with value '{metadata_last_fetch_date}': {e}")
    else:
        logger.info(f"Updated attribute 'metadata_last_fetch_date' for dataset '{dataset_id}' with value '{metadata_last_fetch_date}'")


def get_entity_value_str(dbdao: DBDao, schema_name: str,
                         table_name: str, column_name: str, 
                         entity_name: str, logger) -> str:
    try:
        entity_value = dbdao.get_value(schema_name, table_name, column_name)
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
                        schema_name: str,
                        table_name: str, 
                        column_name: str, 
                        entity_name: str, 
                        logger) -> str:
    entity_value = None
    try:
        entity_value = get_entity_value_str(dbdao, schema_name, table_name, column_name, entity_name, logger)

        if entity_name == "version" and entity_value[0] in ["v", "V"]: # for cdm versions with a prefix v
            portal_server_api.update_dataset_attributes_table(dataset_id, entity_name, entity_value[1:])
        else:
            portal_server_api.update_dataset_attributes_table(dataset_id, entity_name, entity_value)

    except Exception as e:
        logger.error(f"Failed to update attribute '{entity_name}' for dataset id '{dataset_id}' with value '{entity_value}' : {e}")
    else:
        logger.info(f"Updated attribute '{entity_name}' for dataset id '{dataset_id}' with value '{entity_value}'")
    return entity_value


def get_entity_count_str(dbdao: DBDao, schema_name: str, 
                         table_name: str, column_name: str, 
                         entity_name: str, logger) -> str:
    try:
        entity_count = dbdao.get_distinct_count(schema_name, table_name, column_name)
    except Exception as e:
        error_msg = f"Error retrieving '{entity_name}'"
        logger.error(f"{error_msg}: {e}")
        entity_count = error_msg
    return str(entity_count)


def update_entity_count(portal_server_api,
                                 dataset_id: str,
                                 dbdao: DBDao, 
                                 schema_name: str,
                                 table_name: str, 
                                 column_name: str, 
                                 entity_name: str,
                                 logger,
                                 *,
                                 distinct_count: bool = True) -> str:
    entity_count = None
    try:
        if distinct_count:
            entity_count: str = get_entity_count_str(dbdao, schema_name, table_name, column_name, entity_name, logger)
        else:
            entity_count: str = dbdao.get_table_row_count(schema_name, table_name)
        portal_server_api.update_dataset_attributes_table(dataset_id, entity_name, entity_count)
    except Exception as e:
        logger.error(f"Failed to update attribute '{entity_name}' for dataset id '{dataset_id}' with value '{entity_count}' : {e}")
    else:
        logger.info(f"Updated attribute '{entity_name} for dataset id '{dataset_id}' with value '{entity_count}'")
    return entity_count


def update_total_entity_count(portal_server_api,
                              dataset_id: str, 
                              entity_counts: dict | None,
                              logger) -> str:
    total_entity_count = None
    try:
        total_entity_count = get_total_entity_count(entity_counts, logger)
        portal_server_api.update_dataset_attributes_table(dataset_id, "entity_count", total_entity_count)
    except Exception as e:
        logger.error(f"Failed to update attribute 'entity_count' for dataset '{dataset_id}' with value '{total_entity_count}': {e}")
    else:
        logger.info(f"Updated attribute 'entity_count' for dataset '{dataset_id}' with value '{total_entity_count}'")


def get_total_entity_count(entity_counts: dict | None, logger) -> str | None:
    try:
        total_entity_count = 0
        for entity, entity_count in entity_counts.items():
            total_entity_count += int(entity_count)
    except Exception as e:
        error_msg = f"Error retrieving entity count"
        logger.error(f"{error_msg}: {e}")
        total_entity_count = error_msg
    return str(total_entity_count)


def get_entity_counts(dbdao, schema: str, logger, *, distinct_count: bool = True) -> dict[str, int]:
    entity_counts = {}
    # retrieve count for each entity table, skipping tables that fail
    for table, unique_id_column in OMOP_NON_PERSON_ENTITIES.items():
        try:
            entity_counts[table] = dbdao.get_distinct_count(schema, table, unique_id_column) if distinct_count else dbdao.get_table_row_count(schema, table)
        except Exception as e:
            logger.error(f"Error retrieving entity count for {table}: {e}")
    return entity_counts


def extract_version(text_str: str) -> str:
    changeset_folder = text_str.split("/")[4]
    changeset_filename = text_str.split("/")[5].split("_")[0]
    version = changeset_folder + "_" + changeset_filename
    return version