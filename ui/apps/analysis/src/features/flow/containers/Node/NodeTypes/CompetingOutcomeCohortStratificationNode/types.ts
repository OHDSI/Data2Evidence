export type CohortType = "competing_outcome" | "stratification";

export interface CompetingOutcomeCohortStratificationArgs {
  // Cohort Type Configuration
  cohortType: CohortType;

  // Cohort Configuration
  cohortId?: number;
  cohortName?: string;
  cohortDescription?: string;

  // Stratification specific settings
  stratificationVariable?: string;
  stratificationLevels?: string[];
}

export const EMPTY_COMPETING_OUTCOME_COHORT_STRATIFICATION_ARGS: CompetingOutcomeCohortStratificationArgs =
  {
    // Cohort type defaults
    cohortType: "competing_outcome",

    // Cohort defaults
    cohortId: undefined,
    cohortName: "",
    cohortDescription: "",

    // Stratification defaults
    stratificationVariable: undefined,
    stratificationLevels: [],
  };

export const COHORT_TYPE_OPTIONS = [
  { value: "competing_outcome", label: "Competing Outcome Cohort" },
  { value: "stratification", label: "Stratification Cohort" },
] as const;
