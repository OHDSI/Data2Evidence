import { Request, Response, Router } from "express";
import { param, validationResult } from "express-validator";
import { validateCohortSurvivalFlowRunDto } from "../middlewares/CohortSurvivalValidatorMiddlewares.ts";
import { CohortSurvivalService } from "../services/CohortSurvivalService.ts";

export class CohortSurvivalController {
  private cohortSurvivalService: CohortSurvivalService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.cohortSurvivalService = new CohortSurvivalService();
  }

  private registerRoutes() {
    // POST /cohort-survival/flow-run
    this.router.post(
      "/flow-run",
      validateCohortSurvivalFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createCohortSurvivalFlowRun(req, res);
      }
    );

    // GET /cohort-survival/results/:flowRunId
    this.router.get(
      "/results/:flowRunId",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.getCohortSurvivalResults(req, res);
      }
    );
  }

  private async createCohortSurvivalFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const cohortSurvivalFlowRunDto = req.body;
      const result =
        await this.cohortSurvivalService.createCohortSurvivalFlowRun(
          cohortSurvivalFlowRunDto,
          token
        );
      res.send(result);
    } catch (error) {
      console.error(`Error creating cohort survival flow run: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getCohortSurvivalResults(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const flowRunId = req.params.flowRunId;
      const result = await this.cohortSurvivalService.getCohortSurvivalResults(
        flowRunId,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error getting cohort survival results: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }
}
