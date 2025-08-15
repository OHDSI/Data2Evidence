export enum DatasetAttribute {
  PATIENT_COUNT = "patient_count",
  CREATED_DATE = "created_date",
  VERSION = "version",
  ENTITY_COUNT_DISTRIBUTION = "entity_count_distribution",
}

export enum VisibilityStatus {
  HIDDEN = "HIDDEN",
  PUBLIC = "PUBLIC",
  DEFAULT = "DEFAULT",
}

export enum ConfigTypes {
  OVERVIEW_DESCRIPTION = "overview-description",
  PRIVACY_POLICY = "privacy-policy",
  TERMS_OF_USE = "terms-of-use",
  IMPRINT = "imprint",
  PRIVACY_POLICY_DISPLAY = "privacy-policy-display",
  TERMS_OF_USE_DISPLAY = "terms-of-use-display",
  IMPRINT_DISPLAY = "imprint-display",
  HYBRID_SEARCH = "hybrid-search",
  DATAFLOW_GIT_CONFIG = "dataflow-git-config",
  NOTEBOOK_GIT_CONFIG = "notebook-git-config",
  DISCLAIMER_DISPLAY = "disclaimer-display",
}

export const PUB_SLOT_NAME = "data2evidence";
