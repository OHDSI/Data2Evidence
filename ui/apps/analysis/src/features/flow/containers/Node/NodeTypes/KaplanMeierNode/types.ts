export interface KaplanMeierArgs {
  // Study Population Configuration (from createStudyPopulation)
  outcomeId: number;
  firstExposureOnly: boolean;
  restrictToCommonPeriod: boolean;
  washoutPeriod: number;
  removeDuplicateSubjects: "keep all" | "keep first" | "remove all";
  removeSubjectsWithPriorOutcome: boolean;
  minDaysAtRisk: number;

  // Risk Window Definition
  riskWindowStart: number;
  startAnchor: "cohort start" | "cohort end";
  riskWindowEnd: number;
  endAnchor: "cohort start" | "cohort end";

  // Kaplan-Meier Plot Settings
  includeZero: boolean;
  stratified: boolean;

  // Optional Advanced Settings
  censorAtNewRiskWindow?: boolean;
  minDaysToOutcome?: number;
}

export const EMPTY_KAPLAN_MEIER_ARGS: KaplanMeierArgs = {
  // Study Population defaults
  outcomeId: 1,
  firstExposureOnly: false,
  restrictToCommonPeriod: false,
  washoutPeriod: 0,
  removeDuplicateSubjects: "keep all",
  removeSubjectsWithPriorOutcome: true,
  minDaysAtRisk: 1,

  // Risk Window defaults
  riskWindowStart: 0,
  startAnchor: "cohort start",
  riskWindowEnd: 30,
  endAnchor: "cohort end",

  // Plot defaults
  includeZero: false,
  stratified: true,

  // Advanced defaults
  censorAtNewRiskWindow: false,
  minDaysToOutcome: 0,
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
