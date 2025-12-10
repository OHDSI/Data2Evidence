// Time At Risk Configuration
export interface TimeAtRiskConfig {
  label: string;
  riskWindowStart: number;
  startAnchor: "cohort start" | "cohort end";
  riskWindowEnd: number;
  endAnchor: "cohort start" | "cohort end";
}

// DB Cohort Method Data Args
export interface DbCohortMethodDataArgs {
  studyStartDate?: string;
  studyEndDate?: string;
}

// Create Study Population Args
export interface CreateStudyPopArgs {
  firstExposureOnly: boolean;
  removeDuplicateSubjects: "keep all" | "keep first" | "remove all";
  removeSubjectsWithPriorOutcome: boolean;
  priorOutcomeLookback: number;
  requireTimeAtRisk: boolean;
  riskWindowStart: number;
  startAnchor: "cohort start" | "cohort end";
  riskWindowEnd: number;
  endAnchor: "cohort start" | "cohort end";
}

export interface KaplanMeierArgs {
  // CM Analysis Configuration
  analysisId: number;
  description: string;

  // DB Cohort Method Data Args
  getDbCohortMethodDataArgs: DbCohortMethodDataArgs;

  // Create Study Population Args
  createStudyPopArgs: CreateStudyPopArgs;

  // Time At Risk Configurations
  timeAtRisks: TimeAtRiskConfig[];
}

export const EMPTY_KAPLAN_MEIER_ARGS: KaplanMeierArgs = {
  // CM Analysis Configuration
  analysisId: 1,
  description: "Kaplan-Meier survival analysis",

  // DB Cohort Method Data Args
  getDbCohortMethodDataArgs: {
    studyStartDate: undefined,
    studyEndDate: undefined,
  },

  // Create Study Population Args
  createStudyPopArgs: {
    firstExposureOnly: true,
    removeDuplicateSubjects: "keep first",
    removeSubjectsWithPriorOutcome: false,
    priorOutcomeLookback: 0,
    requireTimeAtRisk: false,
    riskWindowStart: 1,
    startAnchor: "cohort start",
    riskWindowEnd: 0,
    endAnchor: "cohort end",
  },

  // Time At Risk Configurations
  timeAtRisks: [
    {
      label: "KM Analysis",
      riskWindowStart: 1,
      startAnchor: "cohort start",
      riskWindowEnd: 0,
      endAnchor: "cohort end",
    },
  ],
};

export const DUPLICATE_SUBJECTS_OPTIONS = [
  { value: "keep all", label: "Keep All" },
  { value: "keep first", label: "Keep First" },
  { value: "remove all", label: "Remove All" },
] as const;

export const ANCHOR_OPTIONS = [
  { value: "cohort start", label: "Cohort Start" },
  { value: "cohort end", label: "Cohort End" },
] as const;
