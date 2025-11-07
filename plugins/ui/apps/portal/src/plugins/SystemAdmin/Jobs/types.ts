export interface HistoryJob {
  flowRunId: string;
  flowRunName: string;
  schemaName: string;
  dataCharacterizationSchema: string;
  cohortDefinitionId: string;
  type: string;
  createdAt: string;
  completedAt: string;
  status: string;
  error: string | null;
  datasetId: string | null;
  comment: string | null;
  databaseCode: string;
}

export enum FlowRunJobStateTypes {
  "COMPLETED" = "Completed",
  "SCHEDULED" = "Scheduled",
  "PENDING" = "Pending",
  "RUNNING" = "Running",
  "PAUSED" = "Paused",
  "CANCELLING" = "Cancelling",
  "CANCELLED" = "Cancelled",
  "FAILED" = "Failed",
  "CRASHED" = "Crashed",
}
