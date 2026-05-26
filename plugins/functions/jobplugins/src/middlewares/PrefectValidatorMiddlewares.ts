import { param  } from "express-validator";

export const validateFlowrunId = [
    param('id')
      .isUUID()
      .withMessage('id must be in UUID format'),
  ]
