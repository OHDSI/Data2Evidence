import { getCodeSuggestion, getChatResponse } from "./services";
import express, { Request, Response } from "express";
import { env } from "../env";

const AI_MODEL = env.AI_MODEL;
export class CodeSuggestionRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/", async (req: Request, res: Response) => {
      req.body.model = AI_MODEL;
      try {
        let rst = await getCodeSuggestion(req.body);
        res.setHeader("Content-Type", "text/plain");
        if (typeof rst === "object") {
          while (true) {
            const { done, value } = await rst.read();
            if (done) {
              break;
            }
            res.write(value);
            if (typeof res.flush === "function") {
              res.flush();
            }
          }
          res.status(200);
          res.end();
        } else {
          res.status(200).json(rst);
        }
      } catch (error) {
        res.status(500).json({
          error: true,
          message: `Cannot fetch code suggestion: ${error.message}`,
        });
      }
    });
    this.router.post("/chat", async (req: Request, res: Response) => {
      try {
        // Set headers for Server-Sent Events (SSE) to enable streaming responses.
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        req.body.model = AI_MODEL;

        // Call the getChatResponse service to fetch a stream of chat responses.
        // Stream the response chunks to the client as they are received.
        let stream = await getChatResponse(req.body);
        for await (const chunk of stream) {
          res.write(chunk);
        }
        res.status(200);
        res.end();
      } catch (error) {
        res.status(500).json({
          error: true,
          message: `Cannot fetch chat response: ${error.message}`,
        });
      }
    });
  }
}
