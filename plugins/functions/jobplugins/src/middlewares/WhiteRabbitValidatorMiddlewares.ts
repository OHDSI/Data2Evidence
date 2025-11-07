import { body } from "express-validator";

export const validateWhiteRabbitFlowRunDto = () => [
  body("options.run_type")
    .isString()
    .notEmpty()
    .withMessage("run type is required"),
  body("options.data").optional(),
  body("options.username").isString().optional(),
];
