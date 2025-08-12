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
    # root_flow_run_context = FlowRunContext.get().flow_run.dict()
    # root_flow_run_id = str(root_flow_run_context.get("id"))

    _options = options
    graph = json_graph
    sorted_nodes = get_node_list(graph)  # array of nodes that is sorted
    # get_run_logger().debug(f"Total number of nodes: {len(sorted_nodes)}")
    print(f"Total number of nodes: {len(sorted_nodes)}")
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

    # get_run_logger().debug(f"Graph with nodes: {generated_nodes}")
    print(f"Graph with nodes: {generated_nodes}")

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
                # get_run_logger().error(f"gen.py: execute_nodes: {node['type']} Node Type not known")
                print(f"gen.py: execute_nodes: {node['type']} Node Type not known")
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
        raise Exception("Error executing nodes")
    return nodes

@task(task_run_name="execute-nodes-taskrun-{nodename}", log_prints=True)
def execute_node_task(nodename, node_type, node, input, test):
    print(f"{nodename} task started, type: {node_type}")
    for k in input.keys():
        # print(f"Input key: {k}, type: {type(input[k])}, value: {serialize_result_to_json(input[k].data) if isinstance(input[k], Result) else None}")
        print(f"Input key: {k}, type: {type(input[k])}")

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
    print(f"Result: {result.serialize_result()}")
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

