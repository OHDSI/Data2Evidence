import { body, param } from "express-validator";
import { FhirBundleType } from "./types";

const tokenFormat = /^[a-zA-Z0-9_]{1,80}$/;

export const validateCreateFhirDatasetDto = () => [
  body("id").isUUID().withMessage("id must be a valid UUID"),
  body("name").isString().withMessage("name must be a string"),
];

export const validateDeleteFhirDatasetDto = () => [
  param("id").isUUID().withMessage("id must be a valid UUID"),
];

export const validateBundle = () => [
  param("studyToken")
    .matches(tokenFormat)
    .withMessage("studyToken must match the token format"),
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
  param("studyToken")
    .matches(tokenFormat)
    .withMessage("studyToken must match the token format"),
];
