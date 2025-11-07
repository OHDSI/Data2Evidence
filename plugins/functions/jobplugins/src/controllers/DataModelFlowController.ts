import { Request, Response, Router } from "express";
import { validationResult } from "express-validator";
import { validateDatamodelFlowRunDto } from "../middlewares/DataModelValidatorMiddlewares.ts";
import { DataModelFlowService } from "../services/DataModelFlowService.ts";
import {
  ICreateDatamartFlowRunDto,
  ICreateDatamodelFlowRunDto,
  IGetVersionInfoFlowRunDto,
} from "../types.ts";

export class DataModelFlowController {
  private DataModelFlowService: DataModelFlowService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.DataModelFlowService = new DataModelFlowService();
    this.DataModelFlowService.initialize();
  }

  private registerRoutes() {
    // GET /datamodel/list
    this.router.get("/list", async (req: Request, res: Response) => {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        res.status(400).json({ errors: errors.array() });
      }
      await this.getDataModels(req, res);
    });

    // POST /datamodel/get_version_info
    this.router.post(
      "/get_version_info",
      validateDatamodelFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createGetVersionInfoFlowRun(req, res);
      }
    );

    // POST /datamodel/create_datamodel_run
    this.router.post(
      "/create_datamodel_run",
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createDatamodelFlowRun(req, res);
      }
    );

    // POST /datamodel/create_datamart_run
    this.router.post(
      "/create_datamart_run",
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createDatamartFlowRun(req, res);
      }
    );
  }

  private async getDataModels(req: Request, res: Response) {
    try {
      const result = await this.DataModelFlowService.getDataModels();
      res.send(result);
    } catch (error) {
      console.error(`Error getting datamodels: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async createGetVersionInfoFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      const getVersionInfoFlowRunDto: IGetVersionInfoFlowRunDto = req.body;
      const result =
        await this.DataModelFlowService.createGetVersionInfoFlowRun(
          getVersionInfoFlowRunDto,
          token
        );
      res.send(result);
    } catch (error) {
      console.error(
        `Error creating data model get version info flow run: ${error}`
      );
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async createDatamodelFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      const createDatamodelFlowRunDto: ICreateDatamodelFlowRunDto = req.body;
      const result = await this.DataModelFlowService.createDatamodelFlowRun(
        createDatamodelFlowRunDto,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(
        `Error creating data model get version info flow run: ${error}`
      );
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async createDatamartFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization;
      const createDatamartFlowRunDto: ICreateDatamartFlowRunDto = req.body;
      const result = await this.DataModelFlowService.createDatamartFlowRun(
        createDatamartFlowRunDto,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error creating datamart flow run: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }
}
