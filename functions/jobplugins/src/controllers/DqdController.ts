import { Request, Response, Router } from "npm:express";
import { param, validationResult } from "npm:express-validator";
import {
  validateDataQualityDatasetId,
  validateDataQualityFlowRunDto,
} from "../middlewares/DqdRequestValidatorMiddlewares.ts";
import { DqdService } from "../services/DqdService.ts";

export class DqdController {
  private dqdService: DqdService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.dqdService = new DqdService();
  }

  private registerRoutes() {
    // GET /data-quality/flow-run/:flowRunId/results
    this.router.get(
      "/flow-run/:flowRunId/results",
      param("flowRunId").isUUID(),
      validateDataQualityDatasetId(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.getDataQualityResults(req, res);
      }
    );

    // GET /data-quality/flow-run/:flowRunId/overview
    this.router.get(
      "/flow-run/:flowRunId/overview",
      param("flowRunId").isUUID(),
      validateDataQualityDatasetId(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.getDataQualityOverview(req, res);
      }
    );

    // GET /data-quality/flow-run/latest?datasetId=${datasetId}
    this.router.get(
      "/flow-run/latest",
      validateDataQualityDatasetId(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getLatestFlowRunWithoutCohort(req, res);
      }
    );

    // GET /data-quality/cohort/:cohortDefinitionId/flow-run/latest?datasetId=${datasetId}
    this.router.get(
      "/cohort/:cohortDefinitionId/flow-run/latest",
      [param("cohortDefinitionId").isString(), validateDataQualityDatasetId()],
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getLatestFlowRunWithCohort(req, res);
      }
    );

    // GET /data-quality/release/:releaseId/flow-run?datasetId=${datasetId}
    this.router.get(
      "/release/:releaseId/flow-run",
      [param("releaseId").isInt(), validateDataQualityDatasetId()],
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getFlowRunByReleaseId(req, res);
      }
    );

    // POST /data-quality/flow-run
    this.router.post(
      "/flow-run",
      validateDataQualityFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }

        await this.createDataQualityFlowRun(req, res);
      }
    );
    // GET /data-quality/dataset/:datasetId/category/history?datasetId=${datasetId}
    this.router.get(
      "/category/history",
      validateDataQualityDatasetId(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getDataQualityHistoryByCategory(req, res);
      }
    );

    // GET /data-quality/domain/history?datasetId=${datasetId}
    this.router.get(
      "/domain/history",
      validateDataQualityDatasetId(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getDataQualityHistoryByDomain(req, res);
      }
    );

    // GET /data-quality/history?datasetId=${datasetId}
    this.router.get(
      "/history",
      validateDataQualityDatasetId(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getDataQualityHistory(req, res);
      }
    );

    // GET /data-quality/domain/continuity?datasetId=${datasetId}
    this.router.get(
      "/domain/continuity",
      validateDataQualityDatasetId(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getDatasetDomainContinuity(req, res);
      }
    );
  }

  private async getDataQualityResults(req: Request, res: Response) {
    try {
      const flowRunId = req.params.flowRunId;
      const token = req.headers.authorization!;
      const dqdResult = await this.dqdService.getDataQualityResult(
        flowRunId,
        token
      );

      if (dqdResult) {
        res.send(dqdResult);
      } else {
        res.status(404).send(`No DQD result found for flowRunId: ${flowRunId}`);
      }
    } catch (error) {
      console.error(`Error retrieving DQD result: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getDataQualityOverview(req: Request, res: Response) {
    try {
      const flowRunId = req.params.flowRunId;
      const token = req.headers.authorization!;
      const overview = await this.dqdService.getDataQualityOverview(
        flowRunId,
        token
      );

      if (overview) {
        res.send(overview);
      } else {
        res.status(404).send(`No overview found for flowRunId: ${flowRunId}`);
      }
    } catch (error) {
      console.error(`Error retrieving DQD overview: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getLatestFlowRunWithoutCohort(req: Request, res: Response) {
    try {
      const datasetId = req.query.datasetId;
      const token = req.headers.authorization!;
      const flowRun = await this.dqdService.getLatestFlowRunWithoutCohort(
        datasetId,
        token
      );

      if (flowRun) {
        res.send(flowRun);
      } else {
        res.status(404).send(`No flow run found for datasetId: ${datasetId}`);
      }
    } catch (error) {
      console.error(`Error retrieving latest flow run: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getLatestFlowRunWithCohort(req: Request, res: Response) {
    try {
      const datasetId = req.query.datasetId;
      const cohortDefinitionId = req.params.cohortDefinitionId;
      const token = req.headers.authorization!;
      const flowRun = await this.dqdService.getLatestFlowRunWithCohort(
        datasetId,
        cohortDefinitionId,
        token
      );

      if (flowRun) {
        res.send(flowRun);
      } else {
        res
          .status(404)
          .send(
            `No flow run found for datasetId: ${datasetId}, cohortDefinitionId: ${cohortDefinitionId}`
          );
      }
    } catch (error) {
      console.error(`Error retrieving latest flow run with cohort: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getFlowRunByReleaseId(req: Request, res: Response) {
    try {
      const datasetId = req.query.datasetId;
      const releaseId = req.params.releaseId;
      const token = req.headers.authorization!;
      const flowRun = await this.dqdService.getFlowRunByReleaseId(
        datasetId,
        releaseId,
        token
      );

      if (flowRun) {
        res.send(flowRun);
      } else {
        res
          .status(404)
          .send(
            `No flow run found for datasetId: ${datasetId}, releaseId: ${releaseId}`
          );
      }
    } catch (error) {
      console.error(`Error retrieving flow run by release: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async createDataQualityFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const dataQualityFlowRunDto = req.body;
      const result = await this.dqdService.createDataQualityFlowRun(
        dataQualityFlowRunDto,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error creating DQD flow run: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getDataQualityHistoryByCategory(req: Request, res: Response) {
    try {
      const datasetId = req.query.datasetId;
      const token = req.headers.authorization!;
      const history = await this.dqdService.getDataQualityHistoryByCategory(
        datasetId,
        token
      );
      res.send(history);
    } catch (error) {
      console.error(`Error retrieving dataset history by category: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getDataQualityHistory(req: Request, res: Response) {
    try {
      const datasetId = req.query.datasetId;
      const token = req.headers.authorization!;
      const history = await this.dqdService.getDataQualityHistory(
        datasetId,
        token
      );
      res.send(history);
    } catch (error) {
      console.error(`Error retrieving dataset history: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getDataQualityHistoryByDomain(req: Request, res: Response) {
    try {
      const datasetId = req.query.datasetId;
      const token = req.headers.authorization!;
      const history = await this.dqdService.getDataQualityHistoryByDomain(
        datasetId,
        token
      );
      res.send(history);
    } catch (error) {
      console.error(`Error retrieving dataset history: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }

  private async getDatasetDomainContinuity(req: Request, res: Response) {
    try {
      const datasetId = req.query.datasetId;
      const token = req.headers.authorization!;
      const history = await this.dqdService.getDatasetDomainContinuity(
        datasetId,
        token
      );
      res.send(history);
    } catch (error) {
      console.error(`Error retrieving dataset history: ${error}`);
      res.status(500).send(`Error occurs: ${error}`);
    }
  }
}
