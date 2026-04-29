import { body } from "express-validator";

// Validation rules for SearchEmbeddingFlowRunOptions
export const validateSearchEmbeddingFlowRunDto = () => [
  body("datasetId").isUUID().withMessage("datasetId must be a valid UUID"),
];
