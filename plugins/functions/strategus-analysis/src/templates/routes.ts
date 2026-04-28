import express, { Request, Response } from "express";
import StrategusViewerTemplateService from "./services.ts";

export default class StrategusViewerTemplateRouter {
  public router = express.Router();
  private strategusViewerTemplateService = new StrategusViewerTemplateService();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.get("/", async (req: Request, res: Response) => {
      try {
        const result =
          await this.strategusViewerTemplateService.getTemplatesFromRepository();
        return res.status(200).send(result);
      } catch (error) {
        return res.status(500).json({
          message: `An error occurred retrieving result viewer templates ${error.message}`,
        });
      }
    });
  }
}
