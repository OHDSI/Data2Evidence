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
      let [rst, status] = await getCodeSuggestion(req.body);

      // Calling local model
      if (status === "201" || status === "501") {
        res.setHeader("Content-Type", "text/plain");
        if (status === "501") {
          res.write(rst[0]);
          rst = rst[1];
        }
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
      }

      // LLM model
      else if (status === "200") {
        res.status(200).json(rst);
      }

      // Return error message when calling LLM model
      else if (status === "500") {
        res.status(200).json({
          error: true,
          message: "Cannot fetch code suggestion",
          details: rst,
        });
      }
    });

    this.router.post("/chat", async (req: Request, res: Response) => {
      req.body.model = AI_MODEL;
      let [stream, status] = await getChatResponse(req.body);
      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
        // Flush the data immediately
        res.flush();

        console.log("llmchunk:", chunk); // Log each chunk to console
        // Send chunks to a UI component
        // updateUI(chunk);
      }
      if (status === "200") {
        res.status(200);
      } else if (status === "500") {
        res.status(200).json({
          error: true,
          message: "Cannot fetch chat response",
        });
      }
    });
  }
}
