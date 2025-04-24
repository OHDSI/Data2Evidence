export const PrefectTagNames = {
  DQD: ["data_quality_dashboard"],
  DATA_CHARACTERIZATION: ["data_characterization"],
  DB_SVC: ["alp_db_svc"],
};

export const DATA_QUALITY_DOMAINS = [
  "CONDITION_ERA",
  "CONDITION_OCCURRENCE",
  "PROCEDURE_OCCURRENCE",
  "DEATH",
  "MEASUREMENT",
  "DRUG_ERA",
  "DRUG_EXPOSURE",
  "PERSON",
  "OBSERVATION",
  "DEVICE",
  "VISIT_OCCURRENCE",
];

export enum PrefectDeploymentName {
  DQD = "dqd_plugin",
  DATA_CHARACTERIZATION = "data_characterization_plugin",
  COHORT = "cohort_generator_plugin",
  DB_SVC = "alp-db-svc",
  DATASET_ATTRIBUTE = "update-dataset-attributes",
  FETCH_VERSION_INFO = "fetch-version-info",
  COHORT_SURVIVAL = "cohort_survival_plugin",
  DATA_MANAGEMENT = "data_management_plugin",
  DATAMART = "datamart_plugin",
  ANALYSIS_DATA_FLOW = "strategus_plugin",
  UI_DATA_FLOW = "dataflow_ui_plugin",
  CACHEDB_CREATE_FILE = "create_cachedb_file_plugin",
  WHITE_RABBIT = "white_rabbit_plugin",
}

export enum PrefectFlowName {
  DQD = "dqd_plugin",
  DATA_CHARACTERIZATION = "data_characterization_plugin",
  COHORT = "cohort_generator_plugin",
  DB_SVC = "execute-alp-db-svc-flow",
  DATASET_ATTRIBUTE = "update-dataset-attributes-flow",
  FETCH_VERSION_INFO = "fetch-version-info-flow",
  COHORT_SURVIVAL = "cohort_survival_plugin",
  DATA_MANAGEMENT = "data_management_plugin",
  ANALYSIS_DATA_FLOW = "strategus_plugin",
  UI_DATA_FLOW = "dataflow_ui_plugin",
  CACHEDB_CREATE_FILE = "create_cachedb_file_plugin",
  DATAMART = "datamart_plugin",
  WHITE_RABBIT = "white_rabbit_plugin",
}

export enum FLOW_RUN_STATE_TYPES {
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

export enum FlowRunState {
  SCHEDULED = "Scheduled",
  LATE = "Late",
  RESUMING = "Resuming",
  AWAITING_RETRY = "AwaitingRetry",
  PENDING = "Pending",
  PAUSED = "Paused",
  RUNNING = "Running",
  RETRYING = "Retrying",
  COMPLETED = "Completed",
  CANCELLED = "Cancelled",
  CANCELLING = "Cancelling",
  CRASHED = "Crashed",
  FAILED = "Failed",
  TIMED_OUT = "TimedOut",
}
