from prefect import flow, task
from prefect.logging import get_run_logger
from flows.perseus_plugin.Perseus import Perseus
from flows.perseus_plugin.types import PerseusRequestType

@task(log_prints=True)
def setup_plugin(perseus: Perseus):
    perseus.start()
    return perseus

@flow(log_prints=True)
def perseus_plugin(options: PerseusRequestType):
    logger = get_run_logger()
    logger.info("triggering perseus flow")
    perseus = Perseus()
    setup_plugin(perseus)
    perseus.handle_request(options)