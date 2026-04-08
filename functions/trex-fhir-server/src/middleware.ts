import { body, param } from "express-validator";

// Validation rules for createProject
export const validateCreateFhirProjectDto = () => [
  body("id")
    .isString()
    .matches(/^[a-zA-Z0-9-]+$/)
    .withMessage("id"),
  body("name")
    .optional()
    .isString()
    .withMessage("name must be a string if provided"),
];

export const validateProxyDto = () => [
  param("id")
    .isString()
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "id must be a string and should only contain letters, numbers, and underscores",
    ),
];

// Validation rules for deleteProject
export const validateDeleteFhirProjectDto = () => [
  param("id")
    .isString()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "id must be a string and should only contain letters, numbers, hyphen and underscores",
    ),
];
