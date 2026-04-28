import express, { Application } from "express";
import { ConceptMappingRouter } from "./src/concept-mapping/routes";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {
    this.app.use(express.json());
    this.app.use("/concept-mapping", new ConceptMappingRouter().router);
    this.app.listen(8000);
    this.logger.info(`Concept Mapping service started successfully!`);
  }
}

let app = new App();
app.start();
