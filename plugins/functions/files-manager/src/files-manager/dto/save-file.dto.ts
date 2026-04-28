import { body, check } from "express-validator";

export const SaveFileDto = () => [
  body("username").isString().notEmpty().withMessage("username is required"),
  body("dataKey").isString().notEmpty().withMessage("dataKey is required"),
  check("file")
    .custom((_value, { req }) => {
      if (req.file && req.file.mimetype === "application/octet-stream") {
        return true;
      } else {
        return false;
      }
    })
    .withMessage("Invalid file type"),
];
