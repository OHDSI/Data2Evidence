import { Router, NextFunction, Request, Response } from "express";
import { Service } from "typedi";
import { CDMSchemaService } from "./cdm-schema.service.ts";
import { checkCDMVersion } from "../middleware/route-check.ts";
@Service()
export class CDMSchemaRouter {
  private readonly router = Router();
  private readonly logger = console;

  constructor(private readonly cdmSchemaService: CDMSchemaService) {
    this.registerRoutes();
  }

  getRouter() {
    return this.router;
  }

  private registerRoutes() {
    this.router.get(
      "/get_cdm_versions",
      async (req: Request, res: Response, next: NextFunction) => {
        const cdmVersions = this.cdmSchemaService.getExistVersions();
        res.status(200).send(cdmVersions);
      }
    );

    this.router.get(
      "/get_cdm_schema",
      checkCDMVersion,
      async (req: Request, res: Response, next: NextFunction) => {
        const { cdm_version } = req.query;

        try {
          const cdmSchema = await this.cdmSchemaService.getSchema(cdm_version);
          res.status(200).send(cdmSchema);
        } catch (err) {
          this.logger.error(
            `Error when getting cdm schema: ${JSON.stringify(err)}`
          );
          next(err);
        }
      }
    );
  }
}
