import express, { Application } from "express";
import { Container } from "typedi";
import { useContainer } from "class-validator";
import "reflect-metadata";
import { Routes } from "./routes.ts";
import extractUsernameFromJwt from "./middleware/extractUsernameFromJwt.ts";
export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  private registerRoutes() {
    const routes = Container.get(Routes);
    this.app.use(extractUsernameFromJwt);
    this.app.use("/backend/api", routes.getRouter());
  }

  private registerValidatorContainer() {
    useContainer(Container, {
      fallback: true,
      fallbackOnErrors: true,
    });
  }

  async start() {
    this.registerRoutes();
    this.registerValidatorContainer();

    this.app.listen(5004);
    this.logger.info("Perseus started successfully");
  }
}
