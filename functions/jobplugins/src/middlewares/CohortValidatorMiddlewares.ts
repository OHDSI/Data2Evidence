import { body } from "express-validator";

// Validation rules for CohortJson
const validateCohortJson = () => [
  body("options.cohortJson.id")
    .isNumeric()
    .withMessage("CohortJson id must be a number"),
  body("options.cohortJson.name")
    .isString()
    .withMessage("CohortJson name must be a string"),
  body("options.cohortJson.createdDate")
    .isNumeric()
    .withMessage("CohortJson createdDate must be a number"),
  body("options.cohortJson.modifiedDate")
    .isNumeric()
    .withMessage("CohortJson modifiedDate must be a number"),
  body("options.cohortJson.hasWriteAccess")
    .isBoolean()
    .withMessage("CohortJson hasWriteAccess must be a boolean"),
  body("options.cohortJson.tags")
    .isArray()
    .withMessage("CohortJson tags must be an array of strings"),
  body("options.cohortJson.expression")
    .isObject()
    .withMessage("CohortJson expression must be an object"),
  body("options.cohortJson.expressionType")
    .isString()
    .withMessage("CohortJson expressionType must be a string"),
];

// Validation rules for CohortGeneratorFlowRunOptions
export const validateCohortGeneratorFlowRunDto = () => [
  body("options.databaseCode")
    .isString()
    .withMessage("databaseCode must be a string"),
  body("options.schemaName")
    .isString()
    .withMessage("schemaName must be a string"),
  body("options.vocabSchemaName")
    .isString()
    .withMessage("vocabSchemaName must be a string"),
  ...validateCohortJson(), // Include the validation for the nested cohortJson object
  body("options.datasetId")
    .isString()
    .withMessage("datasetId must be a string"),
  body("options.description")
    .isString()
    .withMessage("description must be a string"),
  body("options.cohortDefinitionId")
    .isNumeric()
    .withMessage("cohortDefinitionId must be a number"),
];
