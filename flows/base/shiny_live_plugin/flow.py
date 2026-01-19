from prefect import flow, task
from prefect.logging import get_run_logger
import os
from .types import ShinyLivePluginType

os.environ['plugin_name'] = 'shiny_live_plugin'


@flow(log_prints=True)
def shiny_live_plugin(options: ShinyLivePluginType):
    """
    Flow to deploy a Shiny Live application.

    Args:
        options: ShinyLivePluginType with:
            - dataset_id: str, identifier for the dataset to be used in the app 
            - language: str, programming language of the app ("python" or "r")
            - app_code: str, the code of the Shiny Live application
    """

    logger = get_run_logger()
    logger.info(
        f"Deploying Shiny Live app for dataset {options.dataset_id} in {options.language}...")

    # Placeholder for deployment logic
    # This would typically involve saving the app code, setting up the environment, etc.
    logger.info("Shiny Live app deployed successfully.")
    return {
        'status': 'success',
        'dataset_id': options.dataset_id,
        'language': options.language
    }
