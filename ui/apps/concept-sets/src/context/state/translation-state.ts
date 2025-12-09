export const i18nDefault = {
  default: {
    COHORT_HIERARCHY__ERROR: "Please try again.",
    COHORT_HIERARCHY__ERROR_DESCRIPTION: "An error has occured.",
    CONCEPT_SETS__SEARCH: "Concept Search",
    CONCEPT_SETS__ADD_CONCEPT_SET: "Add concept set",
    CONCEPT_SETS__AUTHOR: "Author",
    CONCEPT_SETS__CREATED: "Created",
    CONCEPT_SETS__ERROR_DESCRIPTION: "Please try again.",
    CONCEPT_SETS__ERROR: "An error has occurred",
    CONCEPT_SETS__ID: "ID",
    CONCEPT_SETS__LIST: "Concept Set List",
    CONCEPT_SETS__Name: "Name",
    CONCEPT_SETS__REFERENCE_CONCEPTS: "Reference concepts from dataset",
    CONCEPT_SETS__SHARED: "Shared",
    CONCEPT_SETS__UPDATED: "Updated",
    CONCEPT_SET_DELETE_DIALOG__DELETE_CONCEPT_SET: "Delete concept set",
    CONCEPT_SET_DELETE_DIALOG__ARE_YOU_SURE:
      "Are you sure you want to delete this concept set",
    CONCEPT_SET_DELETE_DIALOG__CANCEL: "Cancel",
    CONCEPT_SET_DELETE_DIALOG__CONFIRM: "Confirm",
    CONCEPT_SET_DELETE_DIALOG__DELETE_SUCCESSFUL:
      "Concept set deleted successfully",
    CONCEPT_SET_DELETE_DIALOG__ERROR_OCCURRED:
      "An error occurred while deleting the concept set",
    CONCEPT_SET_DELETE_DIALOG__ERROR_OCCURRED_DESCRIPTION:
      "Please try again later",
    CONCEPT_SET_DELETE_DIALOG__ERROR_FORBIDDEN:
      "You do not have permission to delete this concept set",
    CONCEPT_SET_DELETE_DIALOG__ERROR_NOT_FOUND: "Concept set not found",
    CONCEPT_SET_DELETE_DIALOG__ERROR_SERVER: "Server error occurred",
    SEARCH_BAR__SEARCH_TERMS: "search terms",
    SEARCH_BAR__SEARCH: "Search",
    TERMINOLOGY__CLOSE: "Close",
    TERMINOLOGY__CONCEPT_SET_NAME: "Concept set name",
    TERMINOLOGY__CONCEPT_SETS: "Concept Sets",
    TERMINOLOGY__CONCEPTS: "Concepts",
    TERMINOLOGY__CREATE: "Create",
    TERMINOLOGY__CREATING: "creating",
    TERMINOLOGY__ERROR: "Error {0} concept set.",
    TERMINOLOGY__CONCEPT_SET_NAME_USED_ERROR:
      "Concept set name {0} already exists. Please enter another name.",
    TERMINOLOGY__MISSING_USER_ID: "Missing User Id",
    TERMINOLOGY__NAME: "Name",
    TERMINOLOGY__REFERENCE_CONCEPTS: "Reference concepts from dataset",
    TERMINOLOGY__RELATED_CONCEPTS: "Related concepts",
    TERMINOLOGY__SEARCH: "Search",
    TERMINOLOGY__SELECT_CONCEPTS: "Select Concepts",
    TERMINOLOGY__SELECTED_CONCEPTS: "Selected concepts",
    TERMINOLOGY__SHARED: "Shared",
    TERMINOLOGY__UPDATE: "Update",
    TERMINOLOGY__UPDATING: "updating",
    TERMINOLOGY_DETAIL__CONCEPT_CLASS_ID: "Concept Class ID",
    TERMINOLOGY_DETAIL__CONCEPT_CODE: "Concept code",
    TERMINOLOGY_DETAIL__CONCEPT_ID: "Concept ID",
    TERMINOLOGY_DETAIL__DETAILS: "Details",
    TERMINOLOGY_DETAIL__DOMAIN_ID: "Domain ID",
    TERMINOLOGY_DETAIL__ERROR_DESCRIPTION: "Please try again.",
    TERMINOLOGY_DETAIL__ERROR: "An error has occurred",
    TERMINOLOGY_DETAIL__HIERARCHY: "Hierarchy",
    TERMINOLOGY_DETAIL__RELATED_CONCEPTS: "Related Concepts",
    TERMINOLOGY_DETAIL__RELATES_TO: "Relates to",
    TERMINOLOGY_DETAIL__RELATIONSHIP: "Relationship",
    TERMINOLOGY_DETAIL__VALIDITY: "Validity",
    TERMINOLOGY_DETAIL__VOCABULARY_ID: "Vocabulary ID",
    TERMINOLOGY_DETAIL__VOCABULARY: "Vocabulary",
    TERMINOLOGY_LIST__: "Please try again.",
    TERMINOLOGY_LIST__CLASS: "Class",
    TERMINOLOGY_LIST__CODE: "Code",
    TERMINOLOGY_LIST__CONCEPT: "Concept",
    TERMINOLOGY_LIST__DESCENDANTS: "Descendants",
    TERMINOLOGY_LIST__DOMAIN: "Domain",
    TERMINOLOGY_LIST__ERROR_DESCRIPTION: "Please try again.",
    TERMINOLOGY_LIST__ERROR: "An error has occurred",
    TERMINOLOGY_LIST__ID: "ID",
    TERMINOLOGY_LIST__MAPPED: "Mapped",
    TERMINOLOGY_LIST__EXCLUDE: "Exclude",
    TERMINOLOGY_LIST__NAME: "Name",
    TERMINOLOGY_LIST__SCORE: "Score",
    TERMINOLOGY_LIST__VALIDITY: "Validity",
    TERMINOLOGY_LIST__VOCABULARY: "Vocabulary",
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

export const i18nKeys = getKeyMap(i18nDefault.default);

export interface TranslationState {
  locale: string;
  translations: { [key: string]: typeof i18nDefault.default };
}
