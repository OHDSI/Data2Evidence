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
      "/result/:conversionId",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          const conversionId = req.params.conversionId;
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
          const conversionId = req.params.conversionId;
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
        } catch (error) {}
      }
    );

    this.router.post(
      "/conversion",
      async (req: Request, res: Response, next: NextFunction) => {
        try {
          this.logger.info(
            "REST request to save scan report conversion results"
          );

          const { flow_run_id, file_id, file_name } = req.body;
          const username = req.username;
          const result = await this.scanDataService.saveConversion(
            flow_run_id,
            username,
            file_name,
            file_id
          );

          res.status(200).send(result);
        } catch (error) {
          this.logger.error(
            `Error when saving conversion: ${JSON.stringify(error)}`
          );
          next(error);
        }
      }
    );
  }
}
