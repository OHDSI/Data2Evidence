import { Request, Response, Router } from "express";
import { validationResult } from "express-validator";
import { validateDataQualityFlowRunDto } from "../middlewares/DqdRequestValidatorMiddlewares.ts";
import { AnalysisService } from "../services/AnalysisService.ts";
import { DqdService } from "../services/DqdService.ts";

export class ResearcherController {
  private dqdService: DqdService;
  private analysisService: AnalysisService;
  public router = Router();

  constructor() {
    this.dqdService = new DqdService();
    this.analysisService = new AnalysisService();
    this.registerRoutes();
  }

  private registerRoutes() {
    // Researcher DQD execute endpoint
    this.router.post(
      "/dqd/flow-run",
      validateDataQualityFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.createDqdFlowRun(req, res);
      }
    );

    // Researcher Cohort DQD execute endpoint
    this.router.post(
      "/cohort-dqd/flow-run",
      validateDataQualityFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.createCohortDqdFlowRun(req, res);
      }
    );

    // Researcher Analysis-UI execute endpoint
    this.router.post(
      "/analysis-ui/flow-run",
      async (req: Request, res: Response) => {
        await this.createAnalysisFlowRun(req, res);
      }
    );
  }

  // Execute flow methods
  private async createDqdFlowRun(req: Request, res: Response) {
    try {
      const result = await this.dqdService.createDataQualityFlowRun(req);
      return res.status(201).send(result);
    } catch (error) {
      console.error("Error in researcher createDqdFlowRun: ", error);
      // A service-tagged client error (e.g. a dataset missing a prerequisite
      // table) carries the message worth showing; anything else stays generic.
      const status =
        typeof (error as { statusCode?: number })?.statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : 500;
      return res
        .status(status)
        .send({
          message: status === 500
            ? "Internal Server Error"
            : (error as Error).message,
        });
    }
  }

  private async createCohortDqdFlowRun(req: Request, res: Response) {
    try {
      const result = await this.dqdService.createDataQualityFlowRun(req);
      return res.status(201).send(result);
    } catch (error) {
      console.error("Error in researcher createCohortDqdFlowRun: ", error);
      // A service-tagged client error (e.g. a dataset missing a prerequisite
      // table) carries the message worth showing; anything else stays generic.
      const status =
        typeof (error as { statusCode?: number })?.statusCode === "number"
          ? (error as { statusCode: number }).statusCode
          : 500;
      return res
        .status(status)
        .send({
          message: status === 500
            ? "Internal Server Error"
            : (error as Error).message,
        });
    }
  }

  private async createAnalysisFlowRun(req: Request, res: Response) {
    try {
      const result = await this.analysisService.createAnalysisflow(
        req.body,
        req.username
      );
      return res.status(201).send(result);
    } catch (error) {
      console.error("Error in researcher createAnalysisFlowRun: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }
}
