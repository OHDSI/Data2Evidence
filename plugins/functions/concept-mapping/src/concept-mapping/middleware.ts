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
];

export const ConceptMappingDto = () => [
  ...GetConceptMappingDto(),
  body("sourceVocabularyId"),
  body("conceptMappings")
    .isString()
    .notEmpty()
    .withMessage("concept mappings is required"),
];
