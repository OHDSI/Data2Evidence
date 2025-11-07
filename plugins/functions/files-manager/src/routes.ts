import { Router } from "express";
import { Service } from "typedi";
import { FilesManagerRouter } from "./files-manager/files-manager.router";

@Service()
export class Routes {
  private readonly router = Router();

  constructor(private readonly filesManagerRouter: FilesManagerRouter) {
    this.router.use("/", this.filesManagerRouter.getRouter());
  }

  getRouter() {
    return this.router;
  }
}

export default Routes;
