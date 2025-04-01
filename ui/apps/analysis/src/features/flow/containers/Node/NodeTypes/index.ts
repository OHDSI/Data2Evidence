import { ComponentType } from "react";
import { Node, NodeProps } from "reactflow";
import { NodeDataState } from "../../../types";
import { PlainNode } from "./PlainNode/PlainNode";
import { CohortGeneratorNode } from "./CohortGeneratorNode/CohortGeneratorNode";
import { CohortDiagnosticsNode } from "./CohortDiagnosticsNode/CohortDiagnosticsNode";
import { NegatveControlOutcomeNode } from "./NegativeControlOutcomeNode/NegativeControlOutcomeNode";
import { CharacterizationNode } from "./CharacterizationNode/CharacterizationNode";
import { TimeAtRiskNode } from "./TimeAtRiskNode/TimeAtRiskNode";
import { SelfControlledCaseSeriesNode } from "./SelfControlledCaseSeriesNode/SelfControlledCaseSeriesNode";
import { EraCovariateSettingsNode } from "./EraCovariateSettingsNode/EraCovariateSettingsNode";
import { CalendarTimeCovariateSettingsNode } from "./CalendarTimeCovariateSettingsNode/CalendarTimeCovariateSettingsNode";
import { SeasonalityCovariateSettingsNode } from "./SeasonalityCovariateSettingsNode/SeasonalityCovariateSettingsNode";
import { CohortIncidentNode } from "./CohortIncidentNode/CohortIncidentNode";
import { TargetComparatorOutcomesNode } from "./TargetComparatorOutcomesNode/TargetComparatorOutcomesNode";
import { CohortMethodNode } from "./CohortMethodNode/CohortMethodNode";
import { CohortMethodAnalysisNode } from "./CohortMethodAnalysisNode/CohortMethodAnalysisNode";
import { StudyPopulationSettingsNode } from "./StudyPopulationSettingsNode/StudyPopulationSettingsNode";
import { SelfControlledCaseSeriesAnalysisNode } from "./SelfControlledCaseSeriesAnalysisNode/SelfControlledCaseSeriesAnalysisNode";
import { CohortIncidentTargetCohortNode } from "./CohortIncidentTargetCohortNode/CohortIncidentTargetCohortNode";
import { NCOCohortSetNode } from "./NCOCohortSetNode/NCOCohortSetNode";
import { DefaultCovariateSettingsNode } from "./DefaultCovariateSettingsNode/DefaultCovariateSettingsNode";
import { OutcomesNode } from "./OutcomesNode/OutcomesNode";
import { CohortDefinitionSetNode } from "./CohortDefinitionSetNode/CohortDefinitionSetNode";
import { ExposureNode } from "./ExposureNode/ExposureNode";
import { NodeChoiceAttr, NodeType, NodeTypeChoice, NodeTag } from "./type";

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
};

export const NODE_COLORS: {
  [key in NodeType]: string;
} = {
  cohort_generator_node: "grey",
  cohort_diagnostic_node: "grey",
  negative_control_outcome_cohort_node: "lime",
  cohort_incidence_node: "cyan",
  cohort_incidence_target_cohorts_node: "aquamarine",
  time_at_risk_node: "wheat",
  default_covariate_settings_node: "darkgreen",
  characterization_node: "orange",
  target_comparator_outcomes_node: "indigo",
  cohort_method_analysis_node: "lavender",
  cohort_method_node: "mediumpurple",
  era_covariate_settings_node: "chocolate",
  calendar_time_covariate_settings_node: "chocolate",
  seasonality_covariate_settings_node: "chocolate",
  self_controlled_case_series_analysis_node: "red",
  self_controlled_case_series_node: "darkred",
  patient_level_prediction_node: "magenta",
  study_population_settings_node: "lightpink",
  nco_cohort_set_node: "blue",
  outcomes_node: "green",
  cohort_definition_set_node: "grey",
  exposure_node: "lightgrey",
  strategus_node: "black",
};

