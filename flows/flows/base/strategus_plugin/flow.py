import traceback
from functools import partial

from prefect import flow, task
from prefect.logging import get_run_logger
from prefect.context import TaskRunContext, FlowRunContext
from prefect.filesystems import RemoteFileSystem as RFS
from prefect.serializers import JSONSerializer
from prefect.variables import Variable

from flows.strategus_plugin.hooks import generate_nodes_flow_hook, execute_nodes_flow_hook, node_task_execution_hook
from flows.strategus_plugin.flowutils import get_node_list, get_incoming_edges
from flows.strategus_plugin.nodes import generate_nodes_flow


@flow(log_prints=True)
def strategus_plugin(json_graph, options):
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
                "time_at_risk_node",
                "cohort_generator_node",
                "cohort_diagnostic_node",
                "characterization_node", 
                "negative_control_outcome_cohort_node",
                "target_comparator_outcomes_node",
                "cohort_method_analysis_node",
                "default_covariate_settings_node",
                "study_population_settings_node",
                "cohort_incidence_target_cohorts_node",
                "cohort_incidence_node",
                "cohort_definition_set_node",
                "outcomes_node",
                "cohort_method_node",
                "era_covariate_settings_node",
                "seasonality_covariate_settings_node",
                "calendar_time_covariate_settings_node",
                "study_population_settings_node",
                "nco_cohort_set_node",
                "self_controlled_case_series_analysis_node",
                "self_controlled_case_series_node",
                "patient_level_prediction_node",
                "exposure_node",
                "strategus_node"
            ]:
                get_run_logger().error(f"gen.py: execute_nodes: {node['type']} Node Type not known")
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
      result_storage_key="{flow_run.id}_{parameters[nodename]}.json",
      result_serializer=JSONSerializer(object_encoder="strategus_plugin.nodes.serialize_result_to_json"), log_prints=True,
      persist_result=True)
def execute_node_task(nodename, node_type, node, input, test):
    # Get task run context
    task_run_context = TaskRunContext.get().task_run.dict()

    _node = node
    result = None
    if test:
        result = _node.test(task_run_context)
    else:
        match node_type:
            case ('cohort_diagnostic_node' | 'calendar_time_covariate_settings_node' |
                'cohort_generator_node' | 'time_at_risk_node' | 'default_covariate_settings_node' | 
                'study_population_settings_node' | 'cohort_incidence_target_cohorts_node' | 'cohort_definition_set_node' | 
                'era_covariate_settings_node' | 'seasonality_covariate_settings_node' | 'nco_cohort_set_node'):
                result = _node.task(task_run_context)
            case _:
                result = _node.task(input, task_run_context)
    return result