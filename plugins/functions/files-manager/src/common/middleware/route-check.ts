import { Request, Response, NextFunction } from "express";

export const checkUserDataId = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { userDataId } = req.params || {};

  if (!userDataId) {
    return res.status(400).send("User DataId is required");
  }
  next();
};
