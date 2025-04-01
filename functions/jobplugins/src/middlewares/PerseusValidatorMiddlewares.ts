import { body } from "express-validator";

export const validatePerseusFlowRunDto = () => [
  body("options.method").isString().withMessage("method must be a string"),
  body("options.url").isString().withMessage("url must be a string"),
  body("options.headers").optional(),
  body("options.data").optional(),
];
