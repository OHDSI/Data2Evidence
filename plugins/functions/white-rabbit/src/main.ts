import { useContainer } from "class-validator";
import express, { Application } from "express";
import "reflect-metadata";
import { Container } from "typedi";
import extractUsernameFromJwt from "./middleware/extractUsernameFromJwt.ts";
import { Routes } from "./routes.ts";

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  private registerRoutes() {
    this.app.use(express.json());
    const routes = Container.get(Routes);
    this.app.use(extractUsernameFromJwt);
    this.app.use("/white-rabbit/api", routes.getRouter());
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

    this.app.listen(5005);
    this.logger.info("White-rabbit started successfully");
  }
}
