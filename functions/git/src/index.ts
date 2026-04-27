import express, { Application } from "express";
import http from "http";
import GitRouter from "./routes.ts";

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
    this.app.use("/git", new GitRouter().router);
    this.server.listen(10000, () => {
      this.logger.info("Git service is running on port 10000");
    });
  }
}

let app = new App();
app.start();
