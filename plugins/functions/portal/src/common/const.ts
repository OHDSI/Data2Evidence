// export const DATASET_QUERY_ROLES = ["researcher", "systemAdmin"];
export const DATASET_RESEARCHER_ROLE = "researcher";
export const DATASET_SYSTEM_ADMIN_ROLE = "systemAdmin";
export const VISIBILITY_STATUS = ["HIDDEN", "PUBLIC", "DEFAULT"];
export const DATABASE_DIALECTS = ["postgres", "hana"];
export const CDM_SCHEMA_OPTIONS = [
  "create_cdm",
  "no_cdm",
  "custom_cdm",
  "existing_cdm",
];

export enum DomainRequirement {
  CONDITION_OCCURRENCE = "conditionOccurrence",
  DEATH = "death",
  PROCEDURE_OCCURRENCE = "procedureOccurrence",
  DRUG_EXPOSURE = "drugExposure",
  OBSERVATION = "observation",
  MEASUREMENT = "measurement",
  DEVICE_EXPOSURE = "deviceExposure",
}

export const DisplayDomainRequirements = {
  [DomainRequirement.CONDITION_OCCURRENCE]: "Condition Occurrence",
  [DomainRequirement.DEATH]: "Death",
  [DomainRequirement.PROCEDURE_OCCURRENCE]: "Procedure Occurrence",
  [DomainRequirement.DRUG_EXPOSURE]: "Drug Exposure",
  [DomainRequirement.OBSERVATION]: "Observation",
  [DomainRequirement.MEASUREMENT]: "Measurement",
  [DomainRequirement.DEVICE_EXPOSURE]: "Device Exposure",
};

export enum PA_CONFIG_TYPE {
  BACKEND = "backend",
  USER = "user",
}

export const DEFAULT_ERROR_MESSAGE =
  "Error occurred. Please contact we@data4life.help for further support.";

export enum ATTRIBUTE_CONFIG_DATA_TYPES {
  STRING = "STRING",
  TIMESTAMP = "TIMESTAMP",
  NUMBER = "NUMBER",
  JSON = "JSON",
}
export enum ATTRIBUTE_CONFIG_CATEGORIES {
  DATASET = "DATASET",
  FILE = "FILE",
}

export const PORTAL_REPOSITORY = "PORTAL_REPOSITORY";
export const STUDIES_JSON_NAME = "studies.json";

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
}

export const PUBLIC_CONFIG_TYPES = [ConfigTypes.OVERVIEW_DESCRIPTION];

// Secret config types to be redacted
export const SECRET_CONFIG_TYPES = [];

// Secret config types to be redacted for the parseValue.pat
export const PAT_SECRET_CONFIG_TYPES = [
  ConfigTypes.DATAFLOW_GIT_CONFIG,
  ConfigTypes.NOTEBOOK_GIT_CONFIG,
];

export const REDACTED_TEXT = "***REDACTED***";
