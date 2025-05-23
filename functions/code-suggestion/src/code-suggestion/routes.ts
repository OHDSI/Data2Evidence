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
    this.router.post("/code", async (req: Request, res: Response) => {
      req.body.model = AI_MODEL;
      try {
        let rst = await getCodeSuggestion(req.body);

        // Calling local model
        if (
          rst.startsWith(`You are an intelligent code auto-completion tool.`)
        ) {
          res.setHeader("Content-Type", "text/plain");
          const stream = await Trex.ask(rst, {
            repo: "QuantFactory/Dolphin3.0-Llama3.2-1B-GGUF",
            model: "Dolphin3.0-Llama3.2-1B.Q4_K_M.gguf",
          });
          const reader = stream.getReader();
          while (true) {
            const { done, value } = await reader.read();
            if (done) {
              break;
            }

            res.write(value);
            if (typeof res.flush === "function") {
              res.flush();
            }
          }
          res.end();
        } else {
          res.status(200).json(rst);
        }
      } catch (error) {
        res.status(200).json({
          error: true,
          message: `Cannot fetch code suggestion: ${error.message}`,
        });
      }
    });
    this.router.post("/chat", async (req: Request, res: Response) => {
      try {
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        req.body.model = AI_MODEL;

        let stream = await getChatResponse(req.body);
        for await (const chunk of stream) {
          res.write(chunk);
        }
        res.end();
        res.status(200);
      } catch (error) {
        res.status(500).json({
          error: true,
          message: `Cannot fetch chat response: ${error.message}`,
        });
      }
    });
  }
}
