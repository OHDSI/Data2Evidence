import re
import traceback
from functools import partial
import json
from uuid import uuid4

from prefect import flow, task
from prefect.context import TaskRunContext, FlowRunContext
from prefect.artifacts import create_markdown_artifact

from .hooks import generate_nodes_flow_hook, execute_nodes_flow_hook, node_task_execution_hook
from .flowutils import get_node_list, get_incoming_edges
from .nodes import generate_nodes_flow, execute_r_strategus, upload_strategus_results, drop_strategus_results_schema, get_strategus_node, getRCdmExecutionSettings
from _shared_flow_utils.logger.logger import Logger
from _shared_flow_utils.api.StrategusAnalysisAPI import StrategusAnalysisAPI


@flow(log_prints=True)
def strategus_plugin(json_graph, options):
    logger = Logger()

    if(options.get('mode', None) == 'kernel'):
        runStrategus(json_graph, options)
        return
    if(options.get('mode', None) == 'drop-results'):
        drop_strategus_results(options)
        return

    _options = options
    graph = json_graph
    graph["options"] = _options
    sorted_nodes = get_node_list(graph)  # array of nodes that is sorted
    logger.debug(f"Total number of nodes: {len(sorted_nodes)}")
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

    # generated_nodes { edges: {e1: {source: "", target: ""} }, nodes: { nodename: { id: "", type: "", ... } } }
    generated_nodes = generate_nodes_flow_wo(graph, sorted_nodes)  # flow

    logger.debug(f"Graph with nodes: {generated_nodes}")

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

    try:
        study_analysis_result = execute_strategus_node(generated_nodes, n, options)
        logger.debug(f"Study analysis result: {study_analysis_result}")
        root_flow_run_context = FlowRunContext.get().flow_run.dict()
        flow_run_id = str(root_flow_run_context.get("id"))
        log_file_path = f"/tmp/{flow_run_id}/results/strategus-log.txt"

        # Create an artifact to store the nodes output
        create_markdown_artifact(
            key="strategus-analysis-specification",
            markdown=study_analysis_result.data
        )
        with open(log_file_path, "r") as f:
            file_contents = f.read()
            create_markdown_artifact(
                key="strategus-analysis-logs",
                markdown=file_contents
            )
    except Exception as e:
        logger.error(f"Error executing Strategus analysis: {e}")
    finally:
        strategus_api = StrategusAnalysisAPI()
        study_name = options.get("studyName", "")
        study_id = options.get("studyId", "")
        strategus_api.update_study_analysis(study_id, study_name, study_analysis_result.data)

@task(name="execute-strategus-task")
def execute_strategus_node(generated_nodes, results, options):
    task_run_context = TaskRunContext.get().task_run.model_dump()
    strategus_node = get_strategus_node(options)
    return strategus_node.task(generated_nodes, results, task_run_context)

@flow(name="execute-nodes",
      flow_run_name="execute-nodes-flowrun",
      log_prints=True)
def execute_nodes_flow(graph, sorted_nodes, test):
    nodes = {}
    logger = Logger()

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
                "cohort_node",
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
                "treatment_patterns_node",
                "kaplan_meier_node"
            ]:
                logger.error(f"gen.py: execute_nodes: {node['type']} Node Type not known")
            else: 
                node_task_execution_wo = execute_node_task.with_options(
                    on_completion=[
                        partial(node_task_execution_hook, **dict(nodename=nodename, nodetype=node["type"], nodeobj=node["nodeobj"], input=_input, istest=test))],
                    on_failure=[
                        partial(node_task_execution_hook, **dict(nodename=nodename, nodetype=node["type"], nodeobj=node["nodeobj"], input=_input, istest=test))]
                )

                result = node_task_execution_wo(
                    nodename, node["type"], node["nodeobj"], _input, test)
                if(result.error): 
                    raise Exception(result.data)
                nodes[nodename] = result
    except Exception as e:
        logger.error(traceback.format_exc())
        raise Exception("Error executing nodes")
    return nodes

