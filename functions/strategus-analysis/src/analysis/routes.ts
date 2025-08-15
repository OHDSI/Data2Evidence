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
    this.router.get("/:studyId", this.getStrategusAnalysis.bind(this));
    this.router.get("/", this.getAllStrategusAnalysis.bind(this));
  }

  private async getAllStrategusAnalysis(req: Request, res: Response) {
    try {
      const analysisList = await this.strategusAnalysisService.getAllAnalysis();
      res.status(200).json(analysisList);
    } catch (error) {
      console.error(
        "Error fetching all strategus analysis specifications:",
        error
      );
      res.status(500).json({
        message: "An error occurred while fetching all analysis specifications",
      });
    }
  }

  private async getStrategusAnalysis(req: Request, res: Response) {
    try {
      const studyId = req.params.studyId;
      if (!studyId) {
        return res.status(400).json({
          message: "Missing required field: studyId",
        });
      }

      const result = await this.strategusAnalysisService.getStudyAnalysis(
        studyId as string
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching strategus analysis specification:", error);
      res.status(500).json({
        message: "An error occurred while fetching the analysis specification",
      });
    }
  }

  private async createStrategusAnalysis(req: Request, res: Response) {
    try {
      const { studyId, analysisSpec, mode, notebookName } = req.body;
      const token = req.headers["authorization"];
      if (!studyId || !analysisSpec) {
        return res.status(400).json({
          message: "Missing required fields: studyId, or analysisSpec",
        });
      }

      const result = await this.strategusAnalysisService.createAnalysisSpec(
        token,
        studyId,
        notebookName,
        analysisSpec,
        mode
      );

      res.status(200).json({
        message: result.message,
        analysisId: result.analysisId,
      });
    } catch (error) {
      console.error("Error saving strategus analysis specification:", error);
      res.status(500).json({
        message: `An error occurred while saving the analysis specification: ${error.message}`,
      });
    }
  }
}
