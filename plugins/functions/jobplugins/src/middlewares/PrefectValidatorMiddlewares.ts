import { NextFunction, Request, Response } from "express";
import { param, validationResult } from "express-validator";

const FLOW_RUN_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const validateFlowrunId = [
  param("id")
    .trim()
    .matches(FLOW_RUN_ID_PATTERN)
    .withMessage("id must be in UUID format"),
  (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    return next();
  },
];
