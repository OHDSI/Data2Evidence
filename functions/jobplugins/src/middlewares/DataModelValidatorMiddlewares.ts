import { body } from "express-validator";

export const validateDatamodelFlowRunDto = () => [
  body("flowRunName").isString().withMessage("flowRunName must be a string"),

  body("options").isObject().withMessage("options must be an object"),
];