if __name__ == "__main__":
    # This is just for testing purposes
    options = {"test_mode":False,"trace_config":{"trace_db":"alp","trace_mode":True}}
    json_graph = {"edges":{"e1":{"source":"cohort_incidence_target_cohorts_node_0","target":"cohort_incidence_node_0"},"e2":{"source":"time_at_risk_node_0","target":"cohort_incidence_node_0"},"e3":{"source":"time_at_risk_node_0","target":"default_covariate_settings_node_0"},"e4":{"source":"negativeControlOutcomes","target":"default_covariate_settings_node_0"},"e5":{"source":"nco_cohort_set_node_0","target":"default_covariate_settings_node_0"},"e6":{"source":"default_covariate_settings_node_0","target":"characterization_node_0"},"e7":{"source":"negativeControlOutcomes","target":"tcos1"},"e8":{"source":"default_covariate_settings_node_0","target":"cmAnalysis1"},"e9":{"source":"study_population_settings_node_0","target":"cmAnalysis1"},"e10":{"source":"study_population_settings_node_0","target":"self_controlled_case_series_analysis_node_0"},"e11":{"source":"covarPreExxp","target":"self_controlled_case_series_analysis_node_0"},"e12":{"source":"calendar_time_covariate_settings_node_0","target":"self_controlled_case_series_analysis_node_0"},"e13":{"source":"seasonality_covariate_settings_node_0","target":"self_controlled_case_series_analysis_node_0"},"e14":{"source":"self_controlled_case_series_analysis_node_0","target":"self_controlled_case_series_node_0"},"e15":{"source":"time_at_risk_node_1","target":"cohort_incidence_node_0"},"e16":{"source":"cmAnalysis1","target":"cohort_method_node_0"},"e17":{"source":"tcos1","target":"cohort_method_node_0"},"e18":{"source":"outcomeOfInterest","target":"default_covariate_settings_node_0"},"e19":{"source":"study_population_settings_node_0","target":"cmAnalysis2"},"e20":{"source":"cmAnalysis2","target":"cohort_method_node_0"},"e21":{"source":"tcos2","target":"cohort_method_node_0"},"e22":{"source":"negativeControlOutcomes","target":"tcos2"},"e23":{"source":"outcomeOfInterest","target":"tcos1"},"e24":{"source":"outcomeOfInterest","target":"tcos2"},"e25":{"source":"covarExposureOfInt","target":"self_controlled_case_series_analysis_node_0"},"e26":{"source":"study_population_settings_node_1","target":"patient_level_prediction_node_0"},"e27":{"source":"exposure_node_0","target":"self_controlled_case_series_node_0"},"e28":{"source":"exposure_node_0","target":"patient_level_prediction_node_0"},"e29":{"source":"patient_level_prediction_node_0","target":"strategus_node_0"},"e30":{"source":"self_controlled_case_series_node_0","target":"strategus_node_0"},"e31":{"source":"cohort_incidence_node_0","target":"strategus_node_0"},"e32":{"source":"cohort_diagnostic_node_0","target":"strategus_node_0"},"e33":{"source":"cohort_generator_node_0","target":"strategus_node_0"},"e34":{"source":"characterization_node_0","target":"strategus_node_0"},"e35":{"source":"cohort_method_node_0","target":"strategus_node_0"},"e36":{"source":"negative_control_outcome_cohort_node_0","target":"strategus_node_0"},"e37":{"source":"cohort_definition_set_node_0","target":"strategus_node_0"}},"nodes":{"tcos1":{"id":"fb1fab05-ffe8-4c57-b432-db2d7e526321","type":"target_comparator_outcomes_node","targetId":1,"comparatorId":"2","excludedCovariateConceptIds":["1118084","1124300"],"includedCovariateConceptIds":[]},"tcos2":{"id":"bd6b1c42-4d61-4237-bf75-d248a751c878","type":"target_comparator_outcomes_node","targetId":"4","comparatorId":"5","excludedCovariateConceptIds":["1118084","1124300"],"includedCovariateConceptIds":[]},"cmAnalysis1":{"id":"e18038a5-aadd-4e5c-b328-53e9ad3e0015","type":"cohort_method_analysis_node","psArgs":{"control":True,"stopOnError":False,"cvRepetition":1},"analysisId":"1","fitOutcomeModelArgs":{"modelType":"cox"},"dbCohortMethodDataArgs":{"maxCohortSize":100000,"washoutPeriod":183,"firstExposureOnly":True,"removeDuplicateSubjects":"remove all"}},"cmAnalysis2":{"id":"4a1be3bb-dbb6-4da0-95d7-1afa00c1e6e7","type":"cohort_method_analysis_node","psArgs":{"control":True,"stopOnError":False,"cvRepetition":1},"analysisId":"2","fitOutcomeModelArgs":{"modelType":"cox"},"dbCohortMethodDataArgs":{"maxCohortSize":100000,"washoutPeriod":183,"firstExposureOnly":True,"removeDuplicateSubjects":"remove all"}},"covarPreExxp":{"id":"93d90129-89e5-40cb-beb3-b1ac3767503e","end":"-1","type":"era_covariate_settings_node","label":"Pre-exposure","start":"-30","endAnchor":"era end","stratifyById":False,"excludedEraIds":[],"includedEraIds":["exposureId"],"profileLikelihood":False,"exposureOfInterest":False,"firstOccurenceOnly":False,"allowRegularization":False},"exposure_node_0":{"id":"fd3570d9-8aa9-4014-8dd5-714759e22993","type":"exposure_node","outcomeOfInterestIds":[],"exposureOfInterestIds":[]},"strategus_node_0":{"id":"0d823aed-3fb8-4b1a-a5b3-11f6e23a6ade","type":"strategus_node"},"outcomeOfInterest":{"id":"3da62e57-3150-4542-afb7-28db50649c5f","type":"outcomes_node","trueEffectSize":"","ncoCohortSetIds":["3"],"outcomeOfInterest":True,"priorOutcomeLookback":""},"covarExposureOfInt":{"id":"8f055580-8128-4aab-9c98-ce96584352bc","end":0,"type":"era_covariate_settings_node","label":"Main","start":0,"endAnchor":"era end","startAnchor":"era start","stratifyById":False,"excludedEraIds":[],"includedEraIds":["exposureId"],"profileLikelihood":True,"exposureOfInterest":True,"firstOccurenceOnly":False,"allowRegularization":False},"time_at_risk_node_0":{"id":"1","type":"time_at_risk_node","endWith":"start","endOffset":"365","startWith":"start","startOffset":0},"time_at_risk_node_1":{"id":"2","type":"time_at_risk_node","endWith":"end","endOffset":0,"startWith":"start","startOffset":0},"cohort_method_node_0":{"id":"7c412e30-db37-443f-88f3-a2e0defe16ee","type":"cohort_method_node","trueEffectSize":1,"cohortMethodConfigs":[],"priorOutcomeLookback":30},"nco_cohort_set_node_0":{"id":"2fac5344-e8cb-4d8a-b16b-2040d2b677f5","type":"nco_cohort_set_node"},"characterization_node_0":{"id":"e34f178c-f098-4322-8ff9-e0436ca68cf3","type":"characterization_node","targetIds":["1","2"],"outcomeIds":["3"],"timeAtRiskConfigs":[{"endAnchor":"cohort end","startAnchor":"cohort start","riskWindowEnd":0,"riskWindowStart":1},{"endAnchor":"cohort end","startAnchor":"cohort start","riskWindowEnd":365,"riskWindowStart":1}],"minPriorObservation":0,"dechallengeStopInterval":"30","dechallengeEvaluationWindow":"30"},"cohort_generator_node_0":{"id":"e7f0cc83-e51d-4cd4-b806-3d06281b8c30","type":"cohort_generator_node","incremental":True,"generateStats":True},"cohort_incidence_node_0":{"id":"88844642-71a0-4d7a-a4d0-e2e19286c788","type":"cohort_incidence_node","cohortRefs":[{"id":"1","name":"Celecoxib","description":""},{"id":"2","name":"Diclofenac","description":""},{"id":"4","name":"Celecoxib Age >= 30","description":""},{"id":"5","name":"Diclofenac Age >= 30","description":""}],"strataSettings":{"byYear":True,"byGender":True},"incidenceAnalysis":{"tars":["1","2"],"targets":["1","2","4","5"],"outcomes":["1"]}},"negativeControlOutcomes":{"id":"7132d9b4-1bff-49cd-a425-0c951c0d51fd","type":"outcomes_node","trueEffectSize":1,"ncoCohortSetIds":[],"outcomeOfInterest":False,"priorOutcomeLookback":30},"cohort_diagnostic_node_0":{"id":"47c220dc-bd7e-4dfd-88f4-bd701acbe9e0","type":"cohort_diagnostic_node","incremental":False,"runTimeSeries":False,"runIncidenceRate":True,"runVisistContext":True,"runOrphanConcepts":True,"runCohortRelationship":True,"runInclusionStatistics":True,"runBreakdownIndexEvents":True,"runIncludedSourceConcepts":True,"runTemporalCohortCharacterization":True},"cohort_definition_set_node_0":{"id":"e441d143-2ef0-4171-9036-682b2ee22b05","type":"cohort_definition_set_node"},"patient_level_prediction_node_0":{"id":"9d4b1f8d-49e0-49a2-8066-ba1b24054f27","type":"patient_level_prediction_node"},"study_population_settings_node_0":{"id":"2a049ce5-6b9c-4e11-b92e-4e64d4a7bc7c","type":"study_population_settings_node","sccsArgs":{"minAge":18,"naivePeriod":365},"cohortMethodArgs":{"endAnchor":"cohort end","startAnchor":"cohort start","minDaysAtRisk":1,"riskWindowEnd":30,"riskWindowStart":0},"patientLevelPredictionArgs":{"endAnchor":"cohort end","startAnchor":"cohort start","minTimeAtRisk":1,"riskWindowEnd":365,"riskWindowStart":1}},"study_population_settings_node_1":{"id":"de75e9e7-b2e3-45a6-adbb-1649d6b58850","type":"study_population_settings_node","sccsArgs":{"minAge":18,"naivePeriod":365},"cohortMethodArgs":{"endAnchor":"cohort end","startAnchor":"cohort start","minDaysAtRisk":1,"riskWindowEnd":30,"riskWindowStart":0},"patientLevelPredictionArgs":{"endAnchor":"cohort start","startAnchor":"cohort start","minTimeAtRisk":1,"riskWindowEnd":365,"riskWindowStart":1}},"default_covariate_settings_node_0":{"id":"45745fd9-e505-466c-b33c-1d0a244b7595","type":"default_covariate_settings_node","includedCovariateIds":[],"addDescendantsToExclude":False,"addDescendantsToInclude":False,"excludedCovariateConceptIds":[],"includedCovariateConceptIds":[]},"self_controlled_case_series_node_0":{"id":"6505129e-ff48-4250-adeb-56b4f8cf7acb","type":"self_controlled_case_series_node","combineDataFetchAcrossOutcomes":False},"seasonality_covariate_settings_node_0":{"id":"4d854eeb-b848-4b16-a76c-02f3ee812959","type":"seasonality_covariate_settings_node","seasonalityKnots":5,"allowRegularization":True,"computeConfidenceIntervals":False},"cohort_incidence_target_cohorts_node_0":{"id":"89cb49be-5e7c-4325-9218-262e6c02c6ab","type":"cohort_incidence_target_cohorts_node","defId":1,"defName":"GI bleed","cohortId":3,"cleanWindow":9999},"negative_control_outcome_cohort_node_0":{"id":"0d823aed-3fb8-4b1a-a5b3-11f6e23a6ade","type":"negative_control_outcome_cohort_node","occurenceType":"all","detectOnDescendants":True},"calendar_time_covariate_settings_node_0":{"id":"af04df27-1b14-45a0-bb75-8e7373a2c352","type":"calendar_time_covariate_settings_node","caldendarTimeKnots":5,"allowRegularization":True,"computeConfidenceIntervals":False},"self_controlled_case_series_analysis_node_0":{"id":"8d814dae-fb09-408d-b4e4-415b10e507c5","type":"self_controlled_case_series_analysis_node","analysisId":1,"dbSccsDataArgs":{"studyEndDate":"","studyStartDate":"","nestingCohortId":1,"useNestingCohort":True,"maxCasesPerOutcome":100000,"deleteCovariateSmallCount":0},"fitSccsModelArgs":{"seed":1,"cvType":"auto","control":True,"noiseLevel":"quiet","selectorType":"byPid","startingVariance":0.1,"resetCoefficients":True},"sccsIntervalDataArgs":{"minCasesForTimeCovariates":100000}}}}

    # strategus_plugin.serve(
    #     name="strategus_plugin",
    #     parameters={
    #         "json_graph": json_graph,
    #         "options": options
    #     }
    # )

    strategus_plugin.fn(
        json_graph=json_graph,
        options=options
    )