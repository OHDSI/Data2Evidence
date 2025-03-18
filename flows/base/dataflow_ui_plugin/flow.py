import traceback
from functools import partial
from collections import OrderedDict
from prefect_dask import DaskTaskRunner

from prefect import flow, task
from prefect.variables import Variable
from prefect.logging import get_run_logger
from prefect.serializers import JSONSerializer
from prefect.filesystems import RemoteFileSystem as RFS
from prefect.context import TaskRunContext, FlowRunContext

from .hooks import *
from .flowutils import *
from .nodes import generate_nodes_flow


@flow(log_prints=True)
def dataflow_ui_plugin(json_graph, options):
    logger = get_run_logger()

    # Grab root flow id
    root_flow_run_context = FlowRunContext.get().flow_run.dict()
    root_flow_run_id = str(root_flow_run_context.get("id"))

    _options = options
    graph = json_graph
    sorted_nodes = get_node_list(graph)  # array of nodes that is sorted
    get_run_logger().debug(f"Total number of nodes: {len(sorted_nodes)}")
    nodes_out = {}
    testmode = _options["test_mode"]
    trace_config = _options["trace_config"]
    tracemode = trace_config["trace_mode"]

    # Generate nodes in a subflow
    generate_nodes_flow_wo = generate_nodes_flow.with_options(
        on_completion=[
            partial(generate_nodes_flow_hook, **dict(graph=graph, sorted_nodes=sorted_nodes))],
        on_failure=[
            partial(generate_nodes_flow_hook, **dict(graph=graph, sorted_nodes=sorted_nodes))]
    )

    generated_nodes = generate_nodes_flow_wo(graph, sorted_nodes)  # flow

    get_run_logger().debug(f"Graph with nodes: {generated_nodes}")

    # Execute nodes
    execute_nodes_flow_wo = execute_nodes_flow.with_options(
        on_completion=[
            partial(execute_nodes_flow_hook, **dict(generated_nodes=generated_nodes, sorted_nodes=sorted_nodes, testmode=testmode))],
        on_failure=[
            partial(execute_nodes_flow_hook, **dict(generated_nodes=generated_nodes, sorted_nodes=sorted_nodes, testmode=testmode))]
    )

    n = execute_nodes_flow_wo(generated_nodes, sorted_nodes, testmode)  # flow

    if _options["trace_config"]["trace_mode"]:
        for k in n.keys():
            nodes_out[k] = n[k]
    # return json.dumps(nodes_out) # use return if persisting prefect flow results
    
def execute_subflow_cluster(node_graph, input, test):
    scheduler_address = get_scheduler_address(node_graph)
    executor_type = node_graph["nodeobj"].executor_type

    @flow(task_runner=DaskTaskRunner(cluster_kwargs={"processes": False}), log_prints=True)
    def execute_local_cluster(node_graph, input, test):
        return submit_tasks_to_runner(node_graph, input, test)

    @flow(task_runner=DaskTaskRunner(address=scheduler_address), log_prints=True)
    def execute_kube_cluster(node_graph, input, test):
        return submit_tasks_to_runner(node_graph, input, test)

    @flow(task_runner=DaskTaskRunner(address=scheduler_address), log_prints=True)
    def execute_mpi_cluster(node_graph, input, test):
        return submit_tasks_to_runner(node_graph, input, test)

    def submit_tasks_to_runner(node_graph, input, test):
        subflow_results = OrderedDict()
        count = 0
        for nodename in node_graph["nodeobj"].sorted_nodes:
            # if it is the first node in the subflow
            if count == 0:
                _input = input
            else:
                _input = get_incoming_edges(
                    node_graph["graph"], subflow_results, nodename)

            node = node_graph["graph"]["nodes"][nodename]

            node_task_execution_wo = execute_node_task.with_options(
                on_completion=[
                    partial(node_task_execution_hook, **dict(nodename=nodename, nodetype=node["type"], nodeobj=node["nodeobj"], input=_input, istest=test))],
                on_failure=[
                    partial(node_task_execution_hook, **dict(nodename=nodename, nodetype=node["type"], nodeobj=node["nodeobj"], input=_input, istest=test))]
            )

            subflow_results[nodename] = node_task_execution_wo.submit(
                nodename, node["type"], node["nodeobj"], _input, test).result()  # Result Obj
            count += 1
        return subflow_results

    match executor_type:
        case "kubernetes":
            subflow_execution_wo = execute_kube_cluster.with_options(
                on_completion=[partial(
                    subflow_execution_hook, **dict(node_graph=node_graph, input=input, istest=test))],
                on_failure=[partial(
                    subflow_execution_hook, **dict(node_graph=node_graph, input=input, istest=test))]
            )
        case "mpi":
            subflow_execution_wo = execute_mpi_cluster.with_options(
                on_completion=[partial(
                    subflow_execution_hook, **dict(node_graph=node_graph, input=input, istest=test))],
                on_failure=[partial(
                    subflow_execution_hook, **dict(node_graph=node_graph, input=input, istest=test))]
            )
        case "default":
            subflow_execution_wo = execute_local_cluster.with_options(
                on_completion=[partial(
                    subflow_execution_hook, **dict(node_graph=node_graph, input=input, istest=test))],
                on_failure=[partial(
                    subflow_execution_hook, **dict(node_graph=node_graph, input=input, istest=test))]
            )

    return subflow_execution_wo(node_graph, input, test)


