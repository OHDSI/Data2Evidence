import { Request, Response, Router } from "express";
import { validationResult } from "express-validator";
import { validateSearchEmbeddingFlowRunDto } from "../middlewares/SearchEmbeddingValidatorMiddlewares.ts";
import { SearchEmbeddingService } from "../services/SearchEmbeddingService.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";

export class SearchEmbeddingController {
  private searchEmbeddingService: SearchEmbeddingService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.searchEmbeddingService = new SearchEmbeddingService();
  }

  private registerRoutes() {
    // POST /search-embedding/create
    this.router.post(
      "/create",
      validateSearchEmbeddingFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createSearchEmbeddingFlowRun(req, res);
      }
    );
  }

  private async createSearchEmbeddingFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const params = req.body;

      const portalServerApi = new PortalServerAPI(token);
      const { databaseCode, schemaName } = await portalServerApi.getDataset(
        params.datasetId
      );

      const result =
        await this.searchEmbeddingService.createSematicEmbeddingsFlowRun(
          { database_code: databaseCode, schema_name: schemaName },
          token
        );
      res.send(result);
    } catch (error) {
      console.error(`Error creating search-embedding flow run: ${error}`);
      res.status(500).send(`${error}`);
    }
  }
}
