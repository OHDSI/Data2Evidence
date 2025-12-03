from prefect import flow
from prefect.logging import get_run_logger
import os
from .types import AdminSharePluginType

os.environ['plugin_name'] = 'admin_share_plugin'


@flow(log_prints=True)
def admin_share_plugin(options: AdminSharePluginType):
    logger = get_run_logger()
    logger.info("Hello")
