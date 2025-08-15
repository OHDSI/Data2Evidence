import express, { Application } from "express";
import dataSource from "./src/db/datasource.ts";
import { StrategusResultsRouter } from "./src/strategus-results/routes.ts";
import StrategusAnalysisRouter from "./src/analysis/routes.ts";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
    this.app.use(express.json());
  }

  async start() {
    this.app.use("/strategus-results", new StrategusResultsRouter().router);
    this.app.use("/strategus/analysis", new StrategusAnalysisRouter().router);
    this.app.listen(10000);
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
