import { getCodeSuggestion, getChatResponse } from "./services";
import express, { Request, Response } from "express";
import { env } from "../env";
import { AgentUnavailableError, streamCohortAgent } from "../agent/cohortAgent";

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

    // Cohort agent for the portal AI assistant drawer.
    //
    // Unlike /chat (LangChain, plain-text SSE) this speaks the AI SDK UI message
    // stream, because the drawer's `pa_*` tools execute in the BROWSER: the SDK
    // streams those tool calls to the client, which runs them against the live
    // Patient Analytics store and resubmits with the output. The endpoint is
    // stateless — every turn carries the full transcript.
    this.router.post("/agent", async (req: Request, res: Response) => {
      try {
        const { messages, paTools } = req.body ?? {};
        if (!Array.isArray(messages) || messages.length === 0) {
          // An unparsed body looks identical to a caller that forgot `messages`,
          // so say which it is: express.json() silently yields {} when the
          // Content-Type is anything it does not recognise as JSON.
          const bodyKeys = Object.keys(req.body ?? {});
          res.status(400).json({
            error: true,
            message:
              bodyKeys.length === 0
                ? `Request body was empty or not parsed as JSON (Content-Type: ${req.headers["content-type"] ?? "none"}). messages[] is required.`
                : `messages[] is required (received keys: ${bodyKeys.join(", ")}).`,
          });
          return;
        }
        const datasetId = req.query.datasetId as string;
        if (!datasetId) {
          res.status(400).json({ error: true, message: "datasetId query parameter is required" });
          return;
        }

        await streamCohortAgent(res, {
          messages,
          token: req.headers.authorization ?? "",
          datasetId,
          clientTools: Array.isArray(paTools) ? paTools : [],
          model: AI_MODEL,
        });
      } catch (error) {
        console.error("Error in /agent route:", error);
        // A misconfigured model is the one failure the user can act on, so it
        // gets its own status rather than a generic 500.
        const status = error instanceof AgentUnavailableError ? 503 : 500;
        if (res.headersSent) {
          // The UI message stream has already started; a JSON body here would
          // corrupt it. Close cleanly and let the client surface the truncation.
          res.end();
        } else {
          res.status(status).json({
            error: true,
            message:
              error instanceof AgentUnavailableError
                ? error.message
                : `Cannot fetch agent response: ${error.message}`,
          });
        }
      }
    });
  }
}
