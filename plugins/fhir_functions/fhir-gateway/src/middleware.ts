import { body, param } from "express-validator";
import { FhirBundleType } from "./types";

export const validateCreateFhirDatasetDto = () => [
  body("id")
    .isUUID()
    .withMessage("id must be a valid UUID"),
  body("name").isString().withMessage("name must be a string"),
];

export const validateDeleteFhirDatasetDto = () => [
  param("id")
    .isUUID()
    .withMessage("id must be a valid UUID"),
];

export const validateBundle = () => [
  body("resourceType")
    .equals("Bundle")
    .withMessage("Request body must be a FHIR Bundle"),
  body("type")
    .isIn(Object.values(FhirBundleType))
    .withMessage(
      `FHIR Bundle type must be one of: ${Object.values(FhirBundleType).join(", ")}`,
    ),
];

export const validateProxyDto = () => [
  param("id")
    .isUUID()
    .withMessage("id must be a valid UUID"),
];
