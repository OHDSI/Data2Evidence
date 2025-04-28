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
