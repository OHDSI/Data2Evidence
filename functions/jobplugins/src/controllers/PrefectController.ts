import { Request, Response, Router } from "express";
import { JwtPayload, decode } from "jsonwebtoken";
import { PrefectService } from "../services/PrefectService.ts";

export class PrefectController {
  private prefectService: PrefectService;
  public router = Router();

  constructor() {
    this.registerRoutes();
    this.prefectService = new PrefectService();
  }

  private async createFlowrun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const token = this.getToken(req);
      const flowrunId = await this.prefectService.createFlowrun(id, token);
      return res.status(200).send(flowrunId);
    } catch (error) {
      console.log(`createFlowrun: ${error}`);
      return res.status(500).send({ message: "Internal error occurred" });
    }
  }

  private async createAnalysisRun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const token = this.getToken(req);
      const flowrunId = await this.prefectService.createAnalysisFlowRun(
        id,
        token
      );
      return res.status(200).send(flowrunId);
    } catch (error) {
      console.log(`createAnalysisRun: ${error}`);
      return res.status(500).send({ message: "Internal error occurred" });
    }
  }

  private async cancelFlowrun(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const token = this.getToken(req);
      await this.prefectService.cancelFlowRun(id, token);
      return res.status(200).send("Flow run cancelled");
    } catch (error) {
      console.log(`cancelFlowrun: ${error}`);
      return res.status(500).send({ message: "Internal error occurred" });
    }
  }

  private async createTestRun(req: Request, res: Response) {}

  private async getFlowrunLogs(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const token = this.getToken(req);
      const logs = await this.prefectService.getFlowRunLogs(id, token);
      return res.status(200).send(logs);
    } catch (error) {
      console.log(`getFlowrunLogs: ${error}`);
      return res.status(500).send({ message: "Internal error occurred" });
    }
  }

  private async getFlowrunState(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const token = this.getToken(req);
      const state = await this.prefectService.getFlowRunState(id, token);
      return res.status(200).send(state);
    } catch (error) {
      console.log(`getFlowrunState: ${error}`);
      return res.status(500).send({ message: "Internal error occurred" });
    }
  }

  private async createAnalaysisRunByJupyterKernel(req, res){
    try {
      const { json_graph, options } = req.body;
      const token = req.headers["Authorization"] || req.headers["authorization"];

      if (!json_graph || !options) {
        return res.status(400).send({ message: "Missing required fields: json_graph or options" });
      }
      if(options['study_id'] === undefined) {
        return res.status(400).send({ message: "Missing required field: study_id in options" });
      }
      // uncomment this line when notebookName is available in jupyter kernel
      // if(options['notebookName'] === undefined) {
      //   return res.status(400).send({ message: "Missing required field: notebookName in options" });
      // }

      const flowrunId = await this.prefectService.createAnalaysisRunByJupyterKernel(
        token,
        { json_graph, options }
      )
      return res.status(200).send({ flowrunId, status: "Successfully created a flow run" })
    } catch (error) {
      console.log(error);
      return res.status(500).send({ message: "Failed to start network analaysis flow run" });
    }
  }

  private async removeAnalysisResultsSchema(req: Request, res: Response) {
    try {
      const { id: studyId, datasetid: datasetId } = req.params;
      const token = req.headers["Authorization"] || req.headers["authorization"];
      const flowrunId = await this.prefectService.removeAnalysisResultsSchema(token, { studyId, datasetId } );
      return res.status(200).send({ flowrunId, status: "Successfully created a flow run" })
    } catch (error) {
      console.log(`removeResultsSchema: ${error}`);
      return res.status(500).send({ message: "Internal error occurred" });
    }
  }

  private registerRoutes() {
    this.router.post("/flow-run/:id", this.createFlowrun.bind(this));
    this.router.post("/analysis-run/:id", this.createAnalysisRun.bind(this));
    this.router.post(
      "/flow-run/:id/cancellation",
      this.cancelFlowrun.bind(this)
    );
    this.router.post("/test-run", this.createTestRun.bind(this));
    this.router.post("/jupyter-kernel/flow-run/strategus", this.createAnalaysisRunByJupyterKernel.bind(this));
    this.router.delete("/flow-run/strategus/remove-results-schema/:id/:datasetid", this.removeAnalysisResultsSchema.bind(this));

    this.router.get("/flow-run/:id/logs", this.getFlowrunLogs.bind(this));
    this.router.get("/flow-run/:id/state", this.getFlowrunState.bind(this));
  }

  private getToken(req: Request) {
    return decode(
      req.headers["authorization"].replace(/bearer /i, "")
    ) as JwtPayload;
  }
}
