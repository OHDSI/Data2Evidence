export enum CohortType {
  Target = "target",
  Event = "event",
  Exit = "exit",
}

export type Cohort = {
  cohortId: string;
  cohortName: string;
};
