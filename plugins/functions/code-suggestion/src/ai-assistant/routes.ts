import { Router, Request, Response } from "express";
import { SessionService } from "./session-store";
import { AgentService } from "./agent";
import { StreamPump } from "./stream-pump";

export class AIRouter {
  public router = Router();
  private sessions = new SessionService();
  private agent = new AgentService();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    // 1. Create session
    this.router.post("/sessions", (req: Request, res: Response) => {
      const { datasetId, context } = req.body;
      const session = this.sessions.createSession(datasetId, context);
      res.status(201).json(session);
    });

    // 2. Stream message
    this.router.post(
      "/sessions/:sessionId/messages",
      async (req: Request, res: Response) => {
        const { sessionId } = req.params;
        const { userInput } = req.body;
        const token = req.headers.authorization;

        const session = this.sessions.getSession(sessionId);
        if (!session) {
          return res.status(404).json({ error: "Session not found" });
        }

        // SSE headers
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");

        try {
          const stream = await this.agent.getStream(session, userInput, token);
          const pump = new StreamPump(res);
          await pump.pump(stream);
          this.sessions.updateActivity(sessionId);
        } catch (error: any) {
          console.error("Stream error:", error);
          res.write(
            `event: error\ndata: ${JSON.stringify({ message: error.message })}\n\n`
          );
          res.end();
        }
      }
    );

    // 3. Get session / history
    this.router.get("/sessions/:sessionId", (req: Request, res: Response) => {
      const session = this.sessions.getSession(req.params.sessionId);
      if (!session) return res.status(404).end();
      res.json(session);
    });
  }
}
