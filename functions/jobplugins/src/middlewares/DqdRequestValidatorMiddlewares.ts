import { body, query } from "express-validator";

// Define validation rules for DataQualityFlowRunDto
export const validateDataQualityFlowRunDto = () => [
  body("datasetId").isUUID().withMessage("datasetId must be a valid UUID"),
  body("comment").optional().isString().withMessage("comment must be a string"),
  body("vocabSchemaName")
    .optional()
    .isString()
    .withMessage("vocabSchemaName must be a string"),
  body("releaseId")
    .optional()
    .isString()
    .withMessage("releaseId must be a string"),
  body("cohortDefinitionId")
    .optional()
    .isString()
    .withMessage("cohortDefinitionId must be a string"),
];

export const validateDataQualityDatasetId = () =>
  query("datasetId")
    .isUUID()
    .notEmpty()
    .withMessage("datasetId is required and must be a valid UUID");
