export const i18nDefault = {
  default: {
    CSV_READER__CLICK_MESSAGE: "Click here to choose a file, or drop a file",
    CSV_READER__SUPPORTED_FILE_TYPES: "Supported file types: CSV",
    CSV_READER__UNSUPPORTED_FILE_TYPE: "Unsupported file type",
    EXPORT_MAPPING_DIALOG__TITLE: "Export mappings to database",
    EXPORT_MAPPING_DIALOG__FORM_TITLE: "Concept Mapping Configuration",
    EXPORT_MAPPING_DIALOG__SOURCE_VOCABULARY_ID: "SOURCE VOCABULARY ID",
    EXPORT_MAPPING_DIALOG__HELPER_TEXT:
      "id should be more than 100 so that it can be easily identified as a non-OMOP vocabulary",
    EXPORT_MAPPING_DIALOG__REQUIRED: "This is required",
    EXPORT_MAPPING_DIALOG__NO_DATA: "No data available",
    IMPORT_DIALOG__ADDITIONAL_INFO_COLUMN: "Additional info column",
    IMPORT_DIALOG__CANCEL: "Cancel",
    IMPORT_DIALOG__COLUMN_MAPPING: "Column Mapping",
    IMPORT_DIALOG__IMPORT: "Import",
    IMPORT_DIALOG__SOURCE_CODE_COLUMN: "Source code colum",
    IMPORT_DIALOG__SOURCE_CODE_NAME: "Source name column",
    IMPORT_DIALOG__SOURCE_FREQUENCY_COLUMN: "Source frequency column",
    IMPORT_DIALOG__SHOW_SOURCE_DOMAIN_COLUMN: "Show source domain column selection",
    IMPORT_DIALOG__SOURCE_DOMAIN_COLUMN: "Source domain column",
    MAPPING_TABLE__CONCEPT_ID: "Concept ID",
    MAPPING_TABLE__CONCEPT_NAME: "Concept Name",
    MAPPING_TABLE__DESCRIPTION: "Description",
    MAPPING_TABLE__DOMAIN_ID: "Domain",
    MAPPING_TABLE__FREQUENCY: "Frequency",
    MAPPING_TABLE__VOCABULARY: "Vocabulary",
    MAPPING_TABLE__NAME: "Name",
    MAPPING_TABLE__POPULATE_CONCEPTS: "Populate concepts",
    MAPPING_TABLE__SOURCE: "Source",
    MAPPING_TABLE__STATUS: "Status",
    OVERVIEW__CLEAR_AND_IMPORT: "Clear and Import another file",
    OVERVIEW__CONCEPT_ID: "Concept Id",
    OVERVIEW__CONCEPT_MAPPING: "Concept Mapping",
    OVERVIEW__CONCEPT_NAME: "Concept Name",
    OVERVIEW__DESCRIPTION: "Description",
    OVERVIEW__DOMAIN: "Domain",
    OVERVIEW__DOWNLOAD_CSV: "Download CSV",
    OVERVIEW__FREQUENCY: "Frequency",
    OVERVIEW__NAME: "Name",
    OVERVIEW__NO_DATASET: "No dataset available",
    OVERVIEW__REFERENCE_CONCEPTS: "Reference concepts from dataset",
    OVERVIEW__SOURCE: "Source",
    SOURCE_TO_CONCEPT_MAP_TABLE__SOURCE_CODE: "Source Code",
    SOURCE_TO_CONCEPT_MAP_TABLE__SOURCE_CONCEPT_ID: "Source Concept ID",
    SOURCE_TO_CONCEPT_MAP_TABLE__SOURCE_VOCABULARY_ID: "Source Vocabulary ID",
    SOURCE_TO_CONCEPT_MAP_TABLE__SOURCE_CODE_DESCRIPTION: "Source Code Description",
    SOURCE_TO_CONCEPT_MAP_TABLE__TARGET_CONCEPT_ID: "Target Concept ID",
    SOURCE_TO_CONCEPT_MAP_TABLE__TARGET_VOCABULARY_ID: "Target Vocabulary ID",
    SOURCE_TO_CONCEPT_MAP_TABLE__VALID_START_DATE: "Start Date",
    SOURCE_TO_CONCEPT_MAP_TABLE__VALID_END_DATE: "End Date",
    SOURCE_TO_CONCEPT_MAP_TABLE__INVALID_REASON: "Invalid Reason",
  },
};

function getKeyMap<T extends object>(obj: T) {
  const result = {} as Record<keyof T, keyof T>;
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      result[key as keyof T] = key as keyof T;
    }
  }
  return result as { [K in keyof T]: K };
}

// Exposing the default key map so that getText('MRI_PA_FILTERCARD_SELECTION_NONE')
// can be getText(i18nKeys.MRI_PA_FILTERCARD_SELECTION_NONE)
// to prevent typos with the values
export const i18nKeys = getKeyMap(i18nDefault.default);

export interface TranslationState {
  locale: string;
  translations: { [key: string]: typeof i18nDefault.default };
}