@task(task_run_name="execute-nodes-taskrun-{nodename}", log_prints=True)
def execute_node_task(nodename, node_type, node, input, test):
    logger = Logger()

    logger.debug(f"{nodename} task started, type: {node_type}")
    for k in input.keys():
        logger.debug(f"Input key: {k}, type: {type(input[k])}")

    # Get task run context
    task_run_context = TaskRunContext.get().task_run.model_dump()

    _node = node
    result = None
    if test:
        result = _node.test(task_run_context)
    else:
        match node_type:
            case ('cohort_diagnostic_node' | 'calendar_time_covariate_settings_node' |
                'cohort_generator_node' | 'time_at_risk_node' | 'default_covariate_settings_node' | 
                'study_population_settings_node' | 'cohort_incidence_target_cohorts_node' | 'cohort_node' | 
                'era_covariate_settings_node' | 'seasonality_covariate_settings_node' | 'nco_cohort_set_node'):
                result = _node.task(task_run_context)
            case _:
                result = _node.task(input, task_run_context)
    logger.debug(f"Result: {result.serialize_result()}")
    return result


def runStrategus(json_graph, options):
    logger = Logger()
    try:
        root_flow_run_context = FlowRunContext.get().flow_run.dict()
    except:
        root_flow_run_context = {"id":uuid4()}
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

    if(type(json_graph) == str):
        json_graph = json.loads(json_graph)

    analysisSpec = json_graph.get('analysisSpecification', {})
    
    if isinstance(analysisSpec, str):
        analysisSpec = json.loads(analysisSpec)
    
    try:
        for resourceIndex in range(len(analysisSpec['sharedResources'])):
            for cohortDefIndex in range(len(analysisSpec['sharedResources'][resourceIndex]['cohortDefinitions'])):
                cohortDef = analysisSpec['sharedResources'][resourceIndex]['cohortDefinitions'][cohortDefIndex]
                analysisSpec['sharedResources'][resourceIndex]['cohortDefinitions'][cohortDefIndex] = json.loads(cohortDef["cohortDefinition"])
    except Exception as e:
        logger.error(f"Error converting cohortDefinitions to JSON: {e}")
        raise e

    analysisSpec = json.dumps(analysisSpec)
    defaultExecutionSettings = getRCdmExecutionSettings({
        "schemaName": schema_name,
        "workFolder": work_folder,
        "resultsFolder": path_to_results
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

# Following __main__ is meant for development purposes
# Enables to run the flow as a simple method, and not a prefect flow 
if __name__ == "__main__":
    options = {
        "test_mode":False,
        "trace_config":{"trace_db":"alp","trace_mode":True}, 
        "databaseCode": "demo_database", 
        "datasetId": "943fccb8-36df-42c3-ab7c-c37b1684d0d4", 
        "schemaName": "demo_cdm" 
    }
    json_graph = {"edges":{"e1":{"source":"treatment_patterns_node_0"},"e2":{"source":"cohort_node_0","target":"treatment_patterns_node_0"},"e3":{"source":"cohort_node_1","target":"treatment_patterns_node_0"},"e4":{"source":"cohort_node_2","target":"treatment_patterns_node_0"}},"nodes":{"cohort_node_0":{"id":"1d749dd2-0a72-460e-92f0-b2a99dfa65a4","type":"cohort_node", "cohortType": "event","cohorts":[{"cohortId":33,"cohortName":"Depression"}]},"cohort_node_1":{"id":"a1ef0e24-0cea-413e-9be7-470931e55bd2","type":"cohort_node", "cohortType": "event","cohorts":[{"cohortId":32,"cohortName":"NewUsersBupropion"}]},"cohort_node_2":{"id":"9f162813-4757-4297-a39c-e18a0b92a8a8","type":"cohort_node", "cohortType": "target","cohorts":[{"cohortId":30,"cohortName":"NewUsersSSRI"}]},"treatment_patterns_node_0":{"id":"3e81d37b-be4c-4873-ac85-425f5a4a4b18","type":"treatment_patterns_node","ageWindow":10,"splitTime":30,"censorType":"minCellCount","minCellCount":5,"maxPathLength":5,"minEraDuration":0,"eraCollapseSize":30,"indexDateOffset":0,"filterTreatments":"First","combinationWindow":30,"includeTreatments":"startDate","splitEventCohorts":"","minPostCombinationDuration":30}}}

    strategus_plugin.fn(
        json_graph=json_graph,
        options=options
    )