import { Request, Response, Router } from "express";
import { param, query, validationResult } from "express-validator";
import { validateDataCharacterizationFlowRunDto } from "../middlewares/DataCharacterizationValidatorMiddlewares.ts";
import { DataCharacterizationService } from "../services/DataCharacterizationService.ts";

export class DataCharacterizationController {
  private datacharacterizationService: DataCharacterizationService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.datacharacterizationService = new DataCharacterizationService();
  }

  private registerRoutes() {
    // GET /data-characterization/flow-run/:flowRunId/results/:sourceKey
    this.router.get(
      "/flow-run/:flowRunId/results/:sourceKey",
      [param("flowRunId").isUUID(), param("sourceKey").isString()],
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.getDataCharacterizationResults(req, res);
      }
    );

    // GET /data-characterization/flow-run/:flowRunId/results/:sourceKey/:conceptId
    this.router.get(
      "/flow-run/:flowRunId/results/:sourceKey/:conceptId",
      [
        param("flowRunId").isUUID(),
        param("sourceKey").isString(),
        param("conceptId").isString(),
      ],
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.getDataCharacterizationResultsDrilldown(req, res);
      }
    );

    // GET /data-characterization/dataset/:datasetId/flow-run/latest
    this.router.get(
      "/flow-run/latest",
      query("datasetId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.getLatestDataCharacterizationFlowRun(req, res);
      }
    );

    // GET /data-characterization/release/:releaseId/flow-run?datasetId[${datasetId}
    this.router.get(
      "/release/:releaseId/flow-run",
      [query("datasetId").isUUID(), param("releaseId").isNumeric()],
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.getReleaseFlowRun(req, res);
      }
    );

    // POST /data-characterization/flow-run
    this.router.post(
      "/flow-run",
      validateDataCharacterizationFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createDataCharacterizationFlowRun(req, res);
      }
    );

    // GET /data-characterization/dataset/:datasetId/flow-run/latest
    this.router.get(
      "/schema-mapping/list",
      async (req: Request, res: Response) => {
        await this.getSchemaMappingList(req, res);
      }
    );
  }

  private async getDataCharacterizationResults(req: Request, res: Response) {
    try {
      const flowRunId = req.params.flowRunId;
      const sourceKey = req.params.sourceKey;
      const token = req.headers.authorization!;
      const dcResult =
        await this.datacharacterizationService.getDataCharacterizationResults(
          flowRunId,
          sourceKey,
          token
        );

      if (dcResult) {
        res.send(dcResult);
      } else {
        res
          .status(404)
          .send(
            `No Data Characterization result found for flowRunId: ${flowRunId}`
          );
      }
    } catch (error) {
      console.error(`Error retrieving Data Characterization result: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getDataCharacterizationResultsDrilldown(
    req: Request,
    res: Response
  ) {
    try {
      const flowRunId = req.params.flowRunId;
      const sourceKey = req.params.sourceKey;
      const conceptId = req.params.conceptId;
      const token = req.headers.authorization!;
      const dcResult =
        await this.datacharacterizationService.getDataCharacterizationResultsDrilldown(
          flowRunId,
          sourceKey,
          conceptId,
          token
        );

      if (dcResult) {
        res.send(dcResult);
      } else {
        res
          .status(404)
          .send(
            `No Data Characterization result drill down found for flowRunId: ${flowRunId}`
          );
      }
    } catch (error) {
      console.error(`Error retrieving DC result drill down: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getLatestDataCharacterizationFlowRun(
    req: Request,
    res: Response
  ) {
    try {
      const datasetId = req.query.datasetId;
      const token = req.headers.authorization!;
      const dcResult =
        await this.datacharacterizationService.getLatestDataCharacterizationFlowRun(
          datasetId,
          token
        );

      if (dcResult) {
        res.send(dcResult);
      } else {
        res
          .status(404)
          .send(
            `No Data Characterization result found for datasetId: ${datasetId}`
          );
      }
    } catch (error) {
      console.error(`Error retrieving DC result: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getReleaseFlowRun(req: Request, res: Response) {
    try {
      const datasetId = req.query.datasetId;
      const releaseId = req.params.releaseId;
      const token = req.headers.authorization!;
      const dcResult = await this.datacharacterizationService.getReleaseFlowRun(
        datasetId,
        releaseId,
        token
      );

      if (dcResult) {
        res.send(dcResult);
      } else {
        res
          .status(404)
          .send(
            `No Data Characterization result found for datasetId: ${datasetId}`
          );
      }
    } catch (error) {
      console.error(`Error retrieving DC result: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async createDataCharacterizationFlowRun(req: Request, res: Response) {
    try {
      const dataCharacterizationFlowRunDto = req.body;
      const token = req.headers.authorization!;
      const dcResult =
        await this.datacharacterizationService.createDataCharacterizationFlowRun(
          dataCharacterizationFlowRunDto,
          token
        );

      res.send(dcResult);
    } catch (error) {
      console.error(`Error retrieving DC result: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getSchemaMappingList(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const dcResult =
        await this.datacharacterizationService.getSchemaMappingList(token);

      res.send(dcResult);
    } catch (error) {
      console.error(`Error retrieving DC result: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }
}
