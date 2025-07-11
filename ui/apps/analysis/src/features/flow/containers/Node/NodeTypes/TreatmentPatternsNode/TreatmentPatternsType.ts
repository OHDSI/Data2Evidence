export enum IncludeTreatments {
  StartDate = "startDate",
  EndDate = "endDate",
}

export enum FilterTreatments {
  First = "First",
  Changes = "Changes",
  All = "All",
}

export enum CensorType {
  MinCellCount = "minCellCount",
  Remove = "remove",
  Mean = "mean",
}

export enum TreatmentPatternsCohortType {
  Target = "target",
  Event = "event",
  Exit = "exit",
}

export type TreatmentPatternsCohort = {
  cohortId: string;
  cohortName: string;
  type: TreatmentPatternsCohortType;
};
