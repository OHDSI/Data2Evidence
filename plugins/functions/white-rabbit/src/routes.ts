import { Router } from "express";
import { Service } from "typedi";
import { TestConnectionRouter } from "./test-connection/test-connection.router.ts";
import { ScanDataRouter } from "./scan-data/scan-data.router.ts";


@Service()
export class Routes {
  private readonly router = Router();

  constructor(
    private readonly testConnectionRouter: TestConnectionRouter,
    private readonly scanDataRouter: ScanDataRouter
  ) {
    this.router.use("/", this.testConnectionRouter.getRouter());
    this.router.use("/scan-report", this.scanDataRouter.getRouter());
  }

  getRouter() {
    return this.router;
  }
}

export default Routes;
