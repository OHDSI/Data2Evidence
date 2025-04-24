import express, { Request, Response, Router } from "express";
import { param, validationResult } from "express-validator";
import { validateWhiteRabbitFlowRunDto } from "../middlewares/WhiteRabbitValidatorMiddlewares.ts";
import { WhiteRabbitService } from "../services/WhiteRabbitService.ts";
import { Buffer } from "buffer";
import pako from "npm:pako";

export class WhiteRabbitController {
  private whiteRabbitService: WhiteRabbitService;
  public router = Router();

  constructor() {
    this.whiteRabbitService = new WhiteRabbitService();
    this.registerRoutes();
  }

  private registerRoutes() {
    // Compress the uploaded csv files when scanning
    this.router.use(async (req, res, next) => {
      if (
        req.body?.options?.run_type === "SCAN_REPORT_FILES" &&
        req.body?.options?.data
      ) {
        try {
          // Convert base64 to buffer
          const compressed = Buffer.from(req.body.options.data, "base64");
          // Use pako to decompress
          const decompressed = pako.ungzip(compressed, { to: "string" });
          // Parse the JSON string
          req.body.options.data = JSON.parse(decompressed);
        } catch (error) {
          console.error("Error processing request:", error);
          return res.status(400).send("Invalid compressed data");
        }
      }
      next();
    });

    // POST /white-rabbit/flow-run
    this.router.post(
      "/flow-run",
      validateWhiteRabbitFlowRunDto(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          res.status(400).json({ errors: errors.array() });
        }
        await this.createWhiteRabbitFlowRun(req, res);
      }
    );

    // GET /white-rabbit/results/:flowRunId
    this.router.get(
      "/results/:flowRunId",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getWhiteRabbitFlowRunResults(req, res);
      }
    );

    // GET /white-rabbit/artifacts/:flowRunId
    this.router.get(
      "/artifacts/:flowRunId",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getWhiteRabbitFlowRunArtifacts(req, res);
      }
    );

    // GET /white-rabbit/etl-report/:flowRunId
    this.router.get(
      "/etl-report/:flowRunId",
      param("flowRunId").isUUID(),
      async (req: Request, res: Response) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
          return res.status(400).json({ errors: errors.array() });
        }
        await this.getETLReportFromArtifacts(req, res);
      }
    );
  }

  private async createWhiteRabbitFlowRun(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const params = req.body;
      const username = req.username;

      const result = await this.whiteRabbitService.createFlowRun(
        params,
        username,
        token
      );
      res.send(result);
    } catch (error) {
      console.error(`Error creating white rabbit flow run: ${error}`);
      res.status(500).send(`Error: ${error}`);
    }
  }

  private async getWhiteRabbitFlowRunResults(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const flowRunId = req.params.flowRunId;

      const result = await this.whiteRabbitService.getFlowRun(flowRunId, token);
      const stateInfo = {
        flow_id: result.flow_id,
        state_name: result.state_name,
        state: result.state,
      };
      res.send(stateInfo);
    } catch (error) {
      console.error(`Error getting white-rabbit results: ${error}`);
      res.status(500).send(`Error: ${error}`);
    }
  }

  private async getWhiteRabbitFlowRunArtifacts(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const flowRunId = req.params.flowRunId;

      const result = await this.whiteRabbitService.getFlowRunArtifacts(
        flowRunId,
        token
      );
      const scanIdResponse = {
        scan_id: result[0].key,
        flow_run_id: result[0].flow_run_id,
      };
      res.send(scanIdResponse);
    } catch (error) {
      console.error(`Error getting white-rabbit flow run artifacts: ${error}`);
      res.status(500).send(`Error: ${error}`);
    }
  }

  private async getETLReportFromArtifacts(req: Request, res: Response) {
    try {
      const token = req.headers.authorization!;
      const flowRunId = req.params.flowRunId;

      const result = await this.whiteRabbitService.getFlowRunArtifacts(
        flowRunId,
        token
      );
      const encodedWordFile = result[0].data;

      // Decode the Base64 string stored in the artifacts
      const buffer = Buffer.from(encodedWordFile, "base64");

      // Set the response headers for downloading a Word document
      res.setHeader("Content-Disposition", "attachment; filename=report.docx");
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      );
      res.setHeader("Content-Length", buffer.length);

      res.end(buffer);
    } catch (error) {
      console.error(`Error getting white-rabbit flow run artifacts: ${error}`);
      res.status(500).send(`Error: ${error}`);
    }
  }
}
