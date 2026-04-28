import { body } from "express-validator";

// Validation rules for CreateCachedbFileFlowRunDto
export const validateCreateCachedbFileFlowRunDto = () => [
  body("datasetId").isUUID().withMessage("datasetId must be a valid UUID"),
];
