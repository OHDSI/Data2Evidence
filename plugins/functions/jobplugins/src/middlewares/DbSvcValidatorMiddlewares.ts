import { body } from "express-validator";

// Validation rules for DBSvcFlowRunDto
export const validateDBSvcFlowRunDto = () => [
  body("dbSvcOperation")
    .isString()
    .withMessage("dbSvcOperation must be a string"),

  body("requestType").isString().withMessage("requestType must be a string"),

  body("requestUrl").isString().withMessage("requestUrl must be a string"),

  body("requestBody")
    .optional()
    .isObject()
    .withMessage("requestBody must be an object if provided"),
];

// Validation rules for DatasetAttributesFlowRunDto
export const validateDatasetAttributesFlowRunDto = () => [
  body("token").isString().withMessage("token must be a string"),

  body("versionInfo").isObject().withMessage("versionInfo must be an object"),

  body("datasetSchemaMapping")
    .isArray()
    .withMessage("datasetSchemaMapping must be an array"),
];
