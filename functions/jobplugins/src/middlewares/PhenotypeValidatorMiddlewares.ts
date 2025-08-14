import { body } from "express-validator";

// Validation rules for PhenotypeFlowRunDto
export const validatePhenotypeFlowRunDto = () => [
  body("options.databaseCode")
    .isString()
    .notEmpty()
    .withMessage("databaseCode is required and must be a string"),

  body("options.cdmschemaName")
    .isString()
    .notEmpty()
    .withMessage("cdmschemaName is required and must be a string"),

  body("options.cohortschemaName")
    .isString()
    .notEmpty()
    .withMessage("cohortschemaName is required and must be a string"),

  body("options.cohortsId")
    .isString()
    .notEmpty()
    .withMessage("cohortsId is required and must be a string"),

  body("options.vocabSchemaName")
    .isString()
    .notEmpty()
    .withMessage("vocabSchemaName is required and must be a string"),
];
