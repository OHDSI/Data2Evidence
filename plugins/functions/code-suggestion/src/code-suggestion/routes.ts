import { getCodeSuggestion, getChatResponse, getCohortResponse } from "./services";
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
        // req.body.model = AI_MODEL;
        // req.body.model = "ollama:lfm2.5";
        req.body.model = "anthropic:claude-sonnet-4-5";

        // Stream the response chunks to the client as they are received.
        // NOTE: This logic depends on the Langchain Agent streaming format
        let stream = await getChatResponse(req);
        let lastChar = "\n";
        for await (const [token, metadata] of stream) {
          if (
            metadata.langgraph_node === "model_request" &&
            token.contentBlocks?.[0]?.text
          ) {
            let text: string = token.contentBlocks[0].text;
            // Ensure markdown headings start on a new line when the previous chunk didn't end with one.
            if (text.startsWith("#") && lastChar !== "\n") {
              text = "\n" + text;
            } else if (lastChar === "." && /^\S/.test(text)) {
              // Add a space when a sentence-ending period is immediately followed by a non-whitespace character in the next chunk.
              text = " " + text;
            }
            lastChar = text[text.length - 1];
            console.log("Streaming token:", text);
            res.write(text);
          }
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
    this.router.post("/cohort", async (req: Request, res: Response) => {
      try {
        // Same SSE streaming setup as /chat.
        res.setHeader("Content-Type", "text/event-stream");
        res.setHeader("Cache-Control", "no-cache");
        res.setHeader("Connection", "keep-alive");
        // req.body.model = AI_MODEL;
        req.body.model = "ollama:lfm2.5";
        // req.body.model = "anthropic:claude-sonnet-4-5";

        const { stream, linkRef } = await getCohortResponse(req);
        let lastChar = "\n";
        let modelText = "";
        const COHORT_URL_RE = /\/portal\/researcher\/cohort\?[^\s")']+/;
        // Cast: langchain's messages-mode stream isn't precisely typed; the
        // /chat route gets `any` for free via its fallback branch's wider union.
        for await (const [token, metadata] of stream as any) {
          if (
            metadata.langgraph_node === "model_request" &&
            token.contentBlocks?.[0]?.text
          ) {
            let text: string = token.contentBlocks[0].text;
            if (text.startsWith("#") && lastChar !== "\n") {
              text = "\n" + text;
            } else if (lastChar === "." && /^\S/.test(text)) {
              text = " " + text;
            }
            lastChar = text[text.length - 1];
            modelText += text;
            console.log("Cohort Streaming token:", text);
            res.write(text);
          } else if (!linkRef.url && typeof token?.content === "string") {
            // Fallback: capture the deep link if it surfaces as a tool message
            // in the stream rather than via the invoke interceptor.
            const m = token.content.match(COHORT_URL_RE);
            if (m) linkRef.url = m[0];
          }
        }
        // Append the real, deterministic deep link — never trust the LLM to
        // relay it (it placeholders long URLs). The front end prepends origin.
        // Dedupe: skip the append if the model already emitted the exact link.
        if (linkRef.url && !modelText.includes(linkRef.url)) {
          res.write(`\n\n${linkRef.url}`);
        } else if (!linkRef.url) {
          res.write(
            "\n\n(Could not generate the cohort link — please try again.)",
          );
        }
        res.status(200);
        res.end();
      } catch (error) {
        res.status(500).json({
          error: true,
          message: `Cannot fetch cohort response: ${error.message}`,
        });
      }
    });
  }
}
