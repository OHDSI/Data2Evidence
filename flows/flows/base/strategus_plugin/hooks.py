from prefect.server.schemas.states import StateType
from prefect.logging.loggers import flow_run_logger, task_run_logger


def generate_nodes_flow_hook(flow, flow_run, state, graph, sorted_nodes):
    logger = flow_run_logger(flow_run, flow)
    if state.type == StateType.COMPLETED:
        message = f"Running hook on generate_nodes_flow success"
        logger.info(message)
    elif state.type == StateType.FAILED:
        message = f"Running hook on generate_nodes_flow failure"
        logger.info(message)


def execute_nodes_flow_hook(flow, flow_run, state, generated_nodes, sorted_nodes, testmode):
    logger = flow_run_logger(flow_run, flow)
    if state.type == StateType.COMPLETED:
        message = f"Running hook on execute_nodes_flow success"
        logger.info(message)
    elif state.type == StateType.FAILED:
        message = f"Running hook on execute_nodes_flow failure"
        logger.info(message)


def subflow_execution_hook(flow, flow_run, state, node_graph, input, istest):
    logger = flow_run_logger(flow_run, flow)

    if state.type == StateType.COMPLETED:
        message = f"Running hook on subflow execution success"
        logger.info(message)
    elif state.type == StateType.FAILED:
        message = f"Running hook on subflow execution failure"
        logger.info(message)


def node_task_execution_hook(task, task_run, state, nodename, nodetype, nodeobj, input, istest):
    logger = task_run_logger(task_run, task)

    if state.type == StateType.COMPLETED:
        message = f"Running hook on task execution success for node {nodename} of type {nodetype}"
        logger.info(message)
    elif state.type == StateType.FAILED:
        message = f"Running hook on task execution failure for node {nodename} of type {nodetype}"
        logger.info(message)


def node_task_generation_hook(task, task_run, state, nodename, nodetype):
    logger = task_run_logger(task_run, task)
    if state.type == StateType.COMPLETED:
        message = f"Running hook on task generation success for node {nodename} of type {nodetype}"
        logger.info(message)
    elif state.type == StateType.FAILED:
        message = f"Running hook on task generation failure for node {nodename} of type {nodetype}"
        logger.info(message)