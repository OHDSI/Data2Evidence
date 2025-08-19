import { body } from "express-validator";

// Validation rules for PhenotypeFlowRunDto
export const validatePhenotypeFlowRunDto = () => [
  body("options.materialize")
    .isBoolean()
    .withMessage("materialize is required and must be a boolean"),

  body("options.cohorts_id")
    .isString()
    .notEmpty()
    .withMessage("cohorts_id is required and must be a string"),

  body("options.dataset_id")
    .isString()
    .notEmpty()
    .withMessage("dataset_id is required and must be a string"),

  body("options.user_name")
    .optional({ nullable: true })
    .isString()
    .withMessage("user_name must be a string or null"),
];
