from prefect.logging.loggers import task_run_logger
from prefect.server.schemas.states import StateType
from shared_utils.dao.DBDao import DBDao


def create_dataset_schema_hook(task, task_run, state, schema_dao: DBDao):
    logger = task_run_logger(task_run, task)

    if state.type == StateType.COMPLETED:
        msg = ""
        logger.info(msg)
    elif state.type == StateType.FAILED:
        msg = ""
        logger.info(msg)



def update_cdm_version_hook(task, task_run, state, db: str, schema: str):
    logger = task_run_logger(task_run, task)
    if state.type == StateType.COMPLETED:
        msg = ""
        logger.info(msg)
    elif state.type == StateType.FAILED:
        msg = ""
        logger.info(msg)


def update_schema_hook(task, task_run, state, db: str, schema: str):
    logger = task_run_logger(task_run, task)
    if state.type == StateType.COMPLETED:
        msg = ""
        logger.info(msg)
    elif state.type == StateType.FAILED:
        msg = ""
        logger.info(msg)


def rollback_count_hook(task, task_run, state, db: str, schema: str):
    logger = task_run_logger(task_run, task)
    if state.type == StateType.COMPLETED:
        msg = ""
        logger.info(msg)
    elif state.type == StateType.FAILED:
        msg = ""
        logger.info(msg)


def rollback_tag_hook(task, task_run, state, db: str, schema: str):
    logger = task_run_logger(task_run, task)
    if state.type == StateType.COMPLETED:
        msg = ""
        logger.info(msg)
    elif state.type == StateType.FAILED:
        msg = ""
        logger.info(msg)
