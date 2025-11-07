import express, { Application } from "express";
import { Container } from "typedi";
import { useContainer } from "class-validator";
import "reflect-metadata";
import dataSource from "./common/data-source/data-source";
import { Routes } from "./routes";

const PORT = 10500;

export class App {
  private app: Application;
  private readonly logger = console;

  constructor() {
    this.app = express();
  }

  private registerMiddlewares() {
    // this.app.use('/check-liveness', healthCheck)
    // this.app.use('/check-readiness', healthCheck)
  }

  private registerRoutes() {
    const routes = Container.get(Routes);
    this.app.use("/files-manager/api", routes.getRouter());
  }

  private registerValidatorContainer() {
    useContainer(Container, {
      fallback: true,
      fallbackOnErrors: true,
    });
  }

  private async initialiseDataSource() {
    try {
      await dataSource.initialize();
      this.logger.info("Datasource is initialised");
    } catch (error) {
      this.logger.error(`Error while initialising datasource: ${error}`);
      process.exit(0);
    }
  }

  async start() {
    await this.initialiseDataSource();
    this.registerMiddlewares();
    this.registerRoutes();
    this.registerValidatorContainer();

    this.app.listen(PORT);
    this.logger.info(`📁 Files Manager started successfully!.`);
  }
}
