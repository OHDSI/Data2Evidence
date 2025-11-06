import express, { Request, Response } from "express";
import { Readable } from "stream";
import { WebSocketServer, WebSocket } from "ws";
import { Server } from "http";
import {
  startStrategusResultsViewer,
  stopStrategusResultsViewer,
} from "./services.ts";
import {
  validateStudyIdMiddleware,
  validateStudyId,
} from "../middlewares/study-validation.middleware.ts";

export class StrategusResultsRouter {
  public router = express.Router();
  private wss: WebSocketServer;

  constructor(private server: Server) {
    this.registerRoutes();
    this.wss = new WebSocketServer({ noServer: true });
    this.registerUpgradeHandler();
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
          } else {
            res.status(403).end({
              running: false,
              message: `Strategus Viewer for study ${studyId} is down.`,
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
            Readable.fromWeb(response.body).pipe(res);
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

  private registerUpgradeHandler() {
    this.server.on("upgrade", async (req, socket, head) => {
      const url = new URL(req.url ?? "", "http://localhost");

      const match = url.pathname.match(
        /^\/strategus-results\/([^/]+)\/websocket\/?$/
      );
      if (!match) {
        console.error(
          `[Strategus Viewer] Invalid upgrade path: ${url.pathname}`
        );
        socket.destroy();
        return;
      }

      const studyId = match[1];
      const valid = await validateStudyId(studyId);

      if (!valid) {
        console.warn(`[Strategus Viewer] Invalid studyId: ${studyId}`);
        socket.write("HTTP/1.1 404 Not Found\r\n\r\n");
        socket.destroy();
        return;
      }

      const targetUrl = `ws://${encodeURIComponent(studyId)}:3838/websocket`;
      console.log(
        `[Strategus Viewer] Upgrade request for studyId: ${studyId} to ${targetUrl}`
      );

      const strategusWS = new WebSocket(targetUrl);

      strategusWS.on("open", () => {
        console.log(
          `[Strategus Viewer] Connected to Strategus WS for study ${studyId}`
        );
      });

      strategusWS.on("error", (err) => {
        console.error(`[Strategus Viewer] Strategus WS error:`, err);
        if (strategusWS.readyState === WebSocket.OPEN) {
          strategusWS.close(1011, "Strategus WS error");
        }
      });

      // Complete upgrade
      this.wss.handleUpgrade(req, socket, head, (clientWS) => {
        this.wss.emit("connection", clientWS, req);
        console.log(`[Strategus Viewer] Client connected for study ${studyId}`);

        // Client → Strategus
        clientWS.on("message", (msg) => {
          if (strategusWS.readyState === WebSocket.OPEN) {
            strategusWS.send(msg);
          } else {
            console.error(
              `[Strategus Viewer] Strategus WS is not open; dropping client message`
            );
          }
        });

        // Strategus → Client
        strategusWS.on("message", (msg) => {
          if (clientWS.readyState === WebSocket.OPEN) {
            clientWS.send(msg);
          } else {
            console.error(
              `[Strategus Viewer] Client WS is not open; dropping Strategus message`
            );
          }
        });

        clientWS.on("close", () => {
          console.log(
            `[Strategus Viewer] Client WS closed; closing Strategus WS`
          );
          strategusWS.close();
        });

        strategusWS.on("close", () => {
          console.log(
            `[Strategus Viewer] Strategus WS closed; closing client WS`
          );
          clientWS.close();
        });

        clientWS.on("error", (err) => {
          console.error(`[Strategus Viewer] Client WS error:`, err);
          if (clientWS.readyState === WebSocket.OPEN) {
            clientWS.close(1011, "Client WS error");
          }
          if (strategusWS.readyState === WebSocket.OPEN) {
            strategusWS.close(1011, "Client WS error");
          }
        });
      });
    });
  }
}
