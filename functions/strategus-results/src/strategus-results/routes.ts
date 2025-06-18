import express, { Request, Response } from "express";
import { createStrategusResultsViewer } from "./services.ts";

export class StrategusResultsRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/", async (req: Request, res: Response) => {
      try {
        const token = req.headers["authorization"];
        const studyId = req.body.studyId;
        const datasetId = req.body.datasetId;
        await createStrategusResultsViewer(token, studyId, datasetId);
        res.status(200).json({
          message: `Strategus Results Viewer created successfully for study: ${studyId}`,
        });
      } catch (error) {
        res.status(500).json({
          message: "An error occurred while processing strategus results",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }
}
