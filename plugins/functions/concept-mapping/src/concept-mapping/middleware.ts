import { query, body } from "express-validator";

export const GetConceptMappingDto = () => [
  query("databaseCode")
    .isString()
    .notEmpty()
    .withMessage("databaseCode is required"),
  query("schemaName")
    .isString()
    .notEmpty()
    .withMessage("schemaName is required"),
  // Optional: when supplied, the dataset's persisted cacheId is authoritative.
  // Omitted by pre-dataset / infra callers, which keep the databaseCode path.
  query("datasetId")
    .optional()
    .isUUID()
    .withMessage("datasetId must be a UUID"),
];

export const ConceptMappingDto = () => [
  ...GetConceptMappingDto(),
  body("sourceVocabularyId"),
  body("conceptMappings")
    .isString()
    .notEmpty()
    .withMessage("concept mappings is required"),
];
