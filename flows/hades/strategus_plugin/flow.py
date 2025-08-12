import re
import traceback
from functools import partial
import json

from prefect import flow, task
from prefect.logging import get_run_logger
from prefect.context import TaskRunContext, FlowRunContext
from prefect.artifacts import create_markdown_artifact

from .hooks import generate_nodes_flow_hook, execute_nodes_flow_hook, node_task_execution_hook
from .flowutils import get_node_list, get_incoming_edges
from .nodes import generate_nodes_flow, execute_r_strategus, upload_strategus_results, drop_strategus_results_schema, serialize_result_to_json, Result


@flow(log_prints=True)
def strategus_plugin(json_graph, options):
    # logger = get_run_logger()

    if(options.get('mode', None) == 'kernel'):
        runStrategus(json_graph, options)
        return
    if(options.get('mode', None) == 'drop-results'):
        drop_strategus_results(options)
        return

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
            nodes_out[k] = n[k].serialize_result()

    # Create an artifact to store the nodes output
    # create_markdown_artifact(
    #     key="strategus-plugin-nodes-output",
    #     markdown=json.dumps(nodes_out)
    # )


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


@task(task_run_name="execute-nodes-taskrun-{nodename}")
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


def runStrategus(json_graph, options):
    root_flow_run_context = FlowRunContext.get().flow_run.dict()
    flow_run_id = str(root_flow_run_context.get("id"))
    
    study_id = options.get('studyId', None)
    datasetId = options.get('datasetId', None)
    database_code = options.get('databaseCode', None)
    schema_name = options.get('schemaName', None)
    upload_results = options.get('uploadResults', False)

    if(not study_id):
       raise Exception('StudyId is missing')
    pattern = r'^[a-zA-Z0-9_]+$'
    if not re.fullmatch(pattern, study_id):
        raise Exception(f'StudyId {study_id} is not valid. It should only contain alphanumeric characters and underscores.')
    if(not datasetId):
       raise Exception('DatasetId is missing')
    if(not database_code):
       raise Exception('Database code is missing')
    if(not schema_name):
       raise Exception('Schema name is missing')
    
    dbSettings = { "database_code": database_code, "schema_name": schema_name, "dataset_id": datasetId, "study_id": study_id }
    base_path = f'/tmp/{flow_run_id}'
    work_folder = f'{base_path}/work'
    path_to_results = f'{base_path}/results'
    log_file_name = f'{base_path}/strategus-log.txt'

    if(type(json_graph) == str):
        json_graph = json.loads(json_graph)

    analysisSpec = json_graph.get('analysisSpecification', {})
    
    if isinstance(analysisSpec, str):
        analysisSpec = json.loads(analysisSpec)
    
    analysisSpec = json.dumps(analysisSpec)
    defaultExecutionSettings = json.dumps({
        "workDatabaseSchema": schema_name,
        "cdmDatabaseSchema": schema_name,
        "workFolder": work_folder,
        "resultsFolder": path_to_results,
        "logFileName": log_file_name,
        "minCellCount": 5,
        "maxCores": 8,
        "attr_class": [
            "CdmExecutionSettings",
            "ExecutionSettings"
        ]
    })
    executionSettings = json_graph.get('executionSettings', defaultExecutionSettings)

    execute_r_strategus(analysisSpec, executionSettings, dbSettings)
    if(upload_results):
        result_db_settings = {
            'database_code': get_study_results_db_code(),
            "dataset_id": datasetId,
            "study_id": study_id
        }
        upload_strategus_results(analysisSpec, path_to_results, result_db_settings)

def drop_strategus_results(options):
    """
    Drops the Strategus results from the database.
    """
    datasetId = options.get('datasetId', None)
    study_id = options.get('studyId', None)
    database_code = options.get('databaseCode', None)
    if(not datasetId):
       raise Exception('DatasetId is missing')
    if(not database_code):
       raise Exception('Database code is missing')

    drop_strategus_results_schema(dbSettings={
        'database_code': get_study_results_db_code(),
        'dataset_id': datasetId,
        'study_id': study_id
    })

def get_study_results_db_code():
    """
    Returns the database code for the Strategus results database.
    """
    return "study_results"