import { query, body } from "express-validator";

export const GetConceptMappingDto = () => [
  query("datasetId")
    .isUUID()
    .notEmpty()
    .withMessage("datasetId is required and must be a valid UUID"),
];

export const ConceptMappingDto = () => [
  ...GetConceptMappingDto(),
  body("sourceVocabularyId"),
  body("conceptMappings")
    .isString()
    .notEmpty()
    .withMessage("concept mappings is required"),
];
