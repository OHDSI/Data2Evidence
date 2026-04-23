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
    this.router.put("/", this.updateStrategusAnalysis.bind(this));
    this.router.get("/:studyId", this.getStrategusAnalysis.bind(this));
    this.router.get("/", this.getAllStrategusAnalysis.bind(this));
    this.router.post("/code", this.saveStudyAnalysisViewerCode.bind(this));
  }

  private async getAllStrategusAnalysis(req: Request, res: Response) {
    try {
      const token = req.headers["authorization"] as string;
      const { datasetId } = req.query;
      if (datasetId && typeof datasetId === "string") {
        const analysis =
          await this.strategusAnalysisService.getAnalysisByDatasetId(datasetId);
        if (!analysis) {
          return res
            .status(404)
            .json({ message: "Analysis not found for this dataset" });
        }
        return res.status(200).json(analysis);
      }
      const analysisList =
        await this.strategusAnalysisService.getAllAnalysis(token);
      res.status(200).json(analysisList);
    } catch (error) {
      console.error(
        "Error fetching all strategus analysis specifications:",
        error,
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

      const token = req.headers["authorization"] as string;
      const result = await this.strategusAnalysisService.getStudyAnalysis(
        studyId as string,
        token,
      );

      res.status(200).json(result);
    } catch (error) {
      console.error("Error fetching strategus analysis specification:", error);
      res.status(500).json({
        message: "An error occurred while fetching the analysis specification",
      });
    }
  }

  // endpoint is used by JobPlugins whenever user runs/executes a strategus analysis from the portal; it updates the analysis specification in the database
  private async updateStrategusAnalysis(req: Request, res: Response) {
    try {
      const { studyId, analysisSpec, databaseCode } = req.body;
      const token = req.headers["authorization"];
      if (!studyId || !analysisSpec || !databaseCode) {
        return res.status(400).json({
          message:
            "Missing required fields: studyId, analysisSpec, or databaseCode",
        });
      }

      const result =
        await this.strategusAnalysisService.updateStrategusAnalysis(
          token,
          studyId,
          analysisSpec,
          databaseCode,
        );

      res.status(200).json({
        message: result.message,
        analysisId: result.analysisId,
      });
    } catch (error) {
      console.error("Error updating strategus analysis specification:", error);
      res.status(500).json({
        message: `An error occurred while updating the analysis specification: ${error.message}`,
      });
    }
  }

  private async createStrategusAnalysis(req: Request, res: Response) {
    try {
      const {
        studyId,
        tokenStudyCode,
        tenantId,
        analysisSpec,
        mode,
        notebookName,
      } = req.body;
      const token = req.headers["authorization"];
      if (!studyId || !tokenStudyCode || !tenantId || !analysisSpec) {
        return res.status(400).json({
          message:
            "Missing required fields: studyId, tokenStudyCode, tenantId, or analysisSpec",
        });
      }

      const result = await this.strategusAnalysisService.createAnalysisSpec(
        token,
        studyId,
        tokenStudyCode,
        tenantId,
        notebookName,
        analysisSpec,
        mode,
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

  private async saveStudyAnalysisViewerCode(req: Request, res: Response) {
    try {
      const { studyId, viewerCode } = req.body;

      if (!studyId || !viewerCode) {
        return res.status(400).json({
          message: "Missing required fields: studyId, or viewerCode",
        });
      }

      const result =
        await this.strategusAnalysisService.saveStudyAnalysisViewerCode(
          studyId,
          viewerCode,
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
