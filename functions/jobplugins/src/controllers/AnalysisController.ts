import { Request, Response, Router } from "express";
import { JwtPayload, decode } from "jsonwebtoken";
import { AnalysisService } from "../services/AnalysisService.ts";

export class AnalysisController {
  public router = Router();
  public analysisService = new AnalysisService();

  constructor() {
    this.registerRoutes();
  }
  private async getCanvasList(req: Request, res: Response) {
    try {
      const result = await this.analysisService.getAnalysisflows();
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in getCanvasList: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async getCanvasById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      console.log(`getCanvasById id: ${id}`);
      const result = await this.analysisService.getAnalysisflow(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in getCanvasById: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async getGraph(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.analysisService.getLastAnalysisflowRevision(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in getGraph: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async deleteCanvas(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.analysisService.deleteAnalysisflow(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in deleteCanvas: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async getResultsById(req: Request, res: Response) {
    try {
      const { id: dataflowId } = req.params;
      const token = decode(
        req.headers["authorization"].replace(/bearer /i, "")
      ) as JwtPayload;
      const result = await this.analysisService.getResultsByCanvasId(
        dataflowId,
        token
      );
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in getResultsById: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async createCanvas(req: Request, res: Response) {
    try {
      const dataflowDto = req.body;
      const token = decode(
        req.headers["authorization"].replace(/bearer /i, "")
      ) as JwtPayload;
      console.log(`data transoformation controller, token: ${token}`);
      const canvas = await this.analysisService.createAnalysisflow(
        dataflowDto,
        token
      );
      return res.status(201).send(canvas);
    } catch (error) {
      console.error("Error in createCanvas: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async duplicateCanvas(req: Request, res: Response) {
    try {
      const { id: flowId, revisionId } = req.params;
      const dataflowDto = req.body;
      const token = decode(
        req.headers["authorization"].replace(/bearer /i, "")
      ) as JwtPayload;
      const result = await this.analysisService.duplicateAnalysisflow(
        flowId,
        revisionId,
        dataflowDto,
        token
      );
      return res.status(201).send(result);
    } catch (error) {
      console.error("Error in duplicateCanvas: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async deleteGraphById(req: Request, res: Response) {
    try {
      const { id, revisionId } = req.params;
      const result = await this.analysisService.deleteAnalysisflowRevision(
        id,
        revisionId
      );
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in deleteGraphById: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private registerRoutes() {
    this.router.get("/list", this.getCanvasList.bind(this));
    this.router.get("/:id", this.getCanvasById.bind(this));
    this.router.get("/:id/latest", this.getGraph.bind(this));
    this.router.delete("/:id", this.deleteCanvas.bind(this));
    this.router.post(
      "/duplicate/:id/:revisionId",
      this.duplicateCanvas.bind(this)
    );
    this.router.delete("/:id/:revisionId", this.deleteGraphById.bind(this));
    this.router.post("/", this.createCanvas.bind(this));
    this.router.get("/:id/flow-run-results", this.getResultsById.bind(this));
  }
}
