import { Router, NextFunction, Request, Response } from "express";
import { Service } from "typedi";
import { LookupService } from "./lookup.service.ts";
import { checkLookupType } from "../middleware/route-check.ts";

@Service()
export class LookupRouter {
  private readonly router = Router();
  private readonly logger = console;

  constructor(private readonly lookupService: LookupService) {
    this.registerRoutes();
  }

  getRouter() {
    return this.router;
  }

  private registerRoutes() {
    this.router.get(
      "/lookups",
      checkLookupType,
      async (req: Request, res: Response, next: NextFunction) => {
        this.logger.info("REST request to get lookup list");
        const { lookupType } = req.query;
        try {
          const lookups = await this.lookupService.getLookups(
            req.username,
            lookupType
          );
          res.status(200).send(lookups);
        } catch (err) {
          this.logger.error(
            `Error when getting lookups: ${JSON.stringify(err)}`
          );
          next(err);
        }
      }
    );

    this.router.get(
      "/lookup/sql",
      checkLookupType,
      async (req: Request, res: Response, next: NextFunction) => {
        this.logger.info("REST request to get lookup sql");
        const { id, name, lookupType } = req.query;
        try {
          const lookupSQL = await this.lookupService.getLookupSQL(
            id,
            name,
            lookupType
          );
          res.status(200).send(lookupSQL);
        } catch (err) {
          this.logger.error(
            `Error when getting lookup SQL: ${JSON.stringify(err)}`
          );
          next(err);
        }
      }
    );
  }
}
