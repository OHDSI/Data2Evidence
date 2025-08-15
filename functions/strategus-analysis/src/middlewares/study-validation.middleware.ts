import { Request, Response, NextFunction } from "express";
import { PortalServerAPI } from "../strategus-results/api/PortalServerAPI.ts";

export const validateStudyIdMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const studyId = req.params.studyId || req.body.studyId;

    if (!studyId) {
      return res.status(400).json({
        message: "Study ID is required",
      });
    }

    const token = req.headers["authorization"];
    const isValidStudy = await validateStudyId(studyId, token);

    if (!isValidStudy) {
      return res.status(404).json({
        message: `Study ${studyId} not found.`,
      });
    }

    next();
  } catch (error) {
    console.error("Error in study validation middleware:", error);
    return res.status(500).json({
      message: "Internal error during study validation",
    });
  }
};

async function validateStudyId(
  studyId: string,
  token?: string
): Promise<boolean> {
  try {
    if (!token) {
      console.warn(
        "No authorization token provided, skipping study validation"
      );
      return true;
    }

    try {
      const portalAPI = new PortalServerAPI(token);
      const studiesData = await portalAPI.getGitStudies();
      return studyId in studiesData;
    } catch (apiError: any) {
      console.error("Error calling PortalServerAPI:", apiError);
      return false;
    }
  } catch (error) {
    console.error("Error validating study ID:", error);
    return false;
  }
}
