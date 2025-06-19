// export const DATASET_QUERY_ROLES = ["researcher", "systemAdmin"];
export const DATASET_RESEARCHER_ROLE = "researcher";
export const DATASET_SYSTEM_ADMIN_ROLE = "systemAdmin"
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
