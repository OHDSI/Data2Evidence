import { Request, Response, Router } from "express";
import { validationResult } from "express-validator";
import {
  validateDatasetAttributesFlowRunDto,
  validateDBSvcFlowRunDto,
} from "../middlewares/DbSvcValidatorMiddlewares.ts";
import { DbSvcService } from "../services/DbSvcService.ts";

export class DbSvcController {
  private dbSvcService: DbSvcService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.dbSvcService = new DbSvcService();
  }

  private registerRoutes() {
    // POST /db-svc/flow-run
    this.router.post(
      "/flow-run",
      validateDBSvcFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createDbSvcFlowRun(req, res);
      }
    );

    // POST /db-svc/dataset-attributes
    this.router.post(
      "/dataset-attributes",
      validateDatasetAttributesFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.updateDatasetAttributes(req, res);
      }
    );
  }

  private async createDbSvcFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const dbSvcFlowRunDto = req.body;
      const result = await this.dbSvcService.createDbSvcFlowRun(
        dbSvcFlowRunDto,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error creating db-svc flow run: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }
  private async updateDatasetAttributes(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const datasetAttributesDto = req.body;
      const result = await this.dbSvcService.updateDatasetAttributes(
        datasetAttributesDto,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error updating dataset attributes: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }
}
