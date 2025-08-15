import { body } from "express-validator";

// Validation rules for PhenotypeFlowRunDto
export const validatePhenotypeFlowRunDto = () => [
  body("options.materialize")
    .isBoolean()
    .withMessage("materialize is required and must be a boolean"),

  body("options.cohortsId")
    .isString()
    .notEmpty()
    .withMessage("cohortsId is required and must be a string"),

  body("options.datasetId")
    .isString()
    .notEmpty()
    .withMessage("datasetId is required and must be a string"),

  body("options.user_name")
    .optional({ nullable: true })
    .isString()
    .withMessage("user_name must be a string or null"),
];
