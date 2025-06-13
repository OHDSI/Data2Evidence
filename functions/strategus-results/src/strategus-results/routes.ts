import express, { Request, Response } from "express";
import { createStrategusResultsViewer } from "./services.ts";
import { services } from "../env.ts";
export class StrategusResultsRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/", async (req: Request, res: Response) => {
      try {
        // Simulate a successful response
        const modelResponse = {
          message: "Strategus results processed successfully",
        };
        const token = req.headers["authorization"];
        const studyId = req.body.studyId;
        const ok = createStrategusResultsViewer(token, studyId);
        res.status(200).json(services["jupyter-gateway"]);
      } catch (error) {
        res.status(500).json({
          error: true,
          message: "An error occurred while processing strategus results",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });
  }
}
