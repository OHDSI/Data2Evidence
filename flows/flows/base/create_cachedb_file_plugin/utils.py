import os

from prefect import task
from prefect.variables import Variable

from shared_utils.types import SupportedDatabaseDialects

DUCKDB_EXTENSIONS_FILEPATH = "/app/duckdb_extensions"

def resolve_duckdb_file_path(duckdb_database_name: str, create_for_cdw_config_validation: bool):
    '''
    Gets duckdb data folder based on create_for_cdw_config_validation flag
    '''
    if create_for_cdw_config_validation:
        # Returns a hardcoded file path when creating duckdb file for cdw_config validation
        return f"{Variable.get('cdw_config_duckdb_data_folder')}/{duckdb_database_name}"
    else:
        return f"{Variable.get('duckdb_data_folder')}/{duckdb_database_name}"

@task(log_prints=True)
def remove_existing_file_if_exists(duckdb_database_name: str, create_for_cdw_config_validation: bool, logger):
    duckdb_file_path = resolve_duckdb_file_path(
        duckdb_database_name, create_for_cdw_config_validation)
    if os.path.isfile(duckdb_file_path):
        logger.info(f"Removing existing duckdb file at {duckdb_file_path}")
        os.remove(duckdb_file_path)


# Todo: implement check for plugin supported dialects
@task(log_prints=True)
def check_supported_duckdb_dialects(dialect, logger):
    SUPPORTED_DUCKDB_DIALECTS = [
        SupportedDatabaseDialects.POSTGRES.value
    ]
    if dialect not in SUPPORTED_DUCKDB_DIALECTS:
        error_message = f"""Input dialect: {dialect} is not supported, supported dialects are: {SUPPORTED_DUCKDB_DIALECTS}"""
        logger.error(error_message)
        raise ValueError(error_message)