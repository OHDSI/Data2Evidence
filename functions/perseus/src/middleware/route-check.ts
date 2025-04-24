import { Request, Response, NextFunction } from "express";
import { LookupType } from "../types.ts";
import { CDM_VERSION_LIST } from "../utils/constants.ts";
export const checkCDMVersion = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { cdm_version } = req.query || {};

  if (!cdm_version) {
    return res.status(400).send("cdm_version is required");
  }

  if (!CDM_VERSION_LIST.includes(cdm_version)) {
    return res.status(400).send("cdm_version is not in " + CDM_VERSION_LIST);
  }
  next();
};

export const checkName = (req: Request, res: Response, next: NextFunction) => {
  const { name } = req.query || {};

  if (!name) {
    return res.status(400).send("name is required");
  }
  next();
};

export const checkLookupType = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { lookupType } = req.query || {};

  if (!lookupType) {
    return res.status(400).send("lookupType is required");
  }

  if (!Object.values(LookupType).includes(lookupType)) {
    return res.status(400).send("Invalid lookupType");
  }
  next();
};
