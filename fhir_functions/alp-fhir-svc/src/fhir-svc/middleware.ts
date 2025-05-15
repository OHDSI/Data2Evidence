import { body, param } from "express-validator";

// Validation rules for createProject
export const validateCreateFhirProjectDto = () => [
  body("name")
    .isString()
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Name must be a string and should only contain letters, numbers, and underscores"
    ),
  body("description")
    .optional()
    .isString()
    .withMessage("Description must be a string if provided"),
];

export const validateProxyDto = () => [
  param("projectName")
    .isString()
    .matches(/^[a-zA-Z0-9_]+$/)
    .withMessage(
      "Name must be a string and should only contain letters, numbers, and underscores"
    ),
];

// Validation rules for createProject
export const validateDeleteFhirProjectDto = () => [
  param("id")
    .isString()
    .matches(/^[a-zA-Z0-9_-]+$/)
    .withMessage(
      "Name must be a string and should only contain letters, numbers, hyphen and underscores"
    )
];
