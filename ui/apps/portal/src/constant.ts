import { SourceDatasetType, CacheDatasetType, DatasetType, ActionValue, DatasetInfoTab } from "./types";

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
  DISCLAIMER = "disclaimer",
  DISCLAIMER_DISPLAY = "disclaimer-display",
}

export const PUB_SLOT_NAME = "data2evidence";

export const DatasetMap: Record<SourceDatasetType, CacheDatasetType[]> = {
  [SourceDatasetType.SOURCE]: [
    CacheDatasetType.OMOP,
    CacheDatasetType.STUDY,
    CacheDatasetType.HANA__OMOP,
    CacheDatasetType.HANA__NON_OMOP,
  ],
  [SourceDatasetType.FHIR]: [CacheDatasetType.NON_OMOP],
};

export const ResearcherFeatures = ["Notebooks", "Results", "Concepts", "Cohorts", "Analysis"];

export const ActionSelectorMap: Record<DatasetType, ActionValue[]> = {
  source: ["info", "metadata", "version", "delete"],
  fhir: ["info", "metadata", "version", "delete"],
  non_omop: ["metadata", "permissions", "resources", "delete"],
  omop: [
    "metadata",
    "permissions",
    "resources",
    "delete",
    "data-quality",
    "data-characterization",
    "setup-semantic-search",
    "manage-dashboard",
    "create-cache",
  ],
  study: ["metadata", "permissions", "resources", "delete"],
  hana__omop: [
    "metadata",
    "permissions",
    "resources",
    "delete",
    "data-quality",
    "data-characterization",
    "manage-dashboard",
  ],
  hana__non_omop: ["metadata", "permissions", "resources", "delete", "manage-dashboard"],
};

export const InformationPageMap: Record<DatasetType, DatasetInfoTab[]> = {
  source: [],
  fhir: [],
  non_omop: [DatasetInfoTab.DatasetInfo],
  omop: [DatasetInfoTab.DatasetInfo, DatasetInfoTab.DataQuality, DatasetInfoTab.DataCharacterization],
  study: [DatasetInfoTab.DatasetInfo],
  hana__omop: [DatasetInfoTab.DatasetInfo, DatasetInfoTab.DataQuality, DatasetInfoTab.DataCharacterization],
  hana__non_omop: [DatasetInfoTab.DatasetInfo, DatasetInfoTab.DataQuality, DatasetInfoTab.DataCharacterization],
};

export const ResearcherFeatureMap: Record<DatasetType, (typeof ResearcherFeatures)[number][]> = {
  source: [],
  fhir: [],
  non_omop: ["Cohorts", "Notebooks", "Concepts"],
  omop: ["Cohorts", "Notebooks", "Analysis", "Concepts"],
  study: ["Cohorts", "Notebooks", "Results"],
  hana__omop: ["Cohorts", "Concepts"],
  hana__non_omop: ["Cohorts", "Concepts"],
};

export enum LogResponseType {
  ACCEPTED = "ACCEPTED",
  DECLINED = "DECLINED",
}
