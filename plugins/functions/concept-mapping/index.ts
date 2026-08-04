import express, { Application } from "express";
import { ConceptMappingRouter } from "./src/concept-mapping/routes";
import { PortalAPI } from "./src/api/PortalAPI";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {
    this.app.use(express.json());
    this.app.use(
      "/concept-mapping",
      new ConceptMappingRouter(
        (token) => (datasetId) => new PortalAPI(token).getDataset(datasetId),
      ).router,
    );
    this.app.listen(8000);
    this.logger.info(`Concept Mapping service started successfully!`);
  }
}

let app = new App();
app.start();
