from sqlalchemy import select
import re

from flows.datamart_plugin.const import *
from flows.datamart_plugin.types import *

from shared_utils.update_dataset_metadata import extract_version


def get_tables_to_copy(source_dbdao, table_filter: list[DatamartCopyTableConfig], logger) -> list[str]:
    # get all tables in source_schema
    source_schema_tables = source_dbdao.get_table_names()
    
    # retrieve tables to always include using TABLES_TO_INCLUDE_REGEX
    include_pattern = re.compile(TABLES_TO_INCLUDE_REGEX)
    include_tables = [table for table in source_schema_tables if include_pattern.match(table)]
    
    logger.info(f"{len(include_tables)} Tables to include: {include_tables}")
     
    if table_filter:
        # only copy tables in table_filter - TABLES_TO_EXCLUDE_REGEX + TABLES_TO_INCLUDE_REGEX
        snapshot_config_tables = [config.get("tableName") for config in table_filter]
        
        logger.info(f"{len(snapshot_config_tables)} snapshot_config_tables: {snapshot_config_tables}")

        exclude_pattern = re.compile(TABLES_TO_EXCLUDE_REGEX)
        exclude_tables = [table for table in source_schema_tables if exclude_pattern.match(table)]
        
        logger.info(f"{len(exclude_tables)} Tables to exclude: {exclude_tables}")

        # Remove unnecessary tables that were passed into flow param e.g. history tables
        tables_to_copy = list(set(_use_engine_casing(source_schema_tables, snapshot_config_tables)) - set(exclude_tables)) + include_tables

    else:
        # no table filter provided
        # only copy tables in base_config + TABLES_TO_INCLUDE_REGEX
        base_config_tables = list(BASE_CONFIG_LIST.keys())
        
        # intersect base_config_tables & source_schema_tables to filter out HANA tables + tables to include not in base config
        tables_to_copy = list(set(base_config_tables) & set(source_schema_tables)) + include_tables
        
    logger.info(f"{len(tables_to_copy)} Tables to copy: {tables_to_copy}") 
    return tables_to_copy


def get_columns_to_copy(source_dbdao, source_table: str, table_filter: list[DatamartCopyTableConfig]) -> list[str]:
    # get all columns in source_table
    source_table_columns = source_dbdao.get_columns(table=source_table)
    
    # retrieve columns to always exclude using COLUMNS_TO_EXCLUDE_REGEX
    exclude_pattern = re.compile(COLUMNS_TO_EXCLUDE_REGEX)
    exclude_columns = exclude_columns = [column for column in source_table_columns if exclude_pattern.match(column.casefold())]
    
    include_pattern = re.compile(COLUMNS_TO_INCLUDE_REGEX)
    include_columns = [column for column in source_table_columns if include_pattern.match(column.casefold())]    
     
    if table_filter:
        # only copy columns in table_filter - COLUMNS_TO_EXCLUDE_REGEX + COLUMNS_TO_INCLUDE_REGEX
        try:
            snapshot_config_columns = next(filter(lambda table_config: table_config["tableName"] == source_table, table_filter), None).get("columnsToBeCopied")
        except AttributeError:
            # handle included tables from regex
            columns_to_copy = list(set(source_table_columns) - set(exclude_columns))
        else:
            columns_to_copy = list(set(_use_engine_casing(source_table_columns, snapshot_config_columns)) - set(exclude_columns)) + include_columns
    else:
        # no table filter provided
        # only copy columns in source_table + TABLES_TO_INCLUDE_REGEX
        columns_to_copy = list(set(source_table_columns) - set(exclude_columns))

    return columns_to_copy


def _use_engine_casing(list_a: list[str], list_b: list[str]) -> set[str]:
    '''
    Return the same elements in list_b with the casing of list_a
    Sqlalchemy returns all columns in lower case unless defined explicitly
    '''
    list_b_casefold = [element.casefold() for element in list_b]
    list_c = filter(lambda element: element.casefold() in list_b_casefold, list_a)
    return list_c


def parse_datamart_copy_config(snapshot_copy_config) -> tuple[str, list, list]:    
    if snapshot_copy_config:
        date_filter = snapshot_copy_config.timestamp or "" #copy_config.timestamp or ""
        table_filter = [table.dict() for table in snapshot_copy_config.tableConfig] or []
        patient_filter = snapshot_copy_config.patientsToBeCopied or [] #copy_config.patientsToBeCopied or []
        return date_filter, table_filter, patient_filter
    else:
        return "", [], []


def create_copy_table(dbdao, target_schema, table, select_statement):
    rows_copied = dbdao.create_table_from_query(target_schema, table, select_statement)
    return rows_copied


def get_schema_version(dbdao, cdm_version, logger) -> str:
    try:
        liquibase_migration = dbdao.check_table_exists("databasechangelog")
        if liquibase_migration:
            # data management plugin
            latest_executed_changeset = dbdao.get_last_executed_changeset()
            current_schema_version = extract_version(latest_executed_changeset)
        else:
            # use omop cdm plugin
            current_schema_version = RELEASE_VERSION_MAPPING.get(cdm_version)
            
    except Exception as e:
        error_msg = f"Error retrieving schema version"
        logger.error(f"{error_msg}: {e}")
        current_schema_version = error_msg
    return str(current_schema_version)