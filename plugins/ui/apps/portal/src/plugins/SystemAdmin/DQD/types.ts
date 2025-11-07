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

export interface LineChartFormatConfig {
  tooltipFormat?: string;
  xAxisFormat?: string;
  yAxisFormat?: string;
}
export interface DatasetRelease {
  id: number;
  name: string;
  releaseDate: string;
}

export enum JobRunTypes {
  DQD = "dqd",
  DataCharacterization = "data_characterization",
}

export enum FlowRunJobStateTypes {
  "COMPLETED" = "COMPLETED",
  "SCHEDULED" = "SCHEDULED",
  "PENDING" = "PENDING",
  "RUNNING" = "RUNNING",
  "PAUSED" = "PAUSED",
  "CANCELLING" = "CANCELLING",
  "CANCELLED" = "CANCELLED",
  "FAILED" = "FAILED",
  "CRASHED" = "CRASHED",
}

export const FlowRunInProgressJobStateTypes = [
  FlowRunJobStateTypes.SCHEDULED,
  FlowRunJobStateTypes.PENDING,
  FlowRunJobStateTypes.RUNNING,
  FlowRunJobStateTypes.PAUSED,
];

export const FlowRunCancelledJobTypes = [FlowRunJobStateTypes.CANCELLING, FlowRunJobStateTypes.CANCELLED];

export const FlowRunFailedJobTypes = [FlowRunJobStateTypes.FAILED, FlowRunJobStateTypes.CRASHED];

export enum DQD_TABLE_TYPES {
  DATA_QUALITY_OVERVIEW = "DATA_QUALITY_OVERVIEW",
  DATA_QUALITY_RESULTS = "DATA_QUALITY_RESULTS",
  DATA_CHARACTERIZATION = "DATA_CHARACTERIZATION",
}
