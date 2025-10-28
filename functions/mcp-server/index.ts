import express, { Application, Request, Response } from "express";
import { mcpServerRouter } from "./src/mcp-server/routes";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  async start() {
    this.app.use("/mcp", new mcpServerRouter().router);
    this.app.listen(10000);
  }
}

let app = new App();
app.start();
