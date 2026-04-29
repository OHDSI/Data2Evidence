
import {Request, Response, NextFunction} from 'express'
import { v4 as uuidv4 } from 'uuid'
import { Logger, utils } from "@alp/alp-base-utils";

import CreateLogger = Logger.CreateLogger;

const logger = CreateLogger("analytics-log");

export default function addCorrelationIDToHeader(req: Request, res: Response, next: NextFunction) {
    if (!req.headers['x-req-correlation-id']) {
      req.headers['x-req-correlation-id'] = uuidv4()
      logger.info(`Added correlation ID[${req.headers['x-req-correlation-id']}] to header...`)
    }
    return next()
  }

