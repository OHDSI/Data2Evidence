export type AnalysisType = "single_event" | "competing_risk";

export interface KaplanMeierCharacterizationArgs {
  // Analysis Type Configuration
  analysisType: AnalysisType;

  // Cohort Configuration
  targetCohortId?: number;
  outcomeCohortId?: number;
  competingOutcomeCohortId?: number;

  // Stratification (for Single Event Analysis)
  useStratification: boolean;
  stratificationCohortId?: number;
}

export const EMPTY_KAPLAN_MEIER_CHARACTERIZATION_ARGS: KaplanMeierCharacterizationArgs =
  {
    // Analysis type defaults
    analysisType: "single_event",

    // Cohort defaults
    targetCohortId: undefined,
    outcomeCohortId: undefined,
    competingOutcomeCohortId: undefined,

    // Stratification defaults
    useStratification: false,
    stratificationCohortId: undefined,
  };

export const ANALYSIS_TYPE_OPTIONS = [
  { value: "single_event", label: "Single Event Analysis" },
  { value: "competing_risk", label: "Competing Risk Analysis" },
] as const;
