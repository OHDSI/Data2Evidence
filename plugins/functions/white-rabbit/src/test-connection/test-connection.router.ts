import { NextFunction, Request, Response, Router } from "express";
import { Service } from "typedi";
import { TestConnectionRequest } from "./models/scanDbSettings.ts";
import { TestConnectionService } from "./test-connection.service.ts";

@Service()
export class TestConnectionRouter {
  private readonly router = Router();
  private readonly logger = console;

  constructor(private readonly testConnectionService: TestConnectionService) {
    this.registerRoutes();
  }

  getRouter() {
    return this.router;
  }

  private registerRoutes() {
    this.router.post(
      "/test-connection",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const request: TestConnectionRequest = req.body;
          this.logger.info("REST request to test connection");
          const result = await this.testConnectionService.testConnection(
            request
          );
          res.status(200).json(result);
        } catch (error) {
          next(error);
        }
      }
    );
  }
}
