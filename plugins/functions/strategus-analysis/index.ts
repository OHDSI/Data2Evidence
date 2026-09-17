import express, { Application } from "express";
import http from "http";
import dataSource from "./src/db/datasource.ts";
import StrategusAnalysisRouter from "./src/analysis/routes.ts";
import StrategusViewerTemplateRouter from "./src/templates/routes.ts";
import StrategusResultsRouter from "./src/results/routes.ts";

export class App {
  private app: Application;
  private server: http.Server;
  private readonly logger = console;

  constructor() {
    this.app = express();
    this.app.use(express.json({ limit: "50mb" }));
    this.server = http.createServer(this.app);
  }

  async start() {
    this.app.use(
      "/strategus/template",
      new StrategusViewerTemplateRouter().router
    );
    this.app.use("/strategus/analysis", new StrategusAnalysisRouter().router);

    const resultsRouter = new StrategusResultsRouter();
    try {
      // Idempotent: a 409 from storage means the bucket already exists.
      await resultsRouter.strategusResultsService.ensureBucket();
    } catch (error) {
      // The bucket is not required for the service to boot; uploads will
      // surface the failure with a 502 instead of taking the plugin down.
      this.logger.error("Failed to ensure strategus results bucket:", error);
    }
    this.app.use("/strategus/results", resultsRouter.router);

    this.server.listen(10000);
    this.logger.info("Strategus Results service is running on port 10000");
  }

  async initialiseDataSource() {
    try {
      console.log("Initialising strategus-analysis datasource...");
      await dataSource.initialize();
    } catch (err) {
      console.log("strategus datasource initialisation failed with: ", err);
      Deno.exit(0);
    }
  }
}

let app = new App();
await app.initialiseDataSource();
app.start();
