import { body } from "express-validator";

// Validation rules for DataCharacterizationFlowRunDto
export const validateDataCharacterizationFlowRunDto = () => [
  body("datasetId").isUUID().withMessage("datasetId must be a valid UUID"),

  body("resultsSchema")
    .optional()
    .isString()
    .withMessage("resultsSchema must be a string if provided"),

  body("comment")
    .optional()
    .isString()
    .withMessage("comment must be a string if provided"),

  body("releaseId")
    .optional()
    .isString()
    .withMessage("releaseId must be a string if provided"),

  body("excludeAnalysisIds")
    .optional()
    .isString()
    .withMessage("excludeAnalysisIds must be a string if provided"),
];
