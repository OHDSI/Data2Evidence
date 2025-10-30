import express, { Application } from "express";
import http from "http";
import dataSource from "./src/db/datasource.ts";
import { StrategusResultsRouter } from "./src/strategus-results/routes.ts";
import StrategusAnalysisRouter from "./src/analysis/routes.ts";

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
      "/strategus-results",
      new StrategusResultsRouter(this.server).router
    );
    this.app.use("/strategus/analysis", new StrategusAnalysisRouter().router);
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
