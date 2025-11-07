import { Request, Response, Router } from "express";
import { validationResult } from "express-validator";
import { validateCohortGeneratorFlowRunDto } from "../middlewares/CohortValidatorMiddlewares.ts";
import { CohortService } from "../services/CohortService.ts";

export class CohortController {
  private cohortService: CohortService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.cohortService = new CohortService();
  }

  private registerRoutes() {
    // POST /cohort/flow-run
    this.router.post(
      "/flow-run",
      validateCohortGeneratorFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createCohortFlowRun(req, res);
      }
    );
  }

  private async createCohortFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const cohortFlowRunDto = req.body;
      const result = await this.cohortService.createCohortGeneratorFlowRun(
        cohortFlowRunDto,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error creating cohort-generator flow run: ${error}`);
      res.status(500).send(`${error}`);
    }
  }
}
