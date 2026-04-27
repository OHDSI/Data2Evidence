import express, { Request, Response } from "express";
import { DashboardTemplateService } from "./services/dashboard-template-service.ts";
import { StrategusViewerTemplateService } from "./services/strategus-viewer-template-service.ts";
import { StudiesService } from "./services/studies-service.ts";

export default class GitRouter {
  public router = express.Router();
  private dashboardTemplateService = new DashboardTemplateService();
  private strategusViewerTemplateService = new StrategusViewerTemplateService();
  private studiesService = new StudiesService();

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
          const templates = await this.dashboardTemplateService.getTemplates();
          return res.status(200).json(templates);
        } catch (error: any) {
          return res.status(500).json({
            message: `Failed to get dashboard templates: ${error.message}`,
          });
        }
      },
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
      },
    );

    this.router.get("/studies", async (req: Request, res: Response) => {
      try {
        const studies = await this.studiesService.getStudies();
        return res.status(200).json(studies);
      } catch (error: any) {
        return res.status(500).json({
          message: `Failed to get studies: ${error.message}`,
        });
      }
    });

    this.router.get(
      "/studies/:studyId/strategus-json",
      async (req: Request, res: Response) => {
        try {
          const { studyId } = req.params;
          const strategusJson =
            await this.studiesService.getStudyStrategusJson(studyId);
          return res.status(200).json(strategusJson);
        } catch (error: any) {
          return res.status(500).json({
            message: `Failed to get strategus JSON: ${error.message}`,
          });
        }
      },
    );
  }
}
