import { Request, Response, Router } from "express";
import { param, validationResult } from "express-validator";
import { validateCreateCachedbFileFlowRunDto } from "../middlewares/CachedbValidatorMiddlewares.ts";
import { CachedbService } from "../services/CachedbService.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";

export class CachedbController {
  private cachedbService: CachedbService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.cachedbService = new CachedbService();
  }

  private registerRoutes() {
    // POST /cachedb/create-file
    this.router.post(
      "/create-file",
      validateCreateCachedbFileFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.createCachedbFileFlowRun(req, res);
      }
    );

    // GET /cachedb/results/:flowRunId
    this.router.get(
      "/results/:flowRunId",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getFlowRunResults(req, res);
      }
    );

    // GET /cachedb/completed/:flowRunId
    this.router.get(
      "/completed/:flowRunId",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getCompletedFlowRunId(req, res);
      }
    );
  }

  private async createCachedbFileFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const params = req.body;

      const portalServerApi = new PortalServerAPI(token);
      const flowActionType = "create_datamart_cache";
      const { databaseCode, schemaName, resultsSchemaName } =
        await portalServerApi.getDataset(params.datasetId);

      const cacheDatasetId = params?.cacheDatasetId;
      let snapshotSchemaName;

      if (cacheDatasetId) {
        const { schemaName } = await portalServerApi.getDataset(
          params.cacheDatasetId
        );
        snapshotSchemaName = schemaName;
      }

      const result = await this.cachedbService.createCachedbFileFlowRun(
        {
          flowActionType,
          databaseCode,
          schemaName,
          resultsSchemaName,
          snapshotSchemaName,
        },
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error creating cachedb file flow run: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getFlowRunResults(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const flowRunId = req.params.flowRunId;
      const result = await this.cachedbService.getFlowRunResults(
        flowRunId,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error getting cachedb file results: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getCompletedFlowRunId(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const flowRunId = req.params.flowRunId;
      const result = await this.cachedbService.getCompletedFlowRunId(
        flowRunId,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error getting completed flow run id: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }
}
