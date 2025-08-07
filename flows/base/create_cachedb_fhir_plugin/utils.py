import os

from prefect import task

from _shared_flow_utils.types import SupportedDatabaseDialects

@task(log_prints=True)
def check_supported_duckdb_dialects(dialect, logger):
    SUPPORTED_DUCKDB_DIALECTS = [
        SupportedDatabaseDialects.POSTGRES.value
    ]
    if dialect not in SUPPORTED_DUCKDB_DIALECTS:
        error_message = f"""Input dialect: {dialect} is not supported, supported dialects are: {SUPPORTED_DUCKDB_DIALECTS}"""
        logger.error(error_message)
        raise ValueError(error_message)