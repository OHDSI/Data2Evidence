import { Router } from "express";
import { Service } from "typedi";
import { CDMSchemaRouter } from "./cdm-schema/cdm-schema.router.ts";
import { LookupRouter } from "./lookup/lookup.router.ts";

@Service()
export class Routes {
  private readonly router = Router();

  constructor(
    private readonly lookupRouter: LookupRouter,
    private readonly cdmSchemaRouter: CDMSchemaRouter
  ) {
    this.router.use("/", this.lookupRouter.getRouter());
    this.router.use("/", this.cdmSchemaRouter.getRouter());
  }

  getRouter() {
    return this.router;
  }
}

export default Routes;
