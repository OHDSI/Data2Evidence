from __future__ import annotations
import pandas as pd
from typing import TYPE_CHECKING
import json
from prefect import flow, task
from prefect.logging import get_run_logger

from .types import DataloadOptions, FileType
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.FhirAPI import FhirAPI

if TYPE_CHECKING:
    from _shared_flow_utils.dao.daobase import DaoBase


@flow(log_prints=True)
def data_load_fhir_plugin(options: DataloadOptions):
    logger = get_run_logger()
    files = options.files
    truncate_tables = options.truncate_tables
    use_cache_db = options.use_cache_db
    dataset_token = options.dataset_token
    try:
        dbdao = DBDao(use_cache_db=use_cache_db,
                  database_code="alp-fhir")
        fhir_tables_all = set()
        for incoming_file in files:
            if(truncate_tables):
                logger.info(f"get_unique_resource_types_from_file '{incoming_file.path}'")
                fhir_tables = get_unique_resource_types_from_file(incoming_file)
                # Only truncate tables not already truncated
                tables_to_truncate = [table for table in fhir_tables if table not in fhir_tables_all]
                if tables_to_truncate:
                    truncate_fhir_tables(tables_to_truncate, "fhir", dbdao, logger)
                # Add only new tables to the set
                fhir_tables_all.update(tables_to_truncate)
            load_data(dataset_token, incoming_file, logger)
    except Exception as e:
        logger.error(f"Error connecting to trex fhir database: {e}")
        raise e
        
@task(log_prints=True)
def truncate_fhir_tables(table_list: list[str], schema: str, dbdao: DaoBase, logger):   
    # Truncate tables
    for table in table_list:
        logger.info(f"Truncating table '{schema}.{table}'")
        dbdao.truncate_table(schema, table)

def post_fhir_resource(resource, idx, json_file, fhir_api: FhirAPI, logger, study_token):
    """
    Common function to post a FHIR resource and handle errors.
    Raises ValueError if resourceType is missing.
    """
    resource_type = resource.get("resourceType") or resource.get("resource", {}).get("resourceType")
    if not resource_type:
        logger.error(f"No resourceType found for entry at index {idx} in file '{json_file}'. Aborting.")
        raise ValueError(f"No resourceType found for entry at index {idx} in file '{json_file}'")
    try:
        response = fhir_api.post(study_token, resource_type, resource)
        logger.info(f"Posted resource {resource_type} for index {idx}: {response}")
    except Exception as e:
        logger.error(f"Error posting resource for index {idx}: {e}")

@task(log_prints=True)
def load_data(dataset_token, json_file, logger):
    logger.debug(f"Loading data from file '{json_file}' into FHIR service")
    fhir_api = FhirAPI()
    try:
        if json_file.path.endswith('.ndjson'):
            with open(json_file.path, "r") as f:
                for idx, line in enumerate(f):
                    line = line.strip()
                    if not line:
                        continue
                    resource_data = json.loads(line)
                    logger.debug(f"Processing line {idx} in file '{json_file}'")
                    post_fhir_resource(resource_data, idx, json_file, fhir_api, logger, dataset_token)
        elif json_file.path.endswith('.json'):
            with open(json_file.path, "r") as f:
                logger.debug(f"Processing JSON file '{json_file}'")
                data = json.load(f)
                logger.debug(data.get("resourceType"))
                if isinstance(data, dict) and data.get("resourceType") == "Bundle":
                    logger.debug(f"Processing Bundle in file '{json_file}'")
                    response = fhir_api.post(studyToken=dataset_token, resourceType="Bundle", resource=data)
                    logger.info(f"Posted Bundle: {response}")
                elif isinstance(data, list):
                    for idx, entry in enumerate(data):
                        logger.debug(f"Processing entry {idx} in list from file '{json_file}'")
                        post_fhir_resource(entry, idx, json_file, fhir_api, logger, dataset_token)
                else:
                    logger.debug(f"Processing single resource in file '{json_file}'")
                post_fhir_resource(data, 0, json_file, fhir_api, logger, dataset_token)
        else:
            logger.error(f"Unsupported file type for '{json_file}'. Only .ndjson and .json are supported.")
            return
    except Exception as e:
        logger.error(f"Error loading data from file '{json_file}': {e}")
        raise e

def get_unique_resource_types_from_file(json_file: FileType) -> list[str]:
    """
    Returns a set of unique FHIR resourceType names from a .json or .ndjson file.
    If the file is a Bundle, returns the resource types in its entries.
    """
    resource_types = set()
    if json_file.path.endswith('.ndjson'):
        with open(json_file.path, "r") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    resource = json.loads(line)
                    rtype = resource.get("resourceType") or resource.get("resource", {}).get("resourceType")
                    if rtype == "Bundle" and "entry" in resource:
                        for entry in resource["entry"]:
                            entry_resource = entry.get("resource", {})
                            entry_rtype = entry_resource.get("resourceType")
                            if entry_rtype:
                                resource_types.add(entry_rtype)
                    elif rtype:
                        resource_types.add(rtype)
                except Exception:
                    continue
    elif json_file.path.endswith('.json'):
        with open(json_file.path, "r") as f:
            data = json.load(f)
        if isinstance(data, dict) and data.get("resourceType") == "Bundle" and "entry" in data:
            for entry in data["entry"]:
                entry_resource = entry.get("resource", {})
                entry_rtype = entry_resource.get("resourceType")
                if entry_rtype:
                    resource_types.add(entry_rtype)
        elif isinstance(data, list):
            for entry in data:
                rtype = entry.get("resourceType") or entry.get("resource", {}).get("resourceType")
                if rtype:
                    resource_types.add(rtype)
        else:
            rtype = data.get("resourceType") or data.get("resource", {}).get("resourceType")
            if rtype:
                resource_types.add(rtype)
    return list(resource_types)