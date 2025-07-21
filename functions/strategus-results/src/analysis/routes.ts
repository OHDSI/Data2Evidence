import express, { Request, Response } from "express";
import StrategusAnalysisService from "./services.ts";

export default class StrategusAnalysisRouter {
  public router = express.Router();
  public strategusAnalysisService = new StrategusAnalysisService();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/", this.createStrategusAnalysis.bind(this));
    this.router.put("/", this.createStrategusAnalysis.bind(this));
  }

  private async createStrategusAnalysis(req: Request, res: Response) {
    try {
      const { studyId, analysisSpec } = req.body;
      const token = req.headers["authorization"]
      if (!studyId || !analysisSpec) {
        return res.status(400).json({
          message: "Missing required fields: studyId, or analysisSpec",
        });
      }

      // use the service to create or update the analysis specification
      const result = await this.strategusAnalysisService.createAnalysisSpec(
        token,
        analysisSpec,
        studyId
      );

      res.status(200).json({
        message: result.message,
        analysisId: result.analysisId,
      });

    } catch (error) {
      console.error("Error saving strategus analysis specification:", error);
      res.status(500).json({
        message: "An error occurred while saving the analysis specification",
      });
    }
  }
}
