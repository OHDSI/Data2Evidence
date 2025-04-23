import express, { Application } from "express";
import { DataMappingRouter } from "./src/data-mapping/routes";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {
    this.app.use(express.json());
    this.app.use("/data-mapping", new DataMappingRouter().router);
    this.app.listen(10000);
  }
}

let app = new App();
app.start();