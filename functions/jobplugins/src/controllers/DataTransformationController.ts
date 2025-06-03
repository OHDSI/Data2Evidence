import { Request, Response, Router } from "express";
import multer from "multer";
import { TransformationService as DataTransformationService } from "../services/DataTransformationService.ts";
import { PortalServerAPI } from "../api/PortalServerAPI.ts";

const upload = multer({ storage: multer.memoryStorage() });
export class DataTransformationController {
  public router = Router();
  private dataTransformationService = new DataTransformationService();

  constructor() {
    this.registerRoutes();
  }
  private async getCanvasList(req: Request, res: Response) {
    try {
      const result = await this.dataTransformationService.getCanvasList();
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in getCanvasList: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async getCanvasById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await this.dataTransformationService.getCanvas(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in getCanvasById: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async getGraph(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result =
        await this.dataTransformationService.getLatestGraphByCanvasId(id);
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in getGraph: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async deleteCanvas(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const token = req.headers["authorization"];
      const result = await this.dataTransformationService.deleteCanvas(id, token);
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in deleteCanvas: ", error);
      return res.status(500).send({ message: "Internal Server Error" });
    }
  }

  private async getResultsById(req: Request, res: Response) {
    try {
      const { id: dataflowId } = req.params;
      const token = req.headers["authorization"];
      const result = await this.dataTransformationService.getResultsByCanvasId(
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
      const token = req.headers["authorization"];
      const canvas = await this.dataTransformationService.createCanvas(
        dataflowDto,
        token
      );
      return res.status(201).send(canvas);
    } catch (error) {
      console.error("Error in createCanvas: ", error);
      return res.status(500).send({ message: error.message });
    }
  }

  private async duplicateCanvas(req: Request, res: Response) {
    try {
      const { id, revisionId } = req.params;
      const dataflowDto = req.body;
      const token = req.headers["authorization"];
      const result = await this.dataTransformationService.duplicateCanvas(
        id,
        revisionId,
        dataflowDto,
        token
      );
      return res.status(201).send(result);
    } catch (error) {
      console.error("Error in duplicateCanvas: ", error);
      return res.status(500).send({ message: error.message });
    }
  }

  private async deleteGraphById(req: Request, res: Response) {
    try {
      const { id, revisionId } = req.params;
      const token = req.headers["authorization"];
      const result = await this.dataTransformationService.deleteGraph(
        id,
        revisionId,
        token
      );
      return res.status(200).send(result);
    } catch (error) {
      console.error("Error in deleteGraphById: ", error);
      return res.status(500).send({ message: error.message });
    }
  }

  private async uploadCsvFile(req: Request, res: Response) {
    try {
      const { nodeId } = req.query;
      const authHeader = req.headers["authorization"];

      if (!authHeader) {
        return res.status(401).json({ message: "Authorization header is required" });
      }

      if (!nodeId) {
        return res.status(400).json({ message: "nodeId query parameter is required" });
      }

      if (!req.file) {
        return res.status(400).json({ message: "No file provided" });
      }

      // Validate CSV file type
      if (!req.file.originalname.toLowerCase().endsWith('.csv')) {
        return res.status(400).json({ message: "Only CSV files are allowed" });
      }

      const file = new File([req.file.buffer], req.file.originalname, {
        type: req.file.mimetype || 'text/csv'
      });

      const portalAPI = new PortalServerAPI(authHeader);
      const result = await portalAPI.uploadCsvFile(nodeId as string, file);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in uploadCsvFile: ", error);
      return res.status(500).json({ message: error.message });
    }
  }

  private async deleteCsvFile(req: Request, res: Response) {
    try {
      const { nodeId, fileName } = req.query;
      const authHeader = req.headers["authorization"];

      if (!authHeader) {
        return res.status(401).json({ message: "Authorization header is required" });
      }

      if (!nodeId || !fileName) {
        return res.status(400).json({ message: "nodeId and fileName query parameters are required" });
      }

      const portalAPI = new PortalServerAPI(authHeader);
      const result = await portalAPI.deleteCsvFile(nodeId as string, fileName as string);
      
      return res.status(200).json(result);
    } catch (error) {
      console.error("Error in deleteCsvFile: ", error);
      return res.status(500).json({ message: error.message });
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
    this.router.post("/", this.createCanvas.bind(this));
    this.router.get("/:id/flow-run-results", this.getResultsById.bind(this));
    this.router.post("/file/csv", upload.single("file"), this.uploadCsvFile.bind(this));
    this.router.delete("/file/csv", this.deleteCsvFile.bind(this));
    this.router.delete("/:id/:revisionId", this.deleteGraphById.bind(this));
  }
}
