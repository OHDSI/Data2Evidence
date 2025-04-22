import { Request, Response, Router } from "express";
import { param, validationResult } from "express-validator";
import { validatePerseusFlowRunDto } from "../middlewares/PerseusValidatorMiddlewares.ts";
import { PerseusService } from "../services/PerseusService.ts";
import { IPrefectArtifact } from "../types.ts";

export class PerseusController {
  private perseusService: PerseusService;
  public router = Router();

  constructor() {
    this.perseusService = new PerseusService();
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post(
      "/flow-run",
      validatePerseusFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createPerseusFlowRun(req, res);
      }
    );

    // GET /white-rabbit/results/:flowRunId
    this.router.get(
      "/results/:flowRunId",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getPerseusFlowRunResults(req, res);
      }
    );

    // GET /perseus/artifacts/:flowRunId
    this.router.get(
      "/artifacts/:flowRunId",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        const { flowRunId } = req.params;
        const result = await this.getPerseusFlowRunArtifacts(req, res);

        if (result) {
          return res.send(
            result[0].type == "markdown" ? JSON.parse(result[0].data) : {}
          );
        }

        return res
          .status(404)
          .send(`No artifact found for flow id: ${flowRunId}`);
      }
    );
  }

  private async createPerseusFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const params = req.body;
      const username = req.username;

      const result = await this.perseusService.createFlowRun(
        params,
        username,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error creating perseus flow run: ${error}`);
      res.status(500).send(`Error: ${error}`);
    }
  }

  private async getPerseusFlowRunResults(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const flowRunId = req.params.flowRunId;
      const result = await this.perseusService.getFlowRun(flowRunId, token);
      const stateInfo = {
        flow_id: result.flow_id,
        state_name: result.state_name,
        state: result.state,
      };
      res.send(stateInfo);
    } catch (error) {
      console.error(`Error getting white-rabbit results: ${error}`);
      res.status(500).send(`Error: ${error}`);
    }
  }

  private async getPerseusFlowRunArtifacts(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const flowRunId = req.params.flowRunId;
      console.log("in get");
      const result: IPrefectArtifact[] =
        await this.perseusService.getFlowRunArtifacts(flowRunId, token);

      return result;
    } catch (error) {
      console.error(`Error getting perseus flow run artifacts: ${error}`);
      res.status(500).send(`Error: ${error}`);
    }
  }
}
