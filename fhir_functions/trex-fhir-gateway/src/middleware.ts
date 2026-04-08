import { body, param } from "express-validator";

// Validation rules for createDataset
export const validateCreateFhirDatasetDto = () => [
  body("id").isUUID().withMessage("id must be a uuid"),
  body("name")
    .optional()
    .isString()
    .withMessage("name must be a string if provided"),
];

export const validateProxyDto = () => [
  param("id").isUUID().withMessage("id must be a uuid"),
];

// Validation rules for deleteDataset
export const validateDeleteFhirDatasetDto = () => [
  param("id").isUUID().withMessage("id must be a uuid"),
];
