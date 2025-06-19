import express, { Request, Response } from "express";
import { Readable } from "stream";
import { createStrategusResultsViewer } from "./services.ts";

export class StrategusResultsRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/", async (req: Request, res: Response) => {
      try {
        const token = req.headers["authorization"];
        const studyId = req.body.studyId;
        const datasetId = req.body.datasetId;
        await createStrategusResultsViewer(token, studyId, datasetId);
        res.status(200).json({
          message: `Strategus Results Viewer created successfully for study: ${studyId}`,
        });
      } catch (error) {
        res.status(500).json({
          message: "An error occurred while processing strategus results",
          details: error instanceof Error ? error.message : "Unknown error",
        });
      }
    });

    this.router.all("/:studyId/*", async (req: Request, res: Response) => {
      const { studyId } = req.params;
      const restOfPath = req.path.replace(`/${studyId}`, "");
      const strategusViewerHost = `http://${studyId}:3838`;

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
          Readable.fromWeb(response.body).pipe(res);
        } else {
          res.end();
        }
      } catch (error) {
        console.error(`Error forwarding request to strategus viewer: ${error}`);
        res.status(500).json({
          message: "Error forwarding request to strategus viewer",
        });
      }
    });
  }
}
