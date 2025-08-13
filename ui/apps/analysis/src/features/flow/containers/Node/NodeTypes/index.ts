import { ComponentType } from "react";
import { Node, NodeProps } from "reactflow";
import { NodeDataState } from "../../../types";
import { CalendarTimeCovariateSettingsNode } from "./CalendarTimeCovariateSettingsNode/CalendarTimeCovariateSettingsNode";
import { CharacterizationNode } from "./CharacterizationNode/CharacterizationNode";
import { CohortDefinitionSetNode } from "./CohortDefinitionSetNode/CohortDefinitionSetNode";
import { CohortDiagnosticsNode } from "./CohortDiagnosticsNode/CohortDiagnosticsNode";
import { CohortGeneratorNode } from "./CohortGeneratorNode/CohortGeneratorNode";
import { CohortIncidentNode } from "./CohortIncidentNode/CohortIncidentNode";
import { CohortIncidentTargetCohortNode } from "./CohortIncidentTargetCohortNode/CohortIncidentTargetCohortNode";
import { CohortMethodAnalysisNode } from "./CohortMethodAnalysisNode/CohortMethodAnalysisNode";
import { CohortMethodNode } from "./CohortMethodNode/CohortMethodNode";
import { CohortSelectionNode } from "./CohortSelectionNode/CohortSelectionNode";
import { CompetingOutcomeCohortStratificationNode } from "./CompetingOutcomeCohortStratificationNode/CompetingOutcomeCohortStratificationNode";
import { DefaultCovariateSettingsNode } from "./DefaultCovariateSettingsNode/DefaultCovariateSettingsNode";
import { EraCovariateSettingsNode } from "./EraCovariateSettingsNode/EraCovariateSettingsNode";
import { ExposureNode } from "./ExposureNode/ExposureNode";
import { KaplanMeierCharacterizationNode } from "./KaplanMeierCharacterizationNode/KaplanMeierCharacterizationNode";
import { KaplanMeierNode } from "./KaplanMeierNode/KaplanMeierNode";
import { NCOCohortSetNode } from "./NCOCohortSetNode/NCOCohortSetNode";
import { NegatveControlOutcomeNode } from "./NegativeControlOutcomeNode/NegativeControlOutcomeNode";
import { OutcomesNode } from "./OutcomesNode/OutcomesNode";
import { PlainNode } from "./PlainNode/PlainNode";
import { SeasonalityCovariateSettingsNode } from "./SeasonalityCovariateSettingsNode/SeasonalityCovariateSettingsNode";
import { SelfControlledCaseSeriesAnalysisNode } from "./SelfControlledCaseSeriesAnalysisNode/SelfControlledCaseSeriesAnalysisNode";
import { SelfControlledCaseSeriesNode } from "./SelfControlledCaseSeriesNode/SelfControlledCaseSeriesNode";
import { StudyPopulationSettingsNode } from "./StudyPopulationSettingsNode/StudyPopulationSettingsNode";
import { TargetComparatorOutcomesNode } from "./TargetComparatorOutcomesNode/TargetComparatorOutcomesNode";
import { TimeAtRiskNode } from "./TimeAtRiskNode/TimeAtRiskNode";
import { TreatmentPatternsNode } from "./TreatmentPatternsNode/TreatmentPatternsNode";
import {
  CensorType,
  FilterTreatments,
  IncludeTreatments,
} from "./TreatmentPatternsNode/TreatmentPatternsType";
import {
  HandleIODict,
  HandleIOType,
  NodeChoiceAttr,
  NodeConnection,
  NodeTag,
  NodeType,
  NodeTypeChoice,
} from "./type";

export const NODE_TYPES: {
  [key in NodeType]: ComponentType<NodeProps<any>>;
} = {
  cohort_generator_node: CohortGeneratorNode,
  cohort_diagnostic_node: CohortDiagnosticsNode,
  negative_control_outcome_cohort_node: NegatveControlOutcomeNode,
  cohort_incidence_node: CohortIncidentNode,
  cohort_incidence_target_cohorts_node: CohortIncidentTargetCohortNode,
  time_at_risk_node: TimeAtRiskNode,
  default_covariate_settings_node: DefaultCovariateSettingsNode,
  characterization_node: CharacterizationNode,
  target_comparator_outcomes_node: TargetComparatorOutcomesNode,
  cohort_method_analysis_node: CohortMethodAnalysisNode,
  cohort_method_node: CohortMethodNode,
  kaplan_meier_node: KaplanMeierNode,
  kaplan_meier_characterization_node: KaplanMeierCharacterizationNode,
  competing_outcome_cohort_stratification_node:
    CompetingOutcomeCohortStratificationNode,
  era_covariate_settings_node: EraCovariateSettingsNode,
  calendar_time_covariate_settings_node: CalendarTimeCovariateSettingsNode,
  seasonality_covariate_settings_node: SeasonalityCovariateSettingsNode,
  self_controlled_case_series_analysis_node:
    SelfControlledCaseSeriesAnalysisNode,
  self_controlled_case_series_node: SelfControlledCaseSeriesNode,
  patient_level_prediction_node: PlainNode,
  study_population_settings_node: StudyPopulationSettingsNode,
  nco_cohort_set_node: NCOCohortSetNode,
  outcomes_node: OutcomesNode,
  cohort_definition_set_node: CohortDefinitionSetNode,
  exposure_node: ExposureNode,
  strategus_node: PlainNode,
  treatment_patterns_node: TreatmentPatternsNode,
  cohort_node: CohortSelectionNode,
};

