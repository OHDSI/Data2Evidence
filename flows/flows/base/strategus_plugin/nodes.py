import os
import logging
import pandas as pd
from rpy2 import robjects as ro
import traceback as tb
from functools import partial
from typing import List, Dict

from prefect import task, flow
from prefect.variables import Variable
from prefect.blocks.system import Secret

from flows.strategus_plugin.hooks import node_task_generation_hook
from flows.strategus_plugin.flowutils import get_node_list, convert_py_to_R, serialize_to_json

from shared_utils.types import UserType
from shared_utils.dao.DBDao import DBDao

class Node:
    def __init__(self, node):
        self.id = node["id"]
        self.type = node["type"]


class Flow(Node):
    def __init__(self, _node):
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

@flow(name="generate-nodes",
      flow_run_name="generate-nodes-flowrun",
      log_prints=True)
def generate_nodes_flow(graph, sorted_nodes):
    for nodename in sorted_nodes:
        node = graph["nodes"][nodename]
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
        case "cohort_definition_set_node":
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
                rCohortIncidence = ro.packages.importr('CohortIncidence')
                rTimeAtRisk = rCohortIncidence.createTimeAtRiskDef(
                    id = convert_py_to_R(self.id),
                    startWith = self["startWith"],
                    endWith = self["endWith"],
                    startOffset = convert_py_to_R(self.startOffset),
                    endOffset = convert_py_to_R(self.endOffset)
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
                rSource = ro.r['source']
                rSource('https://raw.githubusercontent.com/OHDSI/CohortIncidenceModule/v0.4.0/SettingsFunctions.R')
                rCohortIncidence = ro.packages.importr('CohortIncidence')
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
                rOutcomes = [], rTars = []
                rOutcomes = get_results_by_class_type(input, OutcomeDef)
                rTars = get_results_by_class_type(input, TimeAtRiskNode)
                rIncidenceDesign = rCohortIncidence.createIncidenceDesign(
                    targetDefs = rTargets,
                    outcomeDefs = rOutcomes,
                    tars = rTars,
                    analysisList = [rAnalysis1], # a list of rAnalyses is possible, for now UI supports just one
                    strataSettings = rStrataSettings
                )
                rCreateCohortIncidenceModuleSpecifications = ro.globalenv["createCohortIncidenceModuleSpecifications"]
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
        self.outcomeIds = [int(i) for i in _node["outcomeIds"]]
        self.dechallengeStopInterval = int(_node["dechallengeStopInterval"])
        self.dechallengeEvaluationWindow = int(_node["dechallengeEvaluationWindow"])
        self.minPriorObservation = _node["minPriorObservation"]
        self.timeAtRisk = _node["timeAtRiskConfigs"]

    def test(self, task_run_context):
        return None

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                rSource = ro.r['source']
                rSource("https://raw.githubusercontent.com/OHDSI/CharacterizationModule/v0.5.0/SettingsFunctions.R")
                rCreateCharacterizationModuleSpecifications = ro.globalenv['createCharacterizationModuleSpecifications']
                # ensure rCovariateSettings has at least one value
                rCovariateSettings = get_results_by_class_type(input, DefaultCovariateSettingsNode)
                rCharacterizationSpec = rCreateCharacterizationModuleSpecifications(
                    targetIds = convert_py_to_R(self.targetIds), 
                    outcomeIds = convert_py_to_R(self.outcomeIds), 
                    covariateSettings = rCovariateSettings[0], 
                    dechallengeStopInterval = self.dechallengeStopInterval, 
                    dechallengeEvaluationWindow = self.dechallengeEvaluationWindow, 
                    timeAtRisk = convert_py_to_R(pd.DataFrame(self.timeAtRisk)), 
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
                rFeatureExtraction = ro.packages.importr('FeatureExtraction')
                rCovariateSettings = rFeatureExtraction.createDefaultCovariateSettings()
                return Result(False,  rCovariateSettings, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class CohortDefinitionSharedResource(Node):
    def __init__(self, node):
        super().__init__(node)
    
    def task(self, task_run_context):
        with ro.default_converter.context():
            try:
                rCohortGenerator = ro.packages.importr('CohortGenerator')
                rGetCohortDefinitionSet = rCohortGenerator.getCohortDefinitionSet
                # hardcoded to use testdata in Strategus R package
                rCohortDefinitionSet = rGetCohortDefinitionSet(
                    settingsFileName = 'testdata/Cohorts.csv',
                    jsonFolder = 'testdata/cohorts',
                    sqlFolder = 'testdata/sql',
                    packageName = 'Strategus'
                )
                rSource = ro.r['source']
                rSource("https://raw.githubusercontent.com/OHDSI/CohortGeneratorModule/v0.3.0/SettingsFunctions.R")
                rCreateCohortSharedResourceSpecifications = ro.globalenv['createCohortSharedResourceSpecifications']
                rCohortDefinitionSharedResource = rCreateCohortSharedResourceSpecifications(cohortDefinitionSet = rCohortDefinitionSet)
                return Result(False,  rCohortDefinitionSharedResource, self, task_run_context)
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
                rSource = ro.r['source']
                rSource("https://raw.githubusercontent.com/OHDSI/CohortGeneratorModule/v0.3.0/SettingsFunctions.R")
                rNcoCohortSet = get_results_by_class_type(_input, NegativeControlCohortSet)
                rCreateNegativeControlOutcomeCohortSharedResourceSpecifications = ro.globalenv['createNegativeControlOutcomeCohortSharedResourceSpecifications']
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
        self.incremental = _node["incremental"] # Ensure boolean
        self.generate_stats = _node["generateStats"] # Ensure boolean

    def task(self, task_run_context):
        with ro.default_converter.context():
            try: 
                rSource = ro.r['source']
                rSource(Variable.get("cohort_generator_module_settings_url"))
                rCreateCohortGeneratorModuleSpecifications = ro.globalenv['createCohortGeneratorModuleSpecifications']
                rCohortGeneratorModuleSpecifications = rCreateCohortGeneratorModuleSpecifications(convert_py_to_R(self.incremental), convert_py_to_R(self.generate_stats))
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
                rSource = ro.r['source']
                rSource(Variable.get("cohort_diagnostics_module_settings_url"))
                rCreateCohortDiagnosticsModuleSpecifications = ro.globalenv["createCohortDiagnosticsModuleSpecifications"]
                rCohortDiagnosticsSpec = rCreateCohortDiagnosticsModuleSpecifications(
                    runInclusionStatistics = convert_py_to_R(self.runInclusionStatistics),
                    runIncludedSourceConcepts = convert_py_to_R(self.runIncludedSourceConcepts),
                    runOrphanConcepts = convert_py_to_R(self.runOrphanConcepts),
                    runTimeSeries = convert_py_to_R(self.runTimeSeries),
                    runVisitContext = convert_py_to_R(self.runVisitContext),
                    runBreakdownIndexEvents = convert_py_to_R(self.runBreakdownIndexEvents),
                    runIncidenceRate = convert_py_to_R(self.runIncidenceRate),
                    runCohortRelationship = convert_py_to_R(self.runCohortRelationship),
                    runTemporalCohortCharacterization = convert_py_to_R(self.runTemporalCohortCharacterization),
                    incremental = convert_py_to_R(self.incremental)
                )
                return Result(False,  rCohortDiagnosticsSpec, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class CMOutcomes(Node):
    def __init__(self, node):
        super().__init__(node)
        self.ncoCohortSetIds = [int(i) for i in node['ncoCohortSetIds']]
        self.config = {
            "trueEffectSize": node["trueEffectSize"],
            "outcomeOfInterest": node["outcomeOfInterest"],
            "priorOutcomeLookback": node["priorOutcomeLookback"]
        }

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                rCohortMethod = ro.packages.importr('CohortMethod')
                rlapply = ro.r['lapply']
                kwargs = {i[0]: i[1] for i in self.config.items() if (i[1] != "" or i[1] is False)}
                rOutcome = rlapply(
                    X = convert_py_to_R(self.ncoCohortSetIds),
                    FUN = rCohortMethod.createOutcome,
                    **kwargs
                )
                return Result(False,  rOutcome, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class TargetComparatorOutcomes(Node):
    
    def __init__(self, _node):
        super().__init__(_node)
        self.targetId = int(_node['targetId'])
        self.comparatorId = int(_node['comparatorId'])
        self.includedCovariateConceptIds = [int(i) for i in _node['includedCovariateConceptIds']]
        self.excludedCovariateConceptIds = [int(i) for i in _node['excludedCovariateConceptIds']]

    def test(self):
        return None

    def task(self, _input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                rappend = ro.r['append']
                rCohortMethod = ro.packages.importr('CohortMethod')
                rOutcomes = get_results_by_class_type(_input, CMOutcomes)
                rCreateTargetComparatorOutcomes = rCohortMethod.createTargetComparatorOutcomes(
                    targetId = convert_py_to_R(self.targetId),
                    comparatorId = convert_py_to_R(self.comparatorId),
                    outcomes = rappend(*rOutcomes), # append all outcomes as one list
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
        self.dbCohortMethodDataArgs = node["dbCohortMethodDataArgs"]
        self.fitOutcomeModelArgs = node["fitOutcomeModelArgs"]
        self.psArgs = node["psArgs"]

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                rCohortMethod = ro.packages.importr('CohortMethod')
                rCreateCmAnalysis = rCohortMethod.createCmAnalysis
                rCreateGetDbCohortMethodDataArgs = rCohortMethod.createGetDbCohortMethodDataArgs
                rCovarSettings = get_results_by_class_type(input, DefaultCovariateSettingsNode)
                rGetDbCmDataArgs = rCreateGetDbCohortMethodDataArgs(
                    washoutPeriod = convert_py_to_R(self.dbCohortMethodDataArgs["washoutPeriod"]),
                    firstExposureOnly = convert_py_to_R(self.dbCohortMethodDataArgs["firstExposureOnly"]),
                    removeDuplicateSubjects = convert_py_to_R(self.dbCohortMethodDataArgs["removeDuplicateSubjects"]),
                    maxCohortSize = convert_py_to_R(self.dbCohortMethodDataArgs["maxCohortSize"]),
                    covariateSettings = rCovarSettings[0]
                )
                rFitOutcomeModelArgs = rCohortMethod.createFitOutcomeModelArgs(modelType = convert_py_to_R(self.fitOutcomeModelArgs["modelType"]))
                studyPopulationResults = get_results_by_class_type(input, StudyPopulationArgs)
                rCreateStudyPopArgs = [r["cohortMethodArgs"] for r in studyPopulationResults if r["cohortMethodArgs"] != None]
                assert len(rCreateStudyPopArgs) > 0, f"Expected at least one input of type: Cohort Method args in {StudyPopulationArgs.__class__}"
                # matchOnPsArgs = matchOnPsArgs,
                # computeSharedCovariateBalanceArgs = computeSharedCovBalArgs,
                # computeCovariateBalanceArgs = computeCovBalArgs,
                # UI does not support above configs, therefore backend also cannot suppor them for now
                rCmAnalysis = rCreateCmAnalysis(
                    analysisId = convert_py_to_R(self.analysisId),
                    description = "cohort method analysis",
                    getDbCohortMethodDataArgs = rGetDbCmDataArgs,
                    createStudyPopArgs = rCreateStudyPopArgs[0],
                    fitOutcomeModelArgs = rFitOutcomeModelArgs
                )
                return Result(False,  rCmAnalysis, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)


class CohortMethodModuleSpecNode(Node):
    def __init__(self, _node):
        super().__init__(_node)
        self.trueEffectSize = _node["trueEffectSize"]
        self.priorOutcomeLookback = _node["priorOutcomeLookback"]
        self.analysesToExclude = _node["cohortMethodConfigs"]

    def task(self, _input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                rSource = ro.r['source']
                rSource('https://raw.githubusercontent.com/OHDSI/CohortMethodModule/v0.3.0/SettingsFunctions.R')
                rCreateCohortMethodModuleSpecifications = ro.globalenv["createCohortMethodModuleSpecifications"]
                rCmAnalysisList = get_results_by_class_type(_input, CohortMethodAnalysis)
                rTargetComparatorOutcomesList = get_results_by_class_type(_input, TargetComparatorOutcomes)
                rCohortMethodSpec = rCreateCohortMethodModuleSpecifications(
                    cmAnalysisList = rCmAnalysisList,
                    targetComparatorOutcomesList = rTargetComparatorOutcomesList,
                    analysesToExclude = convert_py_to_R(pd.DataFrame(self.analysesToExclude))
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
                data = {}
                if(self.sccsArgs):
                    rSelfControlledCaseSeries = ro.packages.importr('SelfControlledCaseSeries')
                    rCreateCreateStudyPopulationArgs = rSelfControlledCaseSeries.createCreateStudyPopulationArgs
                    rCreateStudyPopulation6AndOlderArgs = rCreateCreateStudyPopulationArgs(
                        minAge = convert_py_to_R(self.sccsArgs["minAge"]),
                        naivePeriod = convert_py_to_R(self.sccsArgs["naivePeriod"]),
                    )
                    data.sccsArgs = rCreateStudyPopulation6AndOlderArgs

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
                    data.cohortMethodArgs = rCreateStudyPopArgs

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
                    data.patientLevelPredictionArgs = rPlpPopulationSettings

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
        self.dbSccsDataArgs = node['dbSccsDataArgs']
        self.fitSccsModelArgs = node['fitSccsModelArgs']
        self.sccsIntervalDataArgs = node['sccsIntervalDataArgs']

    def task(self, input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                rSelfControlledCaseSeries = ro.packages.importr('SelfControlledCaseSeries')
                rCreateSccsAnalysis = rSelfControlledCaseSeries.createSccsAnalysis

                rCreateGetDbSccsDataArgs = rSelfControlledCaseSeries.createGetDbSccsDataArgs
                rGetDbSccsDataArgs = rCreateGetDbSccsDataArgs(
                    studyStartDate = convert_py_to_R(self.dbSccsDataArgs['studyStartDate']),
                    studyEndDate = convert_py_to_R(self.dbSccsDataArgs['studyEndDate']),
                    maxCasesPerOutcome = convert_py_to_R(self.dbSccsDataArgs['maxCasesPerOutcome']),
                    useNestingCohort = convert_py_to_R(self.dbSccsDataArgs['useNestingCohort']),
                    nestingCohortId = convert_py_to_R(self.dbSccsDataArgs['nestingCohortId']),
                    deleteCovariatesSmallCount = convert_py_to_R(self.dbSccsDataArgs['deleteCovariatesSmallCount'])
                )

                studyPopulationResults = get_results_by_class_type(input, StudyPopulationArgs)
                # filter sccsArgs from StudyPopulationResults (as it contains other args)
                rCreateStudyPopulation6AndOlderArgs = [r["sccsArgs"] for r in studyPopulationResults if r["sccsArgs"] != None]

                rCreateCreateSccsIntervalDataArgs = rSelfControlledCaseSeries.createCreateSccsIntervalDataArgs
                rCreateSccsIntervalDataArgs = rCreateCreateSccsIntervalDataArgs(
                    eraCovariateSettings = convert_py_to_R(get_results_by_class_type(input, EraCovariateSettings))
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
                    description = "SCCS age 18-",
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
                rSource = ro.r['source']
                rSource('https://raw.githubusercontent.com/OHDSI/SelfControlledCaseSeriesModule/v0.4.1/SettingsFunctions.R')
                rSccsAnalysisList = get_results_by_class_type(input, SCCSAnalysis)
                rCreatSelfControlledCaseSeriesModuleSpecifications = ro.globalenv['creatSelfControlledCaseSeriesModuleSpecifications']
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
                rSource = ro.r['source']
                rSource('https://raw.githubusercontent.com/OHDSI/PatientLevelPredictionModule/v0.3.0/SettingsFunctions.R')
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

                rCreatePatientLevelPredictionModuleSpecifications = ro.globalenv['createPatientLevelPredictionModuleSpecifications']
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


class StrategusNode(Node):
    def __init__(self, node):
        super().__init__(node)
        self.sharedResourcesTypes = [CohortDefinitionSharedResource, NegativeControlOutcomeCohortSharedResource] 
        self.moduleSpecTypes = [CohortGeneratorSpecNode, CohortDiagnosticsModuleSpecNode, CohortIncidenceModuleSpec, CharacterizationModuleSpecNode, CohortMethodModuleSpecNode]

    def task(self, _input: Dict[str, Result], task_run_context):
        with ro.default_converter.context():
            try:
                rStrategus = ro.packages.importr('Strategus')

                rSpec = rStrategus.createEmptyAnalysisSpecificiations()
                for sharedResourceType in self.sharedResourcesTypes:
                    sharedResourceResults = get_results_by_class_type(_input, sharedResourceType)
                    for sharedResource in sharedResourceResults:
                        rSpec = rStrategus.addSharedResources(rSpec, sharedResource)

                for moduleSpecType in self.moduleSpecTypes:
                    moduleSpecResults = get_results_by_class_type(_input, moduleSpecType)
                    for moduleSpec in moduleSpecResults:
                        rSpec = rStrategus.addModuleSpecifications(rSpec, moduleSpec)
                    # rSpec = rStrategus.addModuleSpecifications(rSpec, moduleSpecResults[0])
                print(rSpec.r_repr())

                databaseConnectorJarFolder = '/app/inst/drivers'
                os.environ['DATABASECONNECTOR_JAR_FOLDER'] = databaseConnectorJarFolder
                os.environ['STRATEGUS_KEYRING_PASSWORD'] = Secret.load("strategus-keyring-password").get()
                
                database_code = 'alpdev_pg'
                db_credentials = DBDao(use_cache_db=self.use_cache_db, 
                                   database_code=self.database, 
                                   schema_name=self.schema).tenant_configs
                rDatabaseConnector = ro.packages.importr('DatabaseConnector')
                rConnectionDetails = rDatabaseConnector.createConnectionDetails(
                    dbms='postgresql', 
                    connectionString=f'jdbc:{db_credentials.dialect}://{db_credentials.host}:{db_credentials.port}/{db_credentials.databaseName}',
                    user=db_credentials.adminUser,
                    password=db_credentials.adminPassword.get_secret_value(),
                    pathToDriver = databaseConnectorJarFolder
                )
                rStrategus.storeConnectionDetails(
                    connectionDetails = rConnectionDetails,
                    connectionDetailsReference = database_code
                )
                rExecutionSettings = rStrategus.createCdmExecutionSettings(
                    connectionDetailsReference = database_code,
                    workDatabaseSchema = "cdmdefault",
                    cdmDatabaseSchema = "cdmdefault",
                    workFolder = '/tmp/work_folder',
                    resultsFolder = '/tmp/results_folder'
                )

                rStrategus.execute(analysisSpecifications = rSpec, executionSettings = rExecutionSettings)
                return Result(False, rSpec, self, task_run_context)
            except Exception as e:
                return Result(True, tb.format_exc(), self, task_run_context)

def get_results_by_class_type(results: Dict[str, Result], nodeType: Node):
    result = [results[o].data for o in results if not results[o].error and isinstance(results[o].node, nodeType)]
    assert len(result) > 0, f"Expected at least one input of type: {nodeType.__class__}"
    return result

def get_input_nodes_by_class_type_from_results(inputs: Dict[str, Result], nodeType: Node) -> List[Node]:
    return [inputs[o].node for o in inputs if not inputs[o].error and isinstance(inputs[o].node, nodeType)]

def serialize_result_to_json(result: Result):
    return serialize_to_json(result.data)