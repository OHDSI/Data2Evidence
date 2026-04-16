import { body, param } from "express-validator";
import { FhirBundleType } from "./types";

const FHIR_DATASET_ID_REGEX =
  /^fhir-[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const validateCreateFhirDatasetDto = () => [
  body("id")
    .matches(FHIR_DATASET_ID_REGEX)
    .withMessage("id must match format fhir-<uuid>"),
  body("name").isString().withMessage("name must be a string"),
];

export const validateDeleteFhirDatasetDto = () => [
  param("id")
    .matches(FHIR_DATASET_ID_REGEX)
    .withMessage("id must match format fhir-<uuid>"),
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
    .matches(FHIR_DATASET_ID_REGEX)
    .withMessage("id must match format fhir-<uuid>"),
];