export const NodeChoiceMap: { [key in NodeTypeChoice]: NodeChoiceAttr } = {
  cohort_generator_node: {
    title: "Cohort Generator Module Specifications",
    description: "Run cohort generator code.",
    tag: NodeTag.Experimental,
    defaultData: {
      incremental: true,
      generateStats: true,
    },
    outputs: [
      {
        label: "Strategus",
        handleType: HandleIOType.ModuleSpecification,
      },
    ],
  },
  cohort_diagnostic_node: {
    title: "Cohort Diagnostic Module Specifications",
    description: "Run cohort diagnostic starboard.",
    tag: NodeTag.Experimental,
    defaultData: {
      runInclusionStatistics: true,
      runIncludedSourceConcepts: true,
      runOrphanConcepts: true,
      runTimeSeries: false,
      runVisistContext: true,
      runBreakdownIndexEvents: true,
      runIncidenceRate: true,
      runCohortRelationship: true,
      runTemporalCohortCharacterization: true,
      incremental: false,
    },
    outputs: [
      {
        label: "Strategus",
        handleType: HandleIOType.ModuleSpecification,
      },
    ],
  },
  negative_control_outcome_cohort_node: {
    title: "Negative Control Outcome Cohort Shared Resource Specifications",
    description: "Run negative control outcome cohort.",
    tag: NodeTag.Experimental,
    defaultData: {
      occurenceType: "all",
      detectOnDescendants: true,
    },
  },
  cohort_incidence_node: {
    title: "Cohort Incidence",
    description: "Run cohort incidence code.",
    tag: NodeTag.Experimental,
    defaultData: {
      strataSettings: {
        byYear: true,
        byGender: true,
      },
      cohortRefs: [],
      incidenceAnalysis: {
        targets: [],
        outcomes: [],
        tars: [],
      },
    },
    inputs: [
      {
        label: "Cohort Incidence Target Cohorts",
        handleType: HandleIOType.CohortIncidenceTargetCohorts,
      },
      {
        label: "Time At Risk",
        handleType: HandleIOType.TimeAtRisk,
      },
    ],
    outputs: [
      {
        label: "Strategus",
        handleType: HandleIOType.ModuleSpecification,
      },
    ],
  },
  cohort_incidence_target_cohorts_node: {
    title: "Cohort Incidence Target Cohorts",
    description: "Run cohort incidence target cohorts code.",
    tag: NodeTag.Experimental,
    defaultData: {
      cohortId: 3,
      cleanWindow: 9999,
    },
    outputs: [
      { label: "Cohort Incidence", handleType: HandleIOType.CohortIncidence },
    ],
  },
  time_at_risk_node: {
    title: "Time At Risk",
    description: "Run time at risk code.",
    tag: NodeTag.Experimental,
    defaultData: {
      timeAtRiskId: undefined,
      startWith: "start",
      endWith: "end",
    },

    outputs: [
      {
        label: "Cohort Incidence",
        handleType: HandleIOType.CohortIncidence,
      },
    ],
  },
  default_covariate_settings_node: {
    title: "Covariate Settings",
    description: "Run covariate settings code.",
    tag: NodeTag.Experimental,
    defaultData: {
      excludedCovariateConceptIds: [],
      includedCovariateConceptIds: [],
      addDescendantsToExclude: false,
      addDescendantsToInclude: false,
      includedCovariateIds: [],
    },
    outputs: [
      {
        label: "Patient Level Prediction",
        handleType: HandleIOType.PatientLevelPrediction,
      },
    ],
  },
  characterization_node: {
    title: "Characterization",
    description: "JSON analysis specification for executing HADES modules",
    tag: NodeTag.Experimental,
    defaultData: {
      dechallengeStopInterval: 0,
      dechallengeEvaluationWindow: 0,
      minPriorObservation: 0,
      targetIds: ["1", "2"],
      outcomeIds: ["3", "2"],
      timeAtRiskConfigs: [
        {
          riskWindowStart: 1,
          riskWindowEnd: 1,
          startAnchor: "cohort start",
          endAnchor: "cohort end",
        },
      ],
    },
    outputs: [
      {
        label: "Strategus",
        handleType: HandleIOType.ModuleSpecification,
      },
    ],
  },
  target_comparator_outcomes_node: {
    title: "Target Compartor Outcomes",
    description: "Run target comparator outcomes code",
    tag: NodeTag.Stable,
    defaultData: {
      targetId: 1,
      comparatorId: 1,
      trueEffectSize: 1,
      priorOutcomeLookback: 30,
      excludedCovariateConceptIds: [],
      includedCovariateConceptIds: [],
    },
    inputs: [
      {
        label: "Outcomes",
        handleType: HandleIOType.Outcomes,
      },
      {
        label: "Target Cohort",
        handleType: HandleIOType.Cohort,
      },
      {
        label: "Comparator Cohort",
        handleType: HandleIOType.Cohort,
      },
    ],
    outputs: [{ handleType: HandleIOType.TargetComparatorOutcomes }],
  },
  cohort_method_analysis_node: {
    title: "Cohort Method Analysis",
    description: "Run cohort method analysis code",
    tag: NodeTag.Experimental,
    defaultData: {
      analysisId: undefined,
      dbCohortMethodDataArgs: {
        washoutPeriod: 183,
        firstExposureOnly: true,
        removeDuplicateSubjects: "remove all",
        maxCohortSize: 100000,
      },
      fitOutcomeModelArgs: {
        modelType: "cox",
      },
      psArgs: {
        stopOnError: false,
        control: false,
        cvRepetition: 1,
      },
    },
    inputs: [
      {
        label: "Study Population",
        handleType: HandleIOType.StudyPopulation,
      },
      // default covariate settings node
    ],
    outputs: [
      {
        label: "Cohort Method",
        handleType: HandleIOType.CohortMethodAnalysis,
      },
    ],
  },
  cohort_method_node: {
    title: "Cohort Method",
    description: "Run cohort method code.",
    tag: NodeTag.Stable,
    defaultData: {
      trueEffectSize: 1,
      priorOutcomeLookback: 30,
      cohortMethodConfigs: [],
    },
    inputs: [
      {
        label: "Target Comparator Outcomes",
        handleType: HandleIOType.TargetComparatorOutcomes,
      },
      {
        label: "CM Analysis",
        handleType: HandleIOType.CohortMethodAnalysis,
      },
    ],
    outputs: [
      { label: "Strategus", handleType: HandleIOType.ModuleSpecification },
    ],
  },
  kaplan_meier_node: {
    title: "Kaplan-Meier Analysis",
    description: "Run Kaplan-Meier survival analysis code.",
    tag: NodeTag.Stable,
    defaultData: {
      kaplanMeierArgs: {
        targetCohortId: 1,
        outcomeCohortId: 2,
        analysisType: "single_event",
        competingOutcomeCohortId: undefined,
        estimateGap: 30,
        strataCohorts: [],
      },
    },
    inputs: [
      {
        label: "Study Population",
        handleType: HandleIOType.StudyPopulation,
      },
    ],
    outputs: [
      {
        label: "Cohort Method Analysis",
        handleType: HandleIOType.CohortMethodAnalysis,
      },
    ],
  },
  era_covariate_settings_node: {
    title: "Era Covariate Settings",
    description: "Run era covariate settings code.",
    tag: NodeTag.Experimental,
    defaultData: {
      label: "Main",
      includedEraIds: [],
      excludedEraIds: [],
      start: 0,
      end: 0,
      startAnchor: "era start",
      endAnchor: "era end",
      stratifyById: false,
      firstOccurenceOnly: false,
      allowRegularization: false,
      profileLikelihood: true,
      exposureOfInterest: true,
    },
    outputs: [
      {
        label: "Covariate Settings",
        handleType: HandleIOType.CovariateSettings,
      },
    ],
  },
  calendar_time_covariate_settings_node: {
    title: "Calendar Time Covariate Settings",
    description: "Run calendar time covariate settings code.",
    tag: NodeTag.Experimental,
    defaultData: {
      caldendarTimeKnots: 5,
      allowRegularization: true,
      computeConfidenceIntervals: false,
    },
    outputs: [
      {
        label: "Covariate Settings",
        handleType: HandleIOType.CovariateSettings,
      },
    ],
  },
  seasonality_covariate_settings_node: {
    title: "Seasonality Covariate Settings",
    description: "Run seasonality covariate settings code.",
    tag: NodeTag.Experimental,
    defaultData: {
      seasonalityKnots: 5,
      allowRegularization: true,
      computeConfidenceIntervals: false,
    },
    outputs: [
      {
        label: "Covariate Settings",
        handleType: HandleIOType.CovariateSettings,
      },
    ],
  },
  self_controlled_case_series_analysis_node: {
    title: "Self Controlled Case Series Analysis",
    description: "Run self-controlled case series analysis code.",
    tag: NodeTag.Experimental,
    defaultData: {
      description: "SCCS age 18-",
      analysisId: undefined,
      dbSccsDataArgs: {
        studyStartDate: "",
        studyEndDate: "",
        maxCasesPerOutcome: 100000,
        useNestingCohort: true,
        nestingCohortId: 1,
        deleteCovariateSmallCount: 0,
      },
      sccsIntervalDataArgs: {
        minCasesForTimeCovariates: 100000,
      },
      fitSccsModelArgs: {
        control: false,
        cvType: "auto",
        selectorType: "byPid",
        startingVariance: 0.1,
        seed: 1,
        resetCoefficients: true,
        noiseLevel: "quiet",
      },
    },
    inputs: [
      {
        label: "Covariate Settings",
        handleType: HandleIOType.CovariateSettings,
      },
      {
        label: "Study Population",
        handleType: HandleIOType.StudyPopulation,
      },
    ],
    outputs: [
      {
        label: "Study Population",
        handleType: HandleIOType.StudyPopulation,
      },
    ],
  },
  self_controlled_case_series_node: {
    title: "Self Controlled Case Series",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Experimental,
    defaultData: {
      combineDataFetchAcrossOutcomes: false,
    },
    outputs: [
      {
        label: "Strategus",
        handleType: HandleIOType.ModuleSpecification,
      },
    ],
  },
  patient_level_prediction_node: {
    title: "Patient Level Prediction",
    description:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.",
    tag: NodeTag.Experimental,
    defaultData: {},
    inputs: [
      { label: "Exposures", handleType: HandleIOType.Exposure },
      {
        label: "Population Settings",
        handleType: HandleIOType.StudyPopulation,
      },
      {
        label: "Covariate Settings",
        handleType: HandleIOType.CovariateSettings,
      },
    ],
    outputs: [
      {
        label: "Strategus",
        handleType: HandleIOType.ModuleSpecification,
      },
    ],
  },
  study_population_settings_node: {
    title: "Study Population Settings",
    description:
      "Configure risk windows, time at risk, and analysis-specific population parameters.",
    tag: NodeTag.Stable,
    defaultData: {
      cohortMethodArgs: {
        minDaysAtRisk: 1,
        riskWindowStart: 0,
        startAnchor: "cohort start",
        riskWindowEnd: 30,
        endAnchor: "cohort end",
      },
      sccsArgs: {
        minAge: 18,
        naivePeriod: 365,
      },
      patientLevelPredictionArgs: {
        startAnchor: "cohort start",
        endAnchor: "cohort end",
        riskWindowStart: 1,
        riskWindowEnd: 365,
        minTimeAtRisk: 1,
      },
    },
    outputs: [
      {
        label: "Population",
        handleType: HandleIOType.StudyPopulation,
      },
    ],
  },
  nco_cohort_set_node: {
    title: "NCO Cohort Set",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Experimental,
    defaultData: {},
  },
  outcomes_node: {
    title: "Outcomes",
    description:
      "Define clinical outcomes and endpoints for the study analysis.",
    tag: NodeTag.Stable,
    defaultData: {
      ncoCohortSetIds: [],
      outcomeOfInterest: false,
      trueEffectSize: 1,
      priorOutcomeLookback: 30,
    },
    inputs: [{ label: "Outcome Cohort", handleType: HandleIOType.Cohort }],
    outputs: [{ handleType: HandleIOType.Outcomes }],
  },
  cohort_definition_set_node: {
    title: "Cohort Definition Set",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Experimental,
    defaultData: {},
  },
  exposure_node: {
    title: "Exposures",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Experimental,
    defaultData: {
      outcomeOfInterestIds: [],
      exposureOfInterestIds: [],
    },
    outputs: [
      {
        handleType: HandleIOType.Exposure,
      },
    ],
  },
  strategus_node: {
    title: "Strategus",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Stable,
    defaultData: {},
    inputs: [
      {
        label: "Module Specifications",
        handleType: HandleIOType.ModuleSpecification,
      },
    ],
    outputs: [],
  },
  treatment_patterns_node: {
    title: "Treatment Patterns",
    description: "Run treatment patterns code.",
    tag: NodeTag.Stable,
    defaultData: {
      includeTreatments: IncludeTreatments.StartDate,
      indexDateOffset: 0,
      minEraDuration: 0,
      splitEventCohorts: "",
      splitTime: 30,
      eraCollapseSize: 30,
      combinationWindow: 30,
      minPostCombinationDuration: 30,
      filterTreatments: FilterTreatments.First,
      maxPathLength: 5,
      ageWindow: 10,
      minCellCount: 5,
      censorType: CensorType.MinCellCount,
    },
    inputs: [
      {
        label: "Target Cohorts",
        handleType: HandleIOType.Cohort,
      },
      {
        label: "Event Cohorts",
        handleType: HandleIOType.Cohort,
      },
      {
        label: "Exit Cohorts",
        handleType: HandleIOType.Cohort,
      },
    ],
    outputs: [{ handleType: HandleIOType.ModuleSpecification }],
  },
  cohort_node: {
    title: "Cohort Selection",
    description: "Select cohort for analysis.",
    tag: NodeTag.Stable,
    defaultData: {
      type: "event",
      cohorts: [],
    },
    outputs: [
      {
        label: "Treatment Patterns",
        handleType: HandleIOType.Cohort,
      },
    ],
  },
  kaplan_meier_characterization_node: {
    title: "Kaplan-Meier Characterization Analysis",
    description:
      "Enhanced Kaplan-Meier survival analysis with competing risks and stratification support.",
    tag: NodeTag.Stable,
    defaultData: {
      kaplanMeierCharacterizationArgs: {
        analysisType: "single_event",
        useStratification: false,
      },
    },
    inputs: [
      { label: "Competing Outcome", handleType: HandleIOType.Cohort },
      { label: "Stratification", handleType: HandleIOType.Cohort },
    ],
    outputs: [{ handleType: HandleIOType.CohortMethodAnalysis }],
  },
  competing_outcome_cohort_stratification_node: {
    title: "Competing Outcome Cohort / Stratification",
    description:
      "Define competing outcome cohorts or stratification variables for Kaplan-Meier analysis.",
    tag: NodeTag.Stable,
    defaultData: {
      competingOutcomeCohortStratificationArgs: {
        cohortType: "competing_outcome",
      },
    },
    outputs: [{ handleType: HandleIOType.Cohort }],
  },
};

