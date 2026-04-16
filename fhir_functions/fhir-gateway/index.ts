import express, { Application } from "express";
import { FhirRouter } from "./src/routes.ts";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {
    this.app.use(express.json({ limit: "50mb" }));
    this.app.use((err: any, req: any, res: any, next: any) => {
      if (
        err.type === "entity.too.large" ||
        err.message === "request entity too large"
      ) {
        return res
          .status(413)
          .json({ error: true, message: "Request body too large" });
      }
      next(err);
    });
    this.app.use("/trex-fhir-gateway/", new FhirRouter().router);
    this.app.listen(8000);
  }
}
let app = new App();
app.start();
