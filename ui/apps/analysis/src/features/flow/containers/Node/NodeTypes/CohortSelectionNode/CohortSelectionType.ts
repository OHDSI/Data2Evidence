export enum CohortType {
  Target = "target",
  Event = "event",
  Exit = "exit",
}

export type Cohort = {
  cohortId: number;
  cohortName: string;
};