@flow(name="execute-nodes",
      flow_run_name="execute-nodes-flowrun",
      log_prints=True)
def execute_nodes_flow(graph, sorted_nodes, test):
    nodes = {}
    try:
        for nodename in sorted_nodes:
            node = graph["nodes"][nodename]
            _input = get_incoming_edges(graph, nodes, nodename)
            if node["type"] not in [
                "csv_node",
                "sql_node",
                "python_node",
                "py2table_node",
                "db_reader_node",
                "db_writer_node",
                "sql_query_node",
                "r_node",
                "data_mapping_node",
                "subflow"
            ]:
                get_run_logger().error(f"gen.py: execute_nodes: {node['type']} Node Type not known")
            else: 
                if node["type"] == "subflow":
                    # execute as a subflow with runner
                    result_of_subflow = execute_subflow_cluster(
                        node, _input, test)

                    # output of subflow
                    nodes[nodename] = result_of_subflow.popitem(
                        True)[1]  # result is an ordered dict

                    # also save results of tasks in subflow
                    for subflow_node in result_of_subflow:
                        nodes[subflow_node] = result_of_subflow[subflow_node]
                else:
                    node_task_execution_wo = execute_node_task.with_options(
                        on_completion=[
                            partial(node_task_execution_hook, **dict(nodename=nodename, nodetype=node["type"], nodeobj=node["nodeobj"], input=_input, istest=test))],
                        on_failure=[
                            partial(node_task_execution_hook, **dict(nodename=nodename, nodetype=node["type"], nodeobj=node["nodeobj"], input=_input, istest=test))]
                    )

                    nodes[nodename] = node_task_execution_wo(
                        nodename, node["type"], node["nodeobj"], _input, test)
    except Exception as e:
        get_run_logger().error(traceback.format_exc())
    return nodes


@task(task_run_name="execute-nodes-taskrun-{nodename}",
      result_storage=RFS.load(Variable.get("flows_results_sb_name")),
      result_storage_key="{flow_run.parent_flow_run_id}_{parameters[nodename]}.json",
      result_serializer=JSONSerializer(object_encoder="flows.dataflow_ui_plugin.nodes.serialize_result_to_json"), log_prints=True,
      persist_result=True)
def execute_node_task(nodename, node_type, node, input, test):
    # Get task run context
    task_run_context = TaskRunContext.get().task_run.model_dump()

    _node = node
    result = None
    if test:
        result = _node.test(task_run_context)
    else:
        match node_type:
            case 'csv_node' | 'db_reader_node':
                result = _node.task(task_run_context)
            case _:
                result = _node.task(input, task_run_context)
    return result