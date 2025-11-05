import express, { Application } from "express";
import { mcpServerRouter } from "./src/routes/routes";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {
    const port = 10000;
    this.app.use("/mcp", new mcpServerRouter().router);
    this.app.listen(port, () => {
      this.logger.log(`Server is listening on port ${port}`);
    });
  }
}

let app = new App();
app.start();