export const NodeChoiceMap: { [key in NodeTypeChoice]: NodeChoiceAttr } = {
  cohort_generator_node: {
    title: "Cohort Generator Module Specifications",
    description: "Run cohort generator code.",
    tag: NodeTag.Grey,
    defaultData: {
      incremental: true,
      generateStats: true,
    },
  },
  cohort_diagnostic_node: {
    title: "Cohort Diagnostic Module Specifications",
    description: "Run cohort diagnostic starboard.",
    tag: NodeTag.Grey,
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
  },
  negative_control_outcome_cohort_node: {
    title: "Negative Control Outcome Cohort Shared Resource Specifications",
    description: "Run negative control outcome cohort.",
    tag: NodeTag.Lime,
    defaultData: {
      occurenceType: "all",
      detectOnDescendants: true,
    },
  },
  cohort_incidence_node: {
    title: "Cohort Incidence",
    description: "Run cohort incidence code.",
    tag: NodeTag.Cyan,
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
  },
  cohort_incidence_target_cohorts_node: {
    title: "Cohort Incidence Target Cohorts",
    description: "Run cohort incidence target cohorts code.",
    tag: NodeTag.Aquamarine,
    defaultData: {
      cohortId: 3,
      cleanWindow: 9999,
    },
  },
  time_at_risk_node: {
    title: "Time At Risk",
    description: "Run time at risk code.",
    tag: NodeTag.Wheat,
    defaultData: {
      timeAtRiskId: undefined,
      startWith: "start",
      endWith: "end",
    },
  },
  default_covariate_settings_node: {
    title: "Covariate Settings",
    description: "Run covariate settings code.",
    tag: NodeTag.Darkgreen,
    defaultData: {
      excludedCovariateConceptIds: [],
      includedCovariateConceptIds: [],
      addDescendantsToExclude: false,
      addDescendantsToInclude: false,
      includedCovariateIds: [],
    },
  },
  characterization_node: {
    title: "Characterization",
    description: "JSON analysis specification for executing HADES modules",
    tag: NodeTag.Orange,
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
  },
  target_comparator_outcomes_node: {
    title: "Target Compartor Outcomes",
    description: "Run target comparator outcomes code",
    tag: NodeTag.Indigo,
    defaultData: {
      targetId: 1,
      comparatorId: 1,
      trueEffectSize: 1,
      priorOutcomeLookback: 30,
      excludedCovariateConceptIds: [],
      includedCovariateConceptIds: [],
    },
  },
  cohort_method_analysis_node: {
    title: "Cohort Method Analysis",
    description: "Run cohort method analysis code",
    tag: NodeTag.Lavender,
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
  },
  cohort_method_node: {
    title: "Cohort Method",
    description: "Run cohort method code.",
    tag: NodeTag.Mediumpurple,
    defaultData: {
      trueEffectSize: 1,
      priorOutcomeLookback: 30,
      cohortMethodConfigs: [],
    },
  },
  era_covariate_settings_node: {
    title: "Era Covariate Settings",
    description: "Run era covariate settings code.",
    tag: NodeTag.Chocolate,
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
  },
  calendar_time_covariate_settings_node: {
    title: "Calendar Time Covariate Settings",
    description: "Run calendar time covariate settings code.",
    tag: NodeTag.Chocolate,
    defaultData: {
      caldendarTimeKnots: 5,
      allowRegularization: true,
      computeConfidenceIntervals: false,
    },
  },
  seasonality_covariate_settings_node: {
    title: "Seasonality Covariate Settings",
    description: "Run seasonality covariate settings code.",
    tag: NodeTag.Chocolate,
    defaultData: {
      seasonalityKnots: 5,
      allowRegularization: true,
      computeConfidenceIntervals: false,
    },
  },
  self_controlled_case_series_analysis_node: {
    title: "Self Controlled Case Series Analysis",
    description: "Run self-controlled case series analysis code.",
    tag: NodeTag.Red,
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
  },
  self_controlled_case_series_node: {
    title: "Self Controlled Case Series",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Darkred,
    defaultData: {
      combineDataFetchAcrossOutcomes: false,
    },
  },
  patient_level_prediction_node: {
    title: "Patient Level Prediction",
    description:
      "Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium.",
    tag: NodeTag.Magenta,
    defaultData: {},
  },
  study_population_settings_node: {
    title: "Study Population Settings",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Lightpink,
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
  },
  nco_cohort_set_node: {
    title: "NCO Cohort Set",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Blue,
    defaultData: {},
  },
  outcomes_node: {
    title: "Outcomes",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Green,
    defaultData: {
      ncoCohortSetIds: [],
      outcomeOfInterest: false,
      trueEffectSize: 1,
      priorOutcomeLookback: 30,
    },
  },
  cohort_definition_set_node: {
    title: "Cohort Definition Set",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Olive,
    defaultData: {},
  },
  exposure_node: {
    title: "Exposures",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Lightgrey,
    defaultData: {
      outcomeOfInterestIds: [],
      exposureOfInterestIds: [],
    },
  },
  strategus_node: {
    title: "Strategus",
    description: "Lorem ipsum dolor sit amet, consectetur adipiscing elit.",
    tag: NodeTag.Black,
    defaultData: {},
  },
};

export const getNodeColors = (node: Node<NodeDataState>) => {
  if (node.type && Object.keys(NODE_COLORS).includes(node.type)) {
    return NODE_COLORS[node.type as NodeType];
  }
  return "#999fcb";
};

export const getNodeClassName = (node: Node<NodeDataState>) => {
  if (node.type === "start") {
    return "node--round";
  }
  return "";
};

export type { NodeType };
export * from "./SelectNodeTypes/SelectNodeTypesDialog";
export * from "./type";