type HandleDirection = "inputs" | "outputs";

const getNodeHandleTypeMap = (direction: HandleDirection = "outputs") => {
  const handleTypeMap: Record<HandleIOType, Set<NodeType>> = {} as Record<
    HandleIOType,
    Set<NodeType>
  >;

  // if handleDirection is output, should get the inputs
  // if handleDirection is input, should get the outputs
  const directionMap = {
    inputs: "outputs",
    outputs: "inputs",
  };

  Object.entries(NodeChoiceMap).forEach(([key, node]) => {
    const handles = node[directionMap[direction]];
    handles?.forEach((handle: NodeConnection) => {
      if (!handleTypeMap[handle.handleType]) {
        handleTypeMap[handle.handleType] = new Set<NodeType>();
      }
      handleTypeMap[handle.handleType].add(key as NodeType);
    });
  });

  return handleTypeMap;
};

export const outputHandleTypeMap = getNodeHandleTypeMap("outputs");
export const inputHandleTypeMap = getNodeHandleTypeMap("inputs");

// Color of the node is based on the output handle type
export const NODE_COLORS: Record<NodeType, string> = Object.keys(
  NodeChoiceMap
).reduce((acc, nodeType) => {
  const outputHandles = NodeChoiceMap[nodeType as NodeType]?.outputs;
  if (outputHandles && outputHandles.length > 0) {
    const handleType = outputHandles[0].handleType;
    acc[nodeType as NodeType] = HandleIODict[handleType]?.color ?? "#999fcb";
  } else {
    acc[nodeType as NodeType] = "#999fcb"; // default color if no output handle
  }
  return acc;
}, {} as Record<NodeType, string>);

export const getNodeColors = (node: Node<NodeDataState>) => {
  if (node.type && Object.keys(NODE_COLORS).includes(node.type)) {
    return NODE_COLORS[node.type as NodeType];
  }
  return "#999fcb";
};

export const getNodeClassName = () => "node";

export * from "./SelectNodeTypes/SelectNodeTypesDialog";
export * from "./type";
export type { NodeType };
