import os
import logging
import json
import uuid
import pandas as pd

from typing import Any
from pandas.api.types import is_list_like, is_dict_like

from rpy2 import robjects as ro
from rpy2.robjects.packages import importr
import traceback as tb
from functools import partial
from typing import List, Dict

from genson import SchemaBuilder
from genson.schema.node import SchemaGenerationError

from prefect import task, flow
from prefect.runtime import flow_run
from prefect.context import TaskRunContext
from prefect.artifacts import create_markdown_artifact

from .custom_types import CohortNodeType, USE_TREX_CONNECTION
from .hooks import node_task_generation_hook
from .flowutils import get_node_list, convert_py_to_R, convert_R_to_py, serialize_to_json

from _shared_flow_utils.dao.daobase import DialectDrivers
from _shared_flow_utils.dao.DBDao import DBDao
from _shared_flow_utils.api.WebAPI import WebAPI
from _shared_flow_utils.types import SupportedDatabaseDialects
from _shared_flow_utils.rutils import set_trex_env_var

os.environ['plugin_name'] = 'strategus_plugin'
class Node:
    def __init__(self, node):
        self.id = node["id"]
        self.type = node["type"]
        self.flowOptions = node["flowOptions"]


class Flow(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.graph = _node["graph"]
        self.executor_type = _node["executor_options"]["executor_type"]
        self.executor_host = _node["executor_options"]["executor_address"]["host"]
        self.executor_port = _node["executor_options"]["executor_address"]["port"]
        self.ssl = _node["executor_options"]["executor_address"]["ssl"]
        self.sorted_nodes = get_node_list(self.graph)


class Result:
    def __init__(self, error: bool, data, node: Node, task_run_context):
        self.error = error
        self.node = node
        self.data = data
        self.task_run_id = str(task_run_context.get("id"))
        self.task_run_name = str(task_run_context.get("name"))
        self.flow_run_id = str(task_run_context.get("flow_run_id"))

    def serialize_result(self):
        base_result = {
            "error": self.error,
            "errorMessage": self.data if self.error else None,
            "nodeName": self.node.name if hasattr(self.node, 'name') else self.node.__class__,
        }

        if self.error: return base_result
        base_result.update(self.__create_result_schema(self.data))
        return base_result

    def __is_strictly_list_like(self, obj):
        return is_list_like(obj) and not is_dict_like(obj)
    
    def __create_result_schema(self, result_value: Any):
        result_schema = {
            "length": len(result_value) if hasattr(result_value, "__len__") else None,
            "type": str(type(result_value))
        }

        try:
            builder = SchemaBuilder()
            if self.__is_strictly_list_like(result_value):
                builder.add_object(list(result_value))
            elif is_dict_like(result_value):
                builder.add_object(result_value)
            else:
                return result_schema

            schema = builder.to_schema()
            schema.pop("$schema", None)
            schema.pop("required", None)
            result_schema["schema"] = schema

        except SchemaGenerationError:
            if self.__is_strictly_list_like(result_value):
                result_schema["schema"] = [self.__create_result_schema(v) for v in result_value]
            elif is_dict_like(result_value):
                result_schema["schema"] = {k: self.__create_result_schema(v) for k, v in result_value.items()}

        return result_schema

@flow(name="generate-nodes",
      flow_run_name="generate-nodes-flowrun",
      log_prints=True)
def generate_nodes_flow(graph, sorted_nodes):
    options = graph["options"]
    for nodename in sorted_nodes:
        node = graph["nodes"][nodename]
        node["flowOptions"] = options
        nodetype = node["type"]

        node_task_generation_wo = generate_node_task.with_options(
            on_completion=[partial(
                node_task_generation_hook, **dict(nodename=nodename, nodetype=nodetype))],
            on_failure=[partial(node_task_generation_hook,
                                **dict(nodename=nodename, nodetype=nodetype))]
        )

        nodeobj = node_task_generation_wo(nodename, node, nodetype)

        graph["nodes"][nodename]["nodeobj"] = nodeobj
    return graph


@task(task_run_name="generate-node-taskrun-{nodename}",
      log_prints=True
      )
def generate_node_task(nodename, node, nodetype):
    nodeobj = None
    # TODO: nodetype to make global variable
    match nodetype:
        case "time_at_risk_node":
            nodeobj = TimeAtRiskNode(node)
        case "cohort_diagnostic_node":
            nodeobj = CohortDiagnosticsModuleSpecNode(node)
        case "cohort_generator_node":
            nodeobj = CohortGeneratorSpecNode(node)
        case "characterization_node":
            nodeobj = CharacterizationModuleSpecNode(node)
        case "negative_control_outcome_cohort_node":
            nodeobj = NegativeControlOutcomeCohortSharedResource(node)
        case "target_comparator_outcomes_node":
            nodeobj = TargetComparatorOutcomes(node)
        case "cohort_method_analysis_node":
            nodeobj = CohortMethodAnalysis(node)
        case "default_covariate_settings_node":
            nodeobj = DefaultCovariateSettingsNode(node)
        case "study_population_settings_node":
            nodeobj = StudyPopulationArgs(node)
        case "cohort_incidence_target_cohorts_node":
            nodeobj = OutcomeDef(node)
        case "cohort_incidence_node":
            nodeobj = CohortIncidenceModuleSpec(node)
        case "cohort_node":
            nodeobj = CohortDefinitionSharedResource(node)
        case "outcomes_node":
            nodeobj = CMOutcomes(node)
        case "cohort_method_node":
            nodeobj = CohortMethodModuleSpecNode(node)
        case "era_covariate_settings_node":
            nodeobj = EraCovariateSettings(node)
        case "seasonality_covariate_settings_node":
            nodeobj = SeasonalityCovariateSettingsNode(node)
        case "calendar_time_covariate_settings_node":
            nodeobj = CalendarCovariateSettingsNode(node)
        case "nco_cohort_set_node":
            nodeobj = NegativeControlCohortSet(node)
        case "self_controlled_case_series_analysis_node":
            nodeobj = SCCSAnalysis(node)
        case "self_controlled_case_series_node": 
            nodeobj = SCCSModuleSpec(node)
        case "patient_level_prediction_node":
            nodeobj = PLPModuleSpec(node)
        case "exposure_node":
            nodeobj = ExposuresOutcome(node)
        case "strategus_node":
            nodeobj = StrategusNode(node)
        case "treatment_patterns_node":
            nodeobj = TreatmentPatterns(node)
        case "kaplan_meier_node":
            nodeobj = KaplanMeierCMAnalysis(node)
        case _:
            logging.error("ERR: Unknown Node "+node["type"])
            logging.error(tb.StackSummary())
    return nodeobj


class OutcomeDef(Node):
    def __init__(self, node):
        super().__init__(node)
        self.defId = int(node["defId"])
        self.defName = node["defName"]
        self.cohortId = int(node["cohortId"])
        self.cleanWindow = node["cleanWindow"]
    
    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rCohortIncidence = ro.packages.importr('CohortIncidence')
                rOutcomeDef = rCohortIncidence.createOutcomeDef(
                    id = convert_py_to_R(self.defId), 
                    name = convert_py_to_R(self.defName), 
                    cohortId = convert_py_to_R(self.cohortId), 
                    cleanWindow = convert_py_to_R(self.cleanWindow), 
                )
                return Result(False,  rOutcomeDef, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class TimeAtRiskNode(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.id = int(_node["id"])
        self.startWith = _node["startWith"]
        self.endWith = _node["endWith"]
        self.startOffset = _node.get("startOffset", 0)
        self.endOffset = _node.get("endOffset", 0)

    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rCohortIncidence = ro.packages.importr('CohortIncidence')
                rTimeAtRisk = rCohortIncidence.createTimeAtRiskDef(
                    id = convert_py_to_R(self.id),
                    startWith = convert_py_to_R(self.startWith),
                    endWith = convert_py_to_R(self.endWith),
                    startOffset = convert_py_to_R(int(self.startOffset)),
                    endOffset = convert_py_to_R(int(self.endOffset))
                )
                return Result(False,  rTimeAtRisk, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class CohortIncidenceModuleSpec(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.cohortRefs = _node['cohortRefs']
        # remove, values are part of `input` object
        # self.outcomeDef = { "id": 1, "name": "GI bleed", "cohortId": 3, "cleanWindow": 9999 } # convert to list
        self.strataSettings = _node["strataSettings"]
        self.incidenceAnalysis = _node["incidenceAnalysis"]

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rStrategus = ro.packages.importr('Strategus')
                rCohortIncidence = ro.packages.importr('CohortIncidence')
                rCohortIncidenceModule = rStrategus.CohortIncidenceModule['new']()
                rCreateCohortIncidenceModuleSpecifications = rCohortIncidenceModule['createModuleSpecifications']
                rTargets = []
                for o in self.cohortRefs:
                    rTargets.append(rCohortIncidence.createCohortRef(id = convert_py_to_R(int(o['id'])), name = o['name']))
                rStrataSettings = rCohortIncidence.createStrataSettings(
                    byYear = convert_py_to_R(self.strataSettings["byYear"]), 
                    byGender = convert_py_to_R(self.strataSettings["byGender"])
                )
                rAnalysis1 = rCohortIncidence.createIncidenceAnalysis(
                    targets = convert_py_to_R([int(i) for i in self.incidenceAnalysis["targets"]]), 
                    outcomes = convert_py_to_R([int(i) for i in self.incidenceAnalysis["outcomes"]]), 
                    tars = convert_py_to_R([int(i) for i in self.incidenceAnalysis["tars"]])
                )
                rOutcomes = []
                rTars = []
                rOutcomes = get_results_by_class_type(input, OutcomeDef)
                rTars = get_results_by_class_type(input, TimeAtRiskNode)
                rIncidenceDesign = rCohortIncidence.createIncidenceDesign(
                    targetDefs = rTargets,
                    outcomeDefs = rOutcomes,
                    tars = rTars,
                    analysisList = [rAnalysis1], # a list of rAnalyses is possible, for now UI supports just one
                    strataSettings = rStrataSettings
                )
                rCohortIncidenceSpec = rCreateCohortIncidenceModuleSpecifications(irDesign = rIncidenceDesign['toList']())
                return Result(False,  rCohortIncidenceSpec, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)
        
    def test(self):
        return None


class CharacterizationModuleSpecNode(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.targetIds = [int(i) for i in _node["targetIds"]]
        self.outcomeIds = [float(i) for i in _node["outcomeIds"]]
        self.dechallengeStopInterval = int(_node["dechallengeStopInterval"])
        self.dechallengeEvaluationWindow = int(_node["dechallengeEvaluationWindow"])
        self.minPriorObservation = _node["minPriorObservation"]
        self.timeAtRisk = _node["timeAtRiskConfigs"]

    def test(self, task_run_context):
        return None

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rStrategus = ro.packages.importr('Strategus')
                rcm = rStrategus.CharacterizationModule['new']()
                rcmCreateModuleSpec = rcm['createModuleSpecifications']
                # ensure rCovariateSettings has at least one value
                rCovariateSettings = get_results_by_class_type(input, DefaultCovariateSettingsNode)
                rCharacterizationSpec = rcmCreateModuleSpec(
                    targetIds = convert_py_to_R(self.targetIds), 
                    outcomeIds = convert_py_to_R(self.outcomeIds), 
                    covariateSettings = rCovariateSettings[0], 
                    dechallengeStopInterval = self.dechallengeStopInterval, 
                    dechallengeEvaluationWindow = self.dechallengeEvaluationWindow, 
                    minPriorObservation = self.minPriorObservation
                )
                return Result(False,  rCharacterizationSpec, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class DefaultCovariateSettingsNode(Node):
    def __init__(self, _node):
        super().__init__(_node)
        print('DefaultCovariateSettings node created')
    
    def test():
        return None
    
    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rFeatureExtraction = ro.packages.importr('FeatureExtraction')
                rCovariateSettings = rFeatureExtraction.createDefaultCovariateSettings()
                return Result(False,  rCovariateSettings, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


# Cohort Shared Resource Specification of Strategus
# cohortIds - list of cohort IDs
# cohortType - type of the cohort (e.g., event, target, outcome)
class CohortDefinitionSharedResource(Node):
    cohortId: int
    cohortType: CohortNodeType
    cohortName: str

    def __init__(self, node: dict):
        super().__init__(node)
        cohort_info = node["cohorts"][0]
        self.cohortId = int(cohort_info["cohortId"])
        cohort_type_val = node.get("cohortType")
        if not cohort_type_val:
            self.cohortType = CohortNodeType.EVENT
        else:
            self.cohortType = CohortNodeType(cohort_type_val)
        self.cohortName = str(cohort_info["cohortName"])

    # create cohortdefinition shared resource
    # uses R package CohortGeneratorModule in Strategus 
    # calls the R method createCohortSharedResourceSpecifications. 
    # It also builds cohortdefinition using CirceR module.
    def task(self, task_run_context):
        parent_flow_run_id = flow_run.get_parent_flow_run_id()
        print(f"parent_flow_run_id: {parent_flow_run_id}")
        webapi = WebAPI(parent_flow_run_id)

        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rCohortGenerator = ro.packages.importr('CohortGenerator')
                rCirce = ro.packages.importr('CirceR')
                rbind = ro.r['rbind']
                rCohortDefinitionSet = rCohortGenerator.createEmptyCohortDefinitionSet()
                datasetId = self.flowOptions.get("datasetId", "") # TODO: throw error if not found
                cohort_definition = webapi.get_cohort_definition(self.cohortId, datasetId)
                cohortDefStr = json.dumps(cohort_definition["expression"])
                rcohortExpr = rCirce.cohortExpressionFromJson(cohortDefStr)
                rOptions = rCirce.createGenerateOptions(generateStats = convert_py_to_R(False))
                rCohortSql = rCirce.buildCohortQuery(rcohortExpr, options = rOptions)
                new_row = ro.r['data.frame'](
                    cohortId = convert_py_to_R(self.cohortId),
                    cohortName = convert_py_to_R(cohort_definition["name"]),
                    sql = rCohortSql,
                    json = convert_py_to_R(cohortDefStr)
                )
                rCohortDefinitionSet = rbind(rCohortDefinitionSet, new_row)

                rStrategus = ro.packages.importr('Strategus')
                rcgm = rStrategus.CohortGeneratorModule['new']()
                rCreateCohortSharedResourceSpecifications = rcgm['createCohortSharedResourceSpecifications']
                rCohortDefinitionSharedResource = rCreateCohortSharedResourceSpecifications(cohortDefinitionSet = rCohortDefinitionSet)
                rCreateCohortGenModuleSpec = rcgm['createModuleSpecifications']
                rCohortGeneratorModuleSpecifications = rCreateCohortGenModuleSpec(generateStats = convert_py_to_R(True))
                return Result(False,  { "cohortDefinitionSharedResource": rCohortDefinitionSharedResource, "cohortGeneratorModuleSpecifications": rCohortGeneratorModuleSpecifications }, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class NegativeControlOutcomeCohortSharedResource(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.occurenceType = _node["occurenceType"]
        self.detectOnDescendants = _node["detectOnDescendants"]

    def test(self, task_run_context):
        return None
    
    def task(self, _input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rNcoCohortSet = get_results_by_class_type(_input, NegativeControlCohortSet)
                rStrategus = ro.packages.importr('Strategus')
                rcgm = rStrategus.CohortGeneratorModule['new']()
                rCreateNegativeControlOutcomeCohortSharedResourceSpecifications = rcgm['createNegativeControlOutcomeCohortSharedResourceSpecifications']
                rNegativeCoSharedResource = rCreateNegativeControlOutcomeCohortSharedResourceSpecifications(
                    negativeControlOutcomeCohortSet = rNcoCohortSet[0],
                    occurrenceType = convert_py_to_R(self.occurenceType),
                    detectOnDescendants = convert_py_to_R(self.detectOnDescendants)
                )
                return Result(False,  rNegativeCoSharedResource, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class CohortGeneratorSpecNode(Node):
    def __init__(self, _node):
        super().__init__(_node)
        # self.incremental = _node["incremental"] # No longer a parameter in the R library
        self.generate_stats = _node["generateStats"] # Ensure boolean

    def task(self, task_run_context):
        with ro.default_converter.context():
            try: 
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rStrategus = importr('Strategus')
                rcgModule = rStrategus.CohortGeneratorModule['new']()
                rCreateModuleSpecifications = rcgModule['createModuleSpecifications']
                rCohortGeneratorModuleSpecifications = rCreateModuleSpecifications(convert_py_to_R(self.generate_stats))
                return Result(False,  rCohortGeneratorModuleSpecifications, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)
    
    def test():
        return None


class CohortDiagnosticsModuleSpecNode(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.runInclusionStatistics = _node["runInclusionStatistics"]
        self.runIncludedSourceConcepts = _node["runIncludedSourceConcepts"]
        self.runOrphanConcepts = _node["runOrphanConcepts"]
        self.runTimeSeries = _node["runTimeSeries"]
        self.runVisitContext = _node["runVisistContext"] # TODO: typo runVisistContext, change to runVisitContext
        self.runBreakdownIndexEvents = _node["runBreakdownIndexEvents"]
        self.runIncidenceRate = _node["runIncidenceRate"]
        self.runCohortRelationship = _node["runCohortRelationship"]
        self.runTemporalCohortCharacterization = _node["runTemporalCohortCharacterization"]
        self.incremental = _node["incremental"]

    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rStrategus = ro.packages.importr('Strategus')
                rcdm = rStrategus.CohortDiagnosticsModule['new']()
                rCreateCohortDiagnosticsModuleSpecifications = rcdm['createModuleSpecifications']
                rCohortDiagnosticsSpec = rCreateCohortDiagnosticsModuleSpecifications(
                    runInclusionStatistics = convert_py_to_R(self.runInclusionStatistics),
                    runIncludedSourceConcepts = convert_py_to_R(self.runIncludedSourceConcepts),
                    runOrphanConcepts = convert_py_to_R(self.runOrphanConcepts),
                    runTimeSeries = convert_py_to_R(self.runTimeSeries),
                    runVisitContext = convert_py_to_R(self.runVisitContext),
                    runBreakdownIndexEvents = convert_py_to_R(self.runBreakdownIndexEvents),
                    runIncidenceRate = convert_py_to_R(self.runIncidenceRate),
                    runCohortRelationship = convert_py_to_R(self.runCohortRelationship),
                    runTemporalCohortCharacterization = convert_py_to_R(self.runTemporalCohortCharacterization)
                )
                return Result(False,  rCohortDiagnosticsSpec, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class CMOutcomes(Node):
    def __init__(self, node):
        super().__init__(node)
        self.cohortId = None
        self.config = {
            "trueEffectSize": node["trueEffectSize"],
            "outcomeOfInterest": node["outcomeOfInterest"],
            "priorOutcomeLookback": node["priorOutcomeLookback"]
        }

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                cohortDefNodes = get_input_nodes_by_class_type_from_results(input, CohortDefinitionSharedResource)
                self.cohortId = cohortDefNodes[0].cohortId if cohortDefNodes else None
                if(not self.cohortId):
                    raise ValueError("CohortDefinitionSharedResource is required as input to Outcomes node")
                rCohortMethod = ro.packages.importr('CohortMethod')
                rlapply = ro.r['lapply']
                kwargs = {i[0]: i[1] for i in self.config.items() if (i[1] != "" or i[1] is False)}
                rOutcome = rlapply(
                    X = convert_py_to_R(self.cohortId),
                    FUN = rCohortMethod.createOutcome,
                    **kwargs
                )
                return Result(False,  rOutcome, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class TargetComparatorOutcomes(Node):
    
    def __init__(self, _node):
        super().__init__(_node)
        self.targetId = -1
        self.comparatorId = -1
        self.outComesCohortIds = []
        self.includedCovariateConceptIds = [int(i) for i in _node['includedCovariateConceptIds']]
        self.excludedCovariateConceptIds = [int(i) for i in _node['excludedCovariateConceptIds']]

    def test(self):
        return None

    def task(self, _input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rappend = ro.r['append']
                rCohortMethod = ro.packages.importr('CohortMethod')
                cohortDefNodes = get_input_nodes_by_class_type_from_results(_input, CohortDefinitionSharedResource)
                
                targetCohortDefNode = next((node for node in cohortDefNodes if node.cohortType == CohortNodeType.TARGET), None)
                if targetCohortDefNode:
                    self.targetId = targetCohortDefNode.cohortId
                comparatorCohortDefNode = next((node for node in cohortDefNodes if node.cohortType == CohortNodeType.COMPARATOR), None)
                if comparatorCohortDefNode:
                    self.comparatorId = comparatorCohortDefNode.cohortId

                rOutcomes = get_results_by_class_type(_input, CMOutcomes)
                cmOutcomesNodes = get_input_nodes_by_class_type_from_results(_input, CMOutcomes)
                for node in cmOutcomesNodes:
                    self.outComesCohortIds.append(node.cohortId)

                rCreateTargetComparatorOutcomes = rCohortMethod.createTargetComparatorOutcomes(
                    targetId = convert_py_to_R(self.targetId),
                    comparatorId = convert_py_to_R(self.comparatorId),
                    outcomes = rappend(*rOutcomes) if len(rOutcomes) > 1 else rOutcomes[0], # append all outcomes as one list
                    excludedCovariateConceptIds = convert_py_to_R(self.excludedCovariateConceptIds if len(self.excludedCovariateConceptIds) else None), # if excludedCovariateConceptIds is empty list, use None
                    includedCovariateConceptIds = convert_py_to_R(self.includedCovariateConceptIds if len(self.includedCovariateConceptIds) else None) # if includedCovariateConceptIds is empty list, use None
                )
                return Result(False,  rCreateTargetComparatorOutcomes, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class CohortMethodAnalysis(Node):
    def __init__(self, node):
        super().__init__(node)
        self.analysisId = int(node["analysisId"])
        self.dbCohortMethodDataArgs = node["dbCohortMethodDataArgs"] # required
        self.studyPopArgs = node['createStudyPopArgs'] # required
        self.fitOutcomeModelArgs = node.get("fitOutcomeModelArgs", None)
        self.psArgs = node.get("psArgs", None)


    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rCohortMethod = ro.packages.importr('CohortMethod')
                rCreateCmAnalysis = rCohortMethod.createCmAnalysis
                rCreateGetDbCohortMethodDataArgs = rCohortMethod.createGetDbCohortMethodDataArgs
                covarSettings = { "id": uuid.uuid4(), "type": "default_covariate_settings_node", "flowOptions": self.flowOptions }
                covarSettingsNode = DefaultCovariateSettingsNode(covarSettings)
                covarSettingsResult = covarSettingsNode.task(task_run_context)
                rGetDbCmDataArgs = rCreateGetDbCohortMethodDataArgs(
                    washoutPeriod = convert_py_to_R(self.dbCohortMethodDataArgs["washoutPeriod"]),
                    firstExposureOnly = convert_py_to_R(self.dbCohortMethodDataArgs["firstExposureOnly"]),
                    removeDuplicateSubjects = convert_py_to_R(self.dbCohortMethodDataArgs["removeDuplicateSubjects"]),
                    maxCohortSize = convert_py_to_R(self.dbCohortMethodDataArgs["maxCohortSize"]),
                    covariateSettings = covarSettingsResult.data
                )
                if self.fitOutcomeModelArgs:
                    rFitOutcomeModelArgs = rCohortMethod.createFitOutcomeModelArgs(modelType = convert_py_to_R(self.fitOutcomeModelArgs["modelType"]))
                rCreateCreateStudyPopulationArgs = rCohortMethod.createCreateStudyPopulationArgs
                rCreateStudyPopArgs = rCreateCreateStudyPopulationArgs(
                    riskWindowStart = convert_py_to_R(self.studyPopArgs["riskWindowStart"]),
                    startAnchor = convert_py_to_R(self.studyPopArgs["startAnchor"]),
                    riskWindowEnd = convert_py_to_R(self.studyPopArgs["riskWindowEnd"]),
                    endAnchor = convert_py_to_R(self.studyPopArgs["endAnchor"]),
                    firstExposureOnly = convert_py_to_R(self.studyPopArgs["firstExposureOnly"]),
                    priorOutcomeLookback = convert_py_to_R(self.studyPopArgs["priorOutcomeLookback"]),
                    removeDuplicateSubjects = convert_py_to_R(self.studyPopArgs["removeDuplicateSubjects"]),
                    removeSubjectsWithPriorOutcome = convert_py_to_R(self.studyPopArgs["removeSubjectsWithPriorOutcome"])
                )
                # matchOnPsArgs = matchOnPsArgs,
                # computeSharedCovariateBalanceArgs = computeSharedCovBalArgs,
                # computeCovariateBalanceArgs = computeCovBalArgs,
                # UI does not support above configs, therefore backend also cannot suppor them for now
                rCmAnalysis = rCreateCmAnalysis(
                    analysisId = convert_py_to_R(self.analysisId),
                    description = "cohort method analysis",
                    getDbCohortMethodDataArgs = rGetDbCmDataArgs,
                    createStudyPopArgs = rCreateStudyPopArgs,
                    fitOutcomeModelArgs = rFitOutcomeModelArgs
                )
                return Result(False,  rCmAnalysis, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class CohortMethodModuleSpecNode(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.cohortIds = []
        self.trueEffectSize = _node["trueEffectSize"]
        self.priorOutcomeLookback = _node["priorOutcomeLookback"]
        df_analysesToExclude = pd.DataFrame(_node["cohortMethodConfigs"])
        self.analysesToExclude = None if df_analysesToExclude.empty else df_analysesToExclude

    def task(self, _input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rCmAnalysisList = []
                rStrategus = ro.packages.importr('Strategus')
                rCohortMethodModule = rStrategus.CohortMethodModule['new']()
                rCreateCohortMethodModuleSpecifications = rCohortMethodModule['createModuleSpecifications']
                try:
                    rCmAnalysisList = get_results_by_class_type(_input, CohortMethodAnalysis)
                except Exception as e:
                    rCmAnalysisList = [] # empty list if no results found
                try:
                    rCmAnalysisList.extend(get_results_by_class_type(_input, KaplanMeierCMAnalysis))
                except Exception as e:
                    rCmAnalysisList = [] # empty list if no results found
                rTargetComparatorOutcomesList = get_results_by_class_type(_input, TargetComparatorOutcomes)
                targetComparatorOutcomesNodes = get_input_nodes_by_class_type_from_results(_input, TargetComparatorOutcomes)
                for node in targetComparatorOutcomesNodes:
                    self.cohortIds.append(node.targetId)
                    self.cohortIds.append(node.comparatorId)
                    self.cohortIds.extend(node.outComesCohortIds)
                rCohortMethodSpec = rCreateCohortMethodModuleSpecifications(
                    cmAnalysisList = rCmAnalysisList,
                    targetComparatorOutcomesList = rTargetComparatorOutcomesList,
                    analysesToExclude = convert_py_to_R(self.analysesToExclude)
                )
                return Result(False,  rCohortMethodSpec, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)
    
    def test(self):
        return None


class EraCovariateSettings(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.label = _node["label"]
        self.includeEraIds = _node["includedEraIds"]
        self.excludeEraIds = _node["excludedEraIds"]
        self.firstOccurrenceOnly = _node["firstOccurenceOnly"]
        self.allowRegularization = _node["allowRegularization"]
        self.stratifyById = _node["stratifyById"]
        self.start = int(_node["start"])
        self.end = int(_node["end"])
        self.startAnchor = _node.get("startAnchor", "era start") # default in the R lib is "era start"
        self.endAnchor = _node.get("endAnchor", "era end") # default in the R lib is "era end"
        self.profileLikelihood = _node["profileLikelihood"]
        self.exposureOfInterest = _node["exposureOfInterest"]

    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rSelfControlledCaseSeries = ro.packages.importr('SelfControlledCaseSeries')
                rCreateEraCovariateSettings = rSelfControlledCaseSeries.createEraCovariateSettings
                rCovarPreExp = rCreateEraCovariateSettings(
                    label = convert_py_to_R(self.label),
                    includeEraIds = convert_py_to_R(self.includeEraIds if len(self.includeEraIds) else None),
                    excludeEraIds = convert_py_to_R(self.excludeEraIds if len(self.excludeEraIds) else None),
                    start = convert_py_to_R(self.start) ,
                    end = convert_py_to_R(self.end),
                    startAnchor = convert_py_to_R(self.startAnchor if self.startAnchor != "" else "era start") ,
                    endAnchor = convert_py_to_R(self.endAnchor if self.endAnchor != "" else "era end"),
                    firstOccurrenceOnly = convert_py_to_R(self.firstOccurrenceOnly),
                    allowRegularization = convert_py_to_R(self.allowRegularization),
                    stratifyById = convert_py_to_R(self.stratifyById),
                    profileLikelihood = convert_py_to_R(self.profileLikelihood),
                    exposureOfInterest = convert_py_to_R(self.exposureOfInterest)
                )
                return Result(False,  rCovarPreExp, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class CalendarCovariateSettingsNode(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.calendarTimeKnots = _node['caldendarTimeKnots'] # TODO: typo caldendarTimeKnots to calendarTimeKnots
        self.allowRegularization = _node['allowRegularization']
        self.computeConfidenceIntervals = _node['computeConfidenceIntervals']

    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rSelfControlledCaseSeries = ro.packages.importr('SelfControlledCaseSeries')
                rCreateCalendarTimeCovariateSettings = rSelfControlledCaseSeries.createCalendarTimeCovariateSettings
                rCalendarTimeSettings = rCreateCalendarTimeCovariateSettings(
                    calendarTimeKnots = convert_py_to_R(self.calendarTimeKnots),
                    allowRegularization = convert_py_to_R(self.allowRegularization),
                    computeConfidenceIntervals = convert_py_to_R(self.computeConfidenceIntervals)
                )
                return Result(False,  rCalendarTimeSettings, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class SeasonalityCovariateSettingsNode(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.seasonKnots = _node['seasonalityKnots'] # TODO: a typo seasonalityKnots to seasonKnots? 
        self.allowRegularization = _node['allowRegularization']
        self.computeConfidenceIntervals = _node['computeConfidenceIntervals']

    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rSelfControlledCaseSeries = ro.packages.importr('SelfControlledCaseSeries')
                rCreateSeasonalityCovariateSettings = rSelfControlledCaseSeries.createSeasonalityCovariateSettings
                rSeasonalitySettings = rCreateSeasonalityCovariateSettings(
                    seasonKnots = convert_py_to_R(self.seasonKnots),
                    allowRegularization = convert_py_to_R(self.allowRegularization),
                    computeConfidenceIntervals = convert_py_to_R(self.computeConfidenceIntervals)
                )
                return Result(False,  rSeasonalitySettings, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class StudyPopulationArgs(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.sccsArgs = _node["sccsArgs"]
        self.patientLevelPredictionArgs = _node["patientLevelPredictionArgs"]
        self.cohortMethodArgs = _node["cohortMethodArgs"]

    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                data = {}
                if(self.sccsArgs):
                    rSelfControlledCaseSeries = ro.packages.importr('SelfControlledCaseSeries')
                    rCreateCreateStudyPopulationArgs = rSelfControlledCaseSeries.createCreateStudyPopulationArgs
                    rCreateStudyPopulation6AndOlderArgs = rCreateCreateStudyPopulationArgs(
                        minAge = convert_py_to_R(self.sccsArgs["minAge"]),
                        naivePeriod = convert_py_to_R(self.sccsArgs["naivePeriod"]),
                    )
                    data['sccsArgs'] = rCreateStudyPopulation6AndOlderArgs

                rCreateStudyPopArgs = None
                if(self.cohortMethodArgs):
                    rCohortMethod = ro.packages.importr('CohortMethod')
                    rCreateCreateStudyPopulationArgs = rCohortMethod.createCreateStudyPopulationArgs
                    rCreateStudyPopArgs = rCreateCreateStudyPopulationArgs(
                        minDaysAtRisk = convert_py_to_R(self.cohortMethodArgs["minDaysAtRisk"]),
                        riskWindowStart = convert_py_to_R(self.cohortMethodArgs["riskWindowStart"]),
                        startAnchor = convert_py_to_R(self.cohortMethodArgs["startAnchor"]),
                        riskWindowEnd = convert_py_to_R(self.cohortMethodArgs["riskWindowEnd"]),
                        endAnchor = convert_py_to_R(self.cohortMethodArgs["endAnchor"])
                    )
                    data['cohortMethodArgs'] = rCreateStudyPopArgs

                rPlpPopulationSettings = None
                if(self.patientLevelPredictionArgs):
                    rPatientLevelPrediction = ro.packages.importr('PatientLevelPrediction')
                    rPlpPopulationSettings = rPatientLevelPrediction.createStudyPopulationSettings(
                        startAnchor = convert_py_to_R(self.patientLevelPredictionArgs["startAnchor"]),
                        riskWindowStart = convert_py_to_R(self.patientLevelPredictionArgs["riskWindowStart"]),
                        endAnchor = convert_py_to_R(self.patientLevelPredictionArgs["endAnchor"]),
                        riskWindowEnd = convert_py_to_R(self.patientLevelPredictionArgs["riskWindowEnd"]),
                        minTimeAtRisk = convert_py_to_R(self.patientLevelPredictionArgs["minTimeAtRisk"]),
                    )
                    data['patientLevelPredictionArgs'] = rPlpPopulationSettings

                return Result(False,  data, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)

    def test(self):
        return None


class NegativeControlCohortSet(Node):
    def __init__(self, node):
        super().__init__(node)

    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rCohortGenerator = ro.packages.importr('CohortGenerator')
                rSystemFile = ro.r['system.file']
                rReadCsv = rCohortGenerator.readCsv
                rFile = rSystemFile('testdata/negative_controls_concept_set.csv', package='Strategus')
                # hardcoded to use testdata in Strategus R package
                rNcoCohortSet = rReadCsv(file=rFile)
                return Result(False,  rNcoCohortSet, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class SCCSAnalysis(Node):
    def __init__(self, node):
        super().__init__(node)
        self.analysisId = node["analysisId"]
        self.dbSccsDataArgs = node['dbSccsDataArgs'] # startDate, endDate must be in the format 'yyyymmdd', else ""
        self.fitSccsModelArgs = node['fitSccsModelArgs']
        self.sccsIntervalDataArgs = node['sccsIntervalDataArgs']

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rSelfControlledCaseSeries = ro.packages.importr('SelfControlledCaseSeries')
                rCreateSccsAnalysis = rSelfControlledCaseSeries.createSccsAnalysis

                rCreateGetDbSccsDataArgs = rSelfControlledCaseSeries.createGetDbSccsDataArgs
                rGetDbSccsDataArgs = rCreateGetDbSccsDataArgs(
                    studyStartDate = convert_py_to_R(self.dbSccsDataArgs['studyStartDate']) if not self.dbSccsDataArgs['studyStartDate'] == "" else ro.StrVector(""),
                    studyEndDate = convert_py_to_R(self.dbSccsDataArgs['studyEndDate']) if not self.dbSccsDataArgs['studyEndDate'] == "" else ro.StrVector(""),
                    maxCasesPerOutcome = convert_py_to_R(self.dbSccsDataArgs['maxCasesPerOutcome']),
                    nestingCohortId = convert_py_to_R(self.dbSccsDataArgs['nestingCohortId']),
                    deleteCovariatesSmallCount = convert_py_to_R(self.dbSccsDataArgs['deleteCovariateSmallCount'])
                )

                studyPopulationResults = get_results_by_class_type(input, StudyPopulationArgs)
                # filter sccsArgs from StudyPopulationResults (as it contains other args)
                rCreateStudyPopulation6AndOlderArgs = [r["sccsArgs"] for r in studyPopulationResults if r["sccsArgs"] != None]
                if(len(rCreateStudyPopulation6AndOlderArgs) > 0):
                    rCreateStudyPopulation6AndOlderArgs = rCreateStudyPopulation6AndOlderArgs[0]
                else:
                    raise ValueError("Expected at least one input of type: StudyPopulationArgs with sccsArgs")

                rCreateCreateSccsIntervalDataArgs = rSelfControlledCaseSeries.createCreateSccsIntervalDataArgs
                rCreateSccsIntervalDataArgs = rCreateCreateSccsIntervalDataArgs(
                    eraCovariateSettings = get_results_by_class_type(input, EraCovariateSettings)
                )

                rCreateFitSccsModelArgs = rSelfControlledCaseSeries.createFitSccsModelArgs
                rCyclops = ro.packages.importr('Cyclops')
                rCreateControl = rCyclops.createControl
                rFitSccsModelArgs = rCreateFitSccsModelArgs(
                    control = rCreateControl(
                        cvType = convert_py_to_R(self.fitSccsModelArgs["cvType"]),
                        selectorType = convert_py_to_R(self.fitSccsModelArgs["selectorType"]),
                        startingVariance = convert_py_to_R(self.fitSccsModelArgs["startingVariance"]),
                        seed = convert_py_to_R(self.fitSccsModelArgs["seed"]),
                        resetCoefficients = convert_py_to_R(self.fitSccsModelArgs["resetCoefficients"]),
                        noiseLevel = convert_py_to_R(self.fitSccsModelArgs["noiseLevel"])
                    )
                )

                rSccsAnalysis = rCreateSccsAnalysis(
                    analysisId = self.analysisId,
                    description = "sccs analysis",
                    getDbSccsDataArgs = rGetDbSccsDataArgs,
                    createStudyPopulationArgs = rCreateStudyPopulation6AndOlderArgs,
                    createIntervalDataArgs = rCreateSccsIntervalDataArgs,
                    fitSccsModelArgs = rFitSccsModelArgs
                )            
                return Result(False,  rSccsAnalysis, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class SCCSModuleSpec(Node):
    def __init__(self, node):
        super().__init__(node)
        self.combineDataFetchAcrossOutcomes = node["combineDataFetchAcrossOutcomes"]

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rStrategus = ro.packages.importr('Strategus')
                rSccsModule = rStrategus.SelfControlledCaseSeriesModule['new']()
                rCreatSelfControlledCaseSeriesModuleSpecifications = rSccsModule['createModuleSpecifications']
                rSccsAnalysisList = get_results_by_class_type(input, SCCSAnalysis)
                rSccsModuleSpec = rCreatSelfControlledCaseSeriesModuleSpecifications(
                    sccsAnalysisList = rSccsAnalysisList,
                    exposuresOutcomeList = get_results_by_class_type(input, ExposuresOutcome), 
                    combineDataFetchAcrossOutcomes = convert_py_to_R(self.combineDataFetchAcrossOutcomes)
                )
                return Result(False,  rSccsModuleSpec, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class PLPModuleSpec(Node):
    def __init__(self, node):
        super().__init__(node)

    def makeModelDesignSettings(self, rTargetId, rOutcomeId, rPopSettings, rCovarSettings):
        rPatientLevelPrediction = ro.packages.importr('PatientLevelPrediction')
        rCreateModelDesign = rPatientLevelPrediction.createModelDesign
        rRestrictPlpDataSettings = rPatientLevelPrediction.createRestrictPlpDataSettings()
        rPreprocessSettings = rPatientLevelPrediction.createPreprocessSettings()
        rModelSettings = rPatientLevelPrediction.setLassoLogisticRegression()
        rSplitSettings = rPatientLevelPrediction.createDefaultSplitSetting()
        return rCreateModelDesign(
            targetId = rTargetId,
            outcomeId = rOutcomeId,
            restrictPlpDataSettings = rRestrictPlpDataSettings,
            populationSettings = rPopSettings,
            covariateSettings = rCovarSettings,
            preprocessSettings = rPreprocessSettings,
            modelSettings = rModelSettings,
            splitSettings = rSplitSettings,
            runCovariateSummary = convert_py_to_R(True) # hardcoded, TODO: UI is not yet configuratble on this option
        )

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                studyPopulationResults = get_results_by_class_type(input, StudyPopulationArgs)
                # filter patientLevelPredictionArgs from StudyPopulationResults (as it contains other args)
                rPlpPopulationSettings = [r["patientLevelPredictionArgs"] for r in studyPopulationResults if r["patientLevelPredictionArgs"] != None]
                rPlpCovarSettings = get_results_by_class_type(input, DefaultCovariateSettingsNode)
                rModelDesignList = []
                exposureOutcomes = get_input_nodes_by_class_type_from_results(input, ExposuresOutcome)

                for e in exposureOutcomes:
                    for i in range(len(e.exposureOfInterestIds)):
                        for j in range(len(e.outcomeOfInterestIds)):
                            rModelDesignSettings = self.makeModelDesignSettings(
                                rTargetId = e.exposureOfInterestIds[i],
                                rOutcomeId = e.outcomeOfInterestIds[j],
                                rPopSettings = rPlpPopulationSettings,
                                rCovarSettings = rPlpCovarSettings
                            )
                            rModelDesignList.append([rModelDesignSettings])

                rStrategus = ro.packages.importr('Strategus')
                rPlpModule = rStrategus.PatientLevelPredictionModule['new']()
                rCreatePatientLevelPredictionModuleSpecifications = rPlpModule['createModuleSpecifications']
                rPlpModuleSpecifications = rCreatePatientLevelPredictionModuleSpecifications(modelDesignList = rModelDesignList)
                return Result(False,  rPlpModuleSpecifications, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class ExposuresOutcome(Node):
    def __init__(self, node):
        super().__init__(node)
        self.outcomeOfInterestIds = node["outcomeOfInterestIds"]
        self.exposureOfInterestIds = node["exposureOfInterestIds"]

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rSelfControlledCaseSeries = ro.packages.importr('SelfControlledCaseSeries')
                rExposuresOutcomeList = []
                rCreateExposuresOutcome = rSelfControlledCaseSeries.createExposuresOutcome
                rCreateExposure = rSelfControlledCaseSeries.createExposure
                for e in self.exposureOfInterestIds:
                    rNegativeControlOutcomeIds = []
                    rNcoCohortSets = get_results_by_class_type(input, NegativeControlCohortSet)
                    for cohortSet in rNcoCohortSets: 
                        rNegativeControlOutcomeIds.extend(cohortSet.rx('cohortId')[0])
                    for o in self.outcomeOfInterestIds:
                        rExposuresOutcomeList[len(rExposuresOutcomeList) + 1] = rCreateExposuresOutcome(
                            outcomeId = o,
                            exposures = [rCreateExposure(exposureId = e)]
                        )
                    for rNegativeControlOutcomeId in rNegativeControlOutcomeIds:
                        rExposuresOutcomeList[len(rExposuresOutcomeList) + 1] = rCreateExposuresOutcome(
                            outcomeId = rNegativeControlOutcomeId,
                            exposures = [rCreateExposure(exposureId = self.exposureOfInterestId, trueEffectSize = convert_py_to_R(1))] # hardcoded, TODO: trueEffectSize is not configurable on the UI yet
                        )
                return Result(False, rExposuresOutcomeList, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)

class TreatmentPatterns(Node):
    def __init__(self, node):
        super().__init__(node)
        self.cohortIds = []
        # self.name = node["name"]
        # self.description = node["description"]
        self.ageWindow = int(node.get("ageWindow", 5))  # default 5
        self.splitTime = int(node.get("splitTime", 0))  # default 0
        self.censorType = node.get("censorType", "minCellCount")  # default "minCellCount"
        self.minCellCount = int(node.get("minCellCount", 1))  # default 1
        self.maxPathLength = int(node.get("maxPathLength", 5))  # default 5
        self.minEraDuration = int(node.get("minEraDuration", 0))  # default 0
        self.eraCollapseSize = int(node.get("eraCollapseSize", 30))  # default 30
        self.filterTreatments = node.get("filterTreatments", "First")  # default "First"
        self.combinationWindow = int(node.get("combinationWindow", 30))  # default 30
        self.startAnchor = node.get("startAnchor", "startDate")
        self.windowStart = int(node.get("windowStart", 0))
        self.endAnchor = node.get("endAnchor", "endDate")
        self.windowEnd = int(node.get("windowEnd", 0))
        self.splitEventCohorts = node.get("splitEventCohorts", None)  # default None
        self.minPostCombinationDuration = int(node.get("minPostCombinationDuration", 30))  # default 30

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rStrategus = ro.packages.importr('Strategus')
                cohortDefinitionNodes = get_input_nodes_by_class_type_from_results(input, CohortDefinitionSharedResource)
                for cohortDefinition in cohortDefinitionNodes:
                    self.cohortIds.append(cohortDefinition.cohortId)
                rTreatmentPatternsModule = rStrategus.TreatmentPatternsModule['new']()
                rCreateTreatmentPatternsModuleSpec = rTreatmentPatternsModule['createModuleSpecifications']
                cohorts_df = pd.DataFrame.from_records([{
                    'cohortId': cohortDefinitionNode.cohortId,
                    'cohortName': cohortDefinitionNode.cohortName,
                    "type": cohortDefinitionNode.cohortType.value
                } for cohortDefinitionNode in cohortDefinitionNodes])

                rSpec = rCreateTreatmentPatternsModuleSpec(
                    cohorts = convert_py_to_R(cohorts_df),
                    minEraDuration = convert_py_to_R(self.minEraDuration),
                    splitEventCohorts = convert_py_to_R(self.splitEventCohorts) if self.splitEventCohorts != "" else convert_py_to_R(None),
                    splitTime = convert_py_to_R(self.splitTime),
                    eraCollapseSize = convert_py_to_R(self.eraCollapseSize),
                    combinationWindow = convert_py_to_R(self.combinationWindow),
                    minPostCombinationDuration = convert_py_to_R(self.minPostCombinationDuration),
                    filterTreatments = convert_py_to_R(self.filterTreatments),
                    maxPathLength = convert_py_to_R(self.maxPathLength),
                    ageWindow = convert_py_to_R(self.ageWindow),
                    minCellCount = convert_py_to_R(self.minCellCount),
                    censorType = convert_py_to_R(self.censorType),
                    startAnchor = convert_py_to_R(self.startAnchor),
                    windowStart = convert_py_to_R(self.windowStart),
                    endAnchor = convert_py_to_R(self.endAnchor),
                    windowEnd = convert_py_to_R(self.windowEnd),
                )

                return Result(False, rSpec, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)

class KaplanMeierCMAnalysis(Node):
    def __init__(self, node):
        super().__init__(node)
        kmArgs = node.get("kaplanMeierArgs", None)
        if not kmArgs:
            raise ValueError("kaplanMeierArgs is required for KaplanMeierCMAnalysis")
        self.analysisId = int(kmArgs["analysisId"])
        self.dbCohortMethodDataArgs = kmArgs["getDbCohortMethodDataArgs"] # required
        self.studyPopArgs = kmArgs['createStudyPopArgs'] # required
        # self.fitOutcomeModelArgs = getattr(node, "fitOutcomeModelArgs", None)
        # self.psArgs = getattr(node, "psArgs", None)

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                rCohortMethod = ro.packages.importr('CohortMethod')
                rCreateCmAnalysis = rCohortMethod.createCmAnalysis
                rCreateGetDbCohortMethodDataArgs = rCohortMethod.createGetDbCohortMethodDataArgs
                covarSettingsNode = DefaultCovariateSettingsNode({ "type": "default_covariate_settings_node", "id": str(uuid.uuid4()), "flowOptions": self.flowOptions })
                covarSettingsResult = covarSettingsNode.task(task_run_context)
                rGetDbCmDataArgs = rCreateGetDbCohortMethodDataArgs(
                    studyStartDate = convert_py_to_R(self.dbCohortMethodDataArgs.get("studyStartDate", "")),
                    studyEndDate = convert_py_to_R(self.dbCohortMethodDataArgs.get("studyEndDate", "")),
                    covariateSettings = covarSettingsResult.data
                )
                rCreateCreateStudyPopulationArgs = rCohortMethod.createCreateStudyPopulationArgs
                rCreateStudyPopArgs = rCreateCreateStudyPopulationArgs(
                    riskWindowStart = convert_py_to_R(self.studyPopArgs["riskWindowStart"]),
                    startAnchor = convert_py_to_R(self.studyPopArgs["startAnchor"]),
                    riskWindowEnd = convert_py_to_R(self.studyPopArgs["riskWindowEnd"]),
                    endAnchor = convert_py_to_R(self.studyPopArgs["endAnchor"]),
                    firstExposureOnly = convert_py_to_R(self.studyPopArgs["firstExposureOnly"]),
                    priorOutcomeLookback = convert_py_to_R(self.studyPopArgs["priorOutcomeLookback"]),
                    removeDuplicateSubjects = convert_py_to_R(self.studyPopArgs["removeDuplicateSubjects"]),
                    removeSubjectsWithPriorOutcome = convert_py_to_R(self.studyPopArgs["removeSubjectsWithPriorOutcome"])
                )
                rCmAnalysis = rCreateCmAnalysis(
                    analysisId = convert_py_to_R(self.analysisId),
                    description = "cohort method analysis",
                    getDbCohortMethodDataArgs = rGetDbCmDataArgs,
                    createStudyPopArgs = rCreateStudyPopArgs,
                )
                return Result(False,  rCmAnalysis, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class StrategusNode(Node):
    def __init__(self, node):
        super().__init__(node)
        self.sharedResourcesTypes = [CohortDefinitionSharedResource, NegativeControlOutcomeCohortSharedResource] 
        self.moduleSpecTypes = [CohortGeneratorSpecNode, CohortDiagnosticsModuleSpecNode, CohortIncidenceModuleSpec, CharacterizationModuleSpecNode, CohortMethodModuleSpecNode, TreatmentPatterns]

    def find_cohort_definition_nodes(self, results: List[Result]):
        return [results[nodename].data for nodename in results if isinstance(results[nodename].node, CohortDefinitionSharedResource)]

    def task(self, nodes, results, task_run_context):
        with ro.default_converter.context():
            try:
                ro.r(set_trex_env_var(USE_TREX_CONNECTION))
                print('Executing Strategus')
                rStrategus = ro.packages.importr('Strategus')
                rParallelLogger = importr('ParallelLogger')
                rSpec = rStrategus.createEmptyAnalysisSpecificiations()

                sharedResourceResults = self.find_cohort_definition_nodes(results)
                for result in sharedResourceResults:
                    rSharedResource = result["cohortDefinitionSharedResource"]
                    rSpec = rStrategus.addSharedResources(rSpec, rSharedResource)
                    rCohortGeneratorModuleSpecifications = result["cohortGeneratorModuleSpecifications"]
                    rSpec = rStrategus.addModuleSpecifications(rSpec, rCohortGeneratorModuleSpecifications)

                for moduleSpecType in self.moduleSpecTypes:
                    try:
                        moduleSpecResults = get_results_by_class_type(results, moduleSpecType)
                        for moduleSpec in moduleSpecResults:
                            rSpec = rStrategus.addModuleSpecifications(rSpec, moduleSpec)
                    except Exception as e:
                        continue # exception can be ignored

                databaseConnectorJarFolder = '/app/inst/drivers'
                os.environ['DATABASECONNECTOR_JAR_FOLDER'] = databaseConnectorJarFolder
                dbSettings = { "database_code": self.flowOptions["databaseCode"], "schema_name": self.flowOptions["schemaName"], "dataset_id": self.flowOptions["datasetId"] }
                dbdao = DBDao(
                    dialect=SupportedDatabaseDialects.TREX if USE_TREX_CONNECTION else None,
                    use_cache_db=False,
                    database_code=dbSettings['database_code']
                )
                db_credentials = dbdao.tenant_configs
                rDatabaseConnector = ro.packages.importr('DatabaseConnector')
                rConnectionDetails = rDatabaseConnector.createConnectionDetails(
                    dbms=dbdao.get_database_connector_dbms_val(), 
                    connectionString=dbdao.get_database_connector_connection_string(),
                    user=db_credentials.adminUser,
                    password=db_credentials.adminPassword.get_secret_value(),
                    pathToDriver = databaseConnectorJarFolder
                )
                task_run = TaskRunContext.get().task_run.dict()
                flow_run_id = str(task_run.get("flow_run_id"))
                base_path = f'/tmp/{flow_run_id}'
                work_folder = f'{base_path}/work'
                path_to_results = f'{base_path}/results'

                executionSettings = getRCdmExecutionSettings({
                    "schemaName": dbSettings['schema_name'],
                    "workFolder": work_folder,
                    "resultsFolder": path_to_results
                })
                rExecutionSettings = rParallelLogger.convertJsonToSettings(executionSettings)
                analysisSpecJson = convert_R_to_py(rParallelLogger.convertSettingsToJson(rSpec))

                execute(rSpec, rExecutionSettings, rConnectionDetails)
                return Result(False, analysisSpecJson, self, task_run_context)
            except Exception as e:
                print('Error: ', tb.format_exc())
                return Result(True, tb.format_exc(), self, task_run_context)

def get_strategus_node(options):
    return StrategusNode({"id": str(uuid.uuid4()), "type": "strategus_node", "flowOptions": options})

@flow(name="execute-r-strategus",
      log_prints=True)
def execute_r_strategus(analysisSpec: str, executionSettings, dbSettings):
    with ro.default_converter.context():
        try:
            ro.r(set_trex_env_var(USE_TREX_CONNECTION))
            database_code = dbSettings['database_code']
            rParallelLogger = importr('ParallelLogger')
            rDatabaseConnector = importr('DatabaseConnector')
            databaseConnectorJarFolder = '/app/inst/drivers'

            dbdao = DBDao(
                dialect=SupportedDatabaseDialects.TREX if USE_TREX_CONNECTION else None,
                use_cache_db=False,
                database_code=database_code
            )
            db_credentials = dbdao.tenant_configs
            print(f"Connecting to database...: {dbdao.get_database_connector_connection_string()}")
            print(f"Using schema: {db_credentials.adminUser} {db_credentials.adminPassword.get_secret_value()}")
            rConnectionDetails = rDatabaseConnector.createConnectionDetails(
                dbms=dbdao.get_database_connector_dbms_val(), 
                connectionString=dbdao.get_database_connector_connection_string(),
                user=db_credentials.adminUser,
                password=db_credentials.adminPassword.get_secret_value(),
                pathToDriver=databaseConnectorJarFolder
            )

            rExecutionSettings = rParallelLogger.convertJsonToSettings(executionSettings)
            rAnalysisSpec = rParallelLogger.convertJsonToSettings(analysisSpec)

            print('Strategus execution started...')
            execute(rAnalysisSpec, rExecutionSettings, rConnectionDetails)
        except Exception as e:
            print('Error: ', tb.format_exc())
            raise RuntimeError('Execution of strategus has failed')

def execute(rSpec, rExecutionSettings, rConnectionDetails):
    with ro.default_converter.context():
        ro.r(set_trex_env_var(USE_TREX_CONNECTION))
        rStrategus = importr('Strategus')
    try:
        rStrategus.execute(connectionDetails = rConnectionDetails, analysisSpecifications = rSpec, executionSettings = rExecutionSettings)
    except Exception as e:
        log_file_path = f"/app/errorReportSql.txt"
        # if file exists, create an artifact to store the error logs
        if os.path.exists(log_file_path):
            with open(log_file_path, "r") as f:
                file_contents = f.read()
                create_markdown_artifact(
                    key="strategus-analysis-error-logs",
                    markdown=file_contents
                )
        raise RuntimeError('Execution of strategus has failed')

@flow(name="upload-strategus-results",
      log_prints=True)
def upload_strategus_results(analysisSpec: str, path_to_results, dbSettings):
    with ro.default_converter.context():
        try:
            ro.r(set_trex_env_var(USE_TREX_CONNECTION))
            database_code = dbSettings['database_code']
            results_schema = f'results_{dbSettings["study_id"]}'
            rStrategus = importr('Strategus')
            rParallelLogger = importr('ParallelLogger')
            rDatabaseConnector = importr('DatabaseConnector')
            databaseConnectorJarFolder = '/app/inst/drivers'

            dbdao = DBDao(
                dialect=SupportedDatabaseDialects.TREX if USE_TREX_CONNECTION else None,
                use_cache_db=False,
                database_code=database_code
            )
            db_credentials = dbdao.tenant_configs
            rConnectionDetails = rDatabaseConnector.createConnectionDetails(
                dbms=dbdao.get_database_connector_dbms_val(), 
                connectionString=dbdao.get_database_connector_connection_string(),
                user=db_credentials.adminUser,
                password=db_credentials.adminPassword.get_secret_value(),
                pathToDriver = databaseConnectorJarFolder
            )
            rAnalysisSpec = rParallelLogger.convertJsonToSettings(analysisSpec)
            # create results datamodel settings
            resultsDataModelSettings = rStrategus.createResultsDataModelSettings(
                resultsDatabaseSchema = results_schema,
                resultsFolder = path_to_results,
            )

            # if schema does not exist, create one (including the data model)
            if(not dbdao.check_schema_exists(results_schema)):
                dbdao.create_schema(results_schema)
                # create results datamodel 
                rStrategus.createResultDataModel(
                    analysisSpecifications = rAnalysisSpec,
                    resultsDataModelSettings = resultsDataModelSettings,
                    resultsConnectionDetails = rConnectionDetails
                )

            # upload results to the database
            rStrategus.uploadResults(
                resultsConnectionDetails = rConnectionDetails,
                analysisSpecifications = rAnalysisSpec,
                resultsDataModelSettings = resultsDataModelSettings
            )
        except Exception as e:
            log_file_path = f"/app/errorReportSql.txt"
            # if file exists, create an artifact to store the error logs
            if os.path.exists(log_file_path):
                with open(log_file_path, "r") as f:
                    file_contents = f.read()
                    create_markdown_artifact(
                        key="strategus-analysis-error-logs",
                        markdown=file_contents
                    )
            raise RuntimeError('Uploading results of strategus has failed')

def get_results_by_class_type(results: Dict[str, Result], nodeType: Node):
    result = [results[o].data for o in results if not results[o].error and isinstance(results[o].node, nodeType)]
    assert len(result) > 0, f"Expected at least one input of type: {nodeType.__class__}"
    return result

def get_input_nodes_by_class_type_from_results(inputs: Dict[str, Result], nodeType: Node) -> List[Node]:
    return [inputs[o].node for o in inputs if not inputs[o].error and isinstance(inputs[o].node, nodeType)]

def serialize_result_to_json(result: Result):
    return serialize_to_json(result.data)

def construct_jdbc_url(db_credentials):
    return f'{getattr(DialectDrivers.jdbc, db_credentials.dialect)}://{db_credentials.host}:{db_credentials.port}/{db_credentials.databaseName}'

@flow(name="drop-strategus-results-schema", log_prints=True)
def drop_strategus_results_schema(dbSettings):
    database_code = dbSettings['database_code']
    results_schema = f'results_{dbSettings["study_id"]}'
    dbdao = DBDao(
        dialect=SupportedDatabaseDialects.TREX if USE_TREX_CONNECTION else None,
        use_cache_db=False,
        database_code=database_code
    )

    if(dbdao.check_schema_exists(results_schema)):
        dbdao.drop_schema(results_schema, True)
    else:
        raise Exception(f"Schema {results_schema} not found")

def getRCdmExecutionSettings(settings) -> str:
    with ro.default_converter.context():
        try:
            ro.r(set_trex_env_var(USE_TREX_CONNECTION))
            rStrategus = importr('Strategus')
            rParallelLogger = importr('ParallelLogger')
            rCohortGenerator = importr('CohortGenerator')

            rExecutionSettings = rStrategus.createCdmExecutionSettings(
                workDatabaseSchema = settings['schemaName'],
                cdmDatabaseSchema = settings['schemaName'],
                cohortTableNames = rCohortGenerator.getCohortTableNames(cohortTable = "cohort"),
                workFolder = settings['workFolder'],
                resultsFolder = settings['resultsFolder'],
                minCellCount = 5,
                maxCores = 1 if USE_TREX_CONNECTION is True else 8
            )
            return convert_R_to_py(rParallelLogger.convertSettingsToJson(rExecutionSettings))
        except Exception as e:
            print('Error: ', e)
            raise RuntimeError('Execution of strategus has failed')