import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { createServer } from "../services/server";

export class mcpServerRouter {
  public router = express.Router();

  constructor() {
    this.registerRoutes();
  }

  private registerRoutes() {
    this.router.post("/chat", async (req: Request, res: Response) => {
      const reqStart = performance.now();
      const method = req.body?.method || "unknown";
      console.log(
        `[MCP-TIMING] === REQUEST START === method=${method} } === body=${JSON.stringify(req.body)} `,
      );

      // A server AND a transport per request. The agent calls tools in parallel,
      // and a server shared across those requests hands one call's result to
      // another call's transport — see the note in ../services/server.ts.
      const server = createServer();
      const transport = new StreamableHTTPServerTransport({
        sessionIdGenerator: undefined,
        enableJsonResponse: true,
      });

      // Protocol._onerror defaults to a no-op, so a response that fails to send
      // dies silently and the only symptom is a request that never ends. Log it.
      server.server.onerror = (error) => {
        console.error(`[MCP] transport error on method=${method}:`, error);
      };

      // Closing the server closes its transport too (Protocol.close).
      res.on("close", () => {
        void server.close();
        console.log(
          `[MCP-TIMING] === REQUEST END === method=${method} total=${(performance.now() - reqStart).toFixed(1)}ms`,
        );
      });

      try {
        await server.connect(transport);
        await transport.handleRequest(req, res, req.body);
      } catch (error) {
        console.error("Error in MCP server:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    });
  }
}
