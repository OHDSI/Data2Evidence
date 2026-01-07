export enum CohortType {
  Target = "target",
  Event = "event",
  Exit = "exit",
  Outcome = "outcome",
  Comparator = "comparator",
}

export type Cohort = {
  cohortId: number;
  cohortName: string;
};
