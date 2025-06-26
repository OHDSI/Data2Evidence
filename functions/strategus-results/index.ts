import express, { Application } from "express";
import { StrategusResultsRouter } from "./src/strategus-results/routes.ts";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
    this.app.use(express.json());
  }

  async start() {
    this.app.use("/strategus-results", new StrategusResultsRouter().router);
    this.app.listen(10000);
    this.logger.info("Strategus Results service is running on port 10000");
  }
}

let app = new App();
app.start();
