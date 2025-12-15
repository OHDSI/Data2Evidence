import express, { Request, Response } from "express";
import { Readable } from "stream";
import { Server } from "http";
import {
  startStrategusResultsViewer,
  stopStrategusResultsViewer,
} from "./services.ts";
import { validateStudyIdMiddleware } from "../middlewares/study-validation.middleware.ts";

export class StrategusResultsRouter {
  public router = express.Router();

  constructor(private server: Server) {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.get("/", (req: Request, res: Response) => {
      // This endpoint is for testing purposes only - STUDY_RESULTS_READ_RESEARCHER can access this endpoint
      res.status(200).send("Hello, world!");
    });

    this.router.post("/", async (req: Request, res: Response) => {
      try {
        const token = req.headers["authorization"];
        const { studyId, datasetId, viewerCode } = req.body;

        if (!studyId) {
          return res.status(400).json({
            message: "Missing required field: studyId",
          });
        }

        if (!datasetId) {
          return res.status(400).json({
            message: "Missing required field: datasetId",
          });
        }

        if (!viewerCode) {
          return res.status(400).json({
            message: "Missing required field: viewerCode",
          });
        }

        await startStrategusResultsViewer(
          token,
          studyId,
          datasetId,
          viewerCode
        );

        res.status(200).json({
          message: `Strategus Results Viewer created successfully for study: ${studyId}`,
        });
      } catch (error) {
        res.status(500).json({
          message: "An error occurred starting strategus result viewer",
        });
      }
    });

    this.router.delete("/", async (req: Request, res: Response) => {
      try {
        const token = req.headers["authorization"];
        const studyId = req.body.studyId;
        const result = await stopStrategusResultsViewer(token, studyId);
        if (result.stopped) {
          res.status(200).json(result);
        } else {
          res.status(404).json(result);
        }
      } catch (error) {
        res.status(500).json({
          message: "An error occurred while stopping strategus result viewer",
        });
      }
    });

    this.router.get(
      "/:studyId/status",
      validateStudyIdMiddleware,
      async (req: Request, res: Response) => {
        const { studyId } = req.params;

        const strategusViewerHost = `http://${encodeURIComponent(
          studyId
        )}:3838`;
        try {
          const response = await fetch(strategusViewerHost, { method: "GET" });

          if (response.ok) {
            res.status(200).send({
              running: true,
              message: `Strategus Viewer for study ${studyId} is up.`,
            });
          }
        } catch (error) {
          res.status(503).json({
            running: false,
            message: `Strategus Viewer for study ${studyId} is down.`,
          });
        }
      }
    );

    this.router.all(
      "/:studyId/*",
      validateStudyIdMiddleware,
      async (req: Request, res: Response) => {
        const { studyId } = req.params;
        const restOfPath = req.path.replace(`/${studyId}`, "");
        const strategusViewerHost = `http://${encodeURIComponent(
          studyId
        )}:3838`;

        try {
          const targetUrl = `${strategusViewerHost}${restOfPath}`;
          const newHeaders = new Headers(req.headers);
          newHeaders.append(
            "x-source-origin",
            `${req.protocol}://${req.get("host")}`
          );

          const requestOptions: RequestInit = {
            method: req.method,
            headers: newHeaders,
            body: req.rawBody,
            redirect: "follow",
          };
          console.log(`Forwarding request to strategus viewer: ${targetUrl}`);

          const response = await fetch(targetUrl, requestOptions);

          response.headers.forEach((value, key) => {
            res.setHeader(key, value);
          });

          res.status(response.status);

          if (response.body) {
            Readable.fromWeb(response.body as any).pipe(res);
          } else {
            res.end();
          }
        } catch (error) {
          console.error(
            `Error forwarding request to strategus viewer: ${error}`
          );
          res.status(500).json({
            message: "Error forwarding request to strategus viewer",
          });
        }
      }
    );
  }
}