import express, { Request, Response } from "express";
import { DashboardTemplateService } from "./services/dashboard-template-service.ts";
import { StrategusViewerTemplateService } from "./services/strategus-viewer-template-service.ts";

export default class GitRouter {
  public router = express.Router();
  private dashboardTemplateService = new DashboardTemplateService();
  private strategusViewerTemplateService =
    new StrategusViewerTemplateService();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.get("/", async (req: Request, res: Response) => {
      try {
        return res.status(200).send("Git function is up and running!");
      } catch (error: any) {
        return res.status(500).json({
          message: `An error occurred in the Git function ${error.message}`,
        });
      }
    });

    this.router.get(
      "/dashboard-templates",
      async (req: Request, res: Response) => {
        try {
          const templates =
            await this.dashboardTemplateService.getTemplates();
          return res.status(200).json(templates);
        } catch (error: any) {
          return res.status(500).json({
            message: `Failed to get dashboard templates: ${error.message}`,
          });
        }
      }
    );

    this.router.get(
      "/strategus-viewer-templates",
      async (req: Request, res: Response) => {
        try {
          const templates =
            await this.strategusViewerTemplateService.getTemplates();
          return res.status(200).json(templates);
        } catch (error: any) {
          return res.status(500).json({
            message: `Failed to get strategus viewer templates: ${error.message}`,
          });
        }
      }
    );
  }
}
