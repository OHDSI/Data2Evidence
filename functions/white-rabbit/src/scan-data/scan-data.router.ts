import { NextFunction, Request, Response, Router } from "express";
import { Service } from "typedi";
import { ScanDataService } from "./scan-data.service.ts";

@Service()
export class ScanDataRouter {
  private readonly router = Router();
  private readonly logger = console;

  constructor(private readonly scanDataService: ScanDataService) {
    this.registerRoutes();
  }

  getRouter() {
    return this.router;
  }

  private registerRoutes() {
    this.router.get(
      "/conversion/:conversionId",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const conversionId = parseInt(req.params.conversionId);
          const username = req.username;
          this.logger.info(`userName: ${username}`);
          this.logger.info(
            "REST request to get Scan Data Conversion info and logs by Conversion id",
            conversionId
          );

          const result = await this.scanDataService.conversionInfoWithLogs(
            conversionId,
            username
          );
          res.status(200).json(result);
        } catch (error) {
          next(error);
        }
      }
    );

    this.router.get(
      "/result/:conversionId",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const conversionId = parseInt(req.params.conversionId);
          const username = req.username;

          this.logger.info(
            "REST request to get scan result by conversion id",
            conversionId
          );

          const result = await this.scanDataService.scanResult(
            conversionId,
            username
          );
          res.status(200).json({
            fileId: result.fileId,
            fileName: result.fileName,
          });
        } catch (error) {
          next(error);
        }
      }
    );

    this.router.get(
      "/result-as-resource/:conversionId",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const conversionId = parseInt(req.params.conversionId);
          const token = req.headers.authorization!;

          this.logger.info(
            "REST request to get scan report by conversion id",
            conversionId
          );

          const result = await this.scanDataService.scanReport(
            conversionId,
            token
          );
          res.setHeader("Content-Type", "application/octet-stream");
          res.status(200).send(result);
        } catch (error) {
          this.logger.error(
            `Error when downloading report: ${JSON.stringify(error)}`
          );
          next(error);
        }
      }
    );
  }
}
