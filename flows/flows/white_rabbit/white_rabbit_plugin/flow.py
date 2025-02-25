from prefect import flow, task
from prefect.logging import get_run_logger
from flows.white_rabbit_plugin.WhiteRabbit import WhiteRabbit
from flows.white_rabbit_plugin.types import WhiteRabbitRequestType


@task(log_prints=True)
def setup_plugin(white_rabbit: WhiteRabbit):
    white_rabbit.start()
    return white_rabbit


@flow(log_prints=True)
def white_rabbit_plugin(options: WhiteRabbitRequestType):
    logger = get_run_logger()
    logger.info("triggering white rabbit flow")
    white_rabbit = WhiteRabbit()
    setup_plugin(white_rabbit)
    white_rabbit.handle_request(options)