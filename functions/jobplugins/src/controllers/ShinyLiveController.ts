import { Request, Response, Router } from "express";
import { body, param, validationResult } from "express-validator";
import { ShinyLiveService } from "../services/ShinyLiveService.ts";

export class ShinyLiveController {
  private shinyLiveService: ShinyLiveService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.shinyLiveService = new ShinyLiveService();
  }

  private registerRoutes() {
    // POST /shiny-live/flow-run
    this.router.post(
      "/flow-run",
      [
        body("datasetId").isString().notEmpty(),
        body("language").isIn(["python", "r"]),
        body("appCode").isString().notEmpty(),
      ],
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        await this.createShinyLiveFlowRun(req, res);
      }
    );

    // GET /shiny-live/flow-run/:flowRunId
    this.router.get(
      "/flow-run/:flowRunId",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        await this.getShinyLiveFlowRun(req, res);
      }
    );

    // GET /shiny-live/flow-run/:flowRunId/poll
    this.router.get(
      "/flow-run/:flowRunId/poll",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        await this.pollShinyLiveFlowRunCompletion(req, res);
      }
    );
  }

  private async createShinyLiveFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization as string;
      const { datasetId, language, appCode } = req.body;

      const result = await this.shinyLiveService.createShinyLiveFlowRun(
        { datasetId, language, appCode },
        token
      );

      res.status(201).json(result);
    } catch (error: any) {
      console.error("Error creating ShinyLive flow run:", error);
      res.status(500).json({
        error: "Failed to create ShinyLive flow run",
        details: error.message,
      });
    }
  }

  private async getShinyLiveFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization as string;
      const { flowRunId } = req.params;

      const result = await this.shinyLiveService.getShinyLiveFlowRun(
        flowRunId,
        token
      );

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error getting ShinyLive flow run:", error);
      res.status(500).json({
        error: "Failed to get ShinyLive flow run",
        details: error.message,
      });
    }
  }

  private async pollShinyLiveFlowRunCompletion(req: Request, res: Response) {
    try {
      const token = req.headers.authorization as string;
      const { flowRunId } = req.params;

      const result = await this.shinyLiveService.pollShinyLiveFlowRunCompletion(
        flowRunId,
        token
      );

      res.status(200).json(result);
    } catch (error: any) {
      console.error("Error polling ShinyLive flow run completion:", error);
      res.status(500).json({
        error: "Failed to poll ShinyLive flow run completion",
        details: error.message,
      });
    }
  }
}
