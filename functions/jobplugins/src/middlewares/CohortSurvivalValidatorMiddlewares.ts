import { body } from "express-validator";

// Validation rules for CohortSurvivalFlowRunOptions
export const validateCohortSurvivalFlowRunDto = () => [
  body("options.databaseCode")
    .isString()
    .withMessage("databaseCode must be a string"),
  body("options.schemaName")
    .isString()
    .withMessage("schemaName must be a string"),
  body("options.datasetId")
    .isString()
    .withMessage("datasetId must be a string"),
  body("options.targetCohortDefinitionId")
    .isNumeric()
    .withMessage("targetCohortDefinitionId must be a number"),
  body("options.outcomeCohortDefinitionId")
    .isNumeric()
    .withMessage("outcomeCohortDefinitionId must be a number"),
];
