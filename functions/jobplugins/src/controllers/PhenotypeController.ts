import { Request, Response, Router } from "express";
import { validationResult } from "express-validator";
import { validatePhenotypeFlowRunDto } from "../middlewares/PhenotypeValidatorMiddlewares.ts";
import { PhenotypeService } from "../services/PhenotypeService.ts";

export class PhenotypeController {
  private phenotypeService: PhenotypeService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.phenotypeService = new PhenotypeService();
  }

  private registerRoutes() {
    // POST /phenotype/flow-run
    this.router.post(
      "/flow-run",
      validatePhenotypeFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
          return;
        }
        await this.createPhenotypeFlowRun(req, res);
      }
    );
  }

  private async createPhenotypeFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const phenotypeFlowRunDto = req.body;
      const result = await this.phenotypeService.createPhenotypeFlowRun(
        phenotypeFlowRunDto,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error creating phenotype flow run: ${error}`);
      res.status(500).send(`${error}`);
    }
  }
}
