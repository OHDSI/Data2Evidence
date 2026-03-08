import express, { Request, Response } from "express";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { server } from "../services/server";

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

      try {
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });

        res.on("close", () => {
          transport.close();
          console.log(
            `[MCP-TIMING] === REQUEST END === method=${method} total=${(performance.now() - reqStart).toFixed(1)}ms`,
          );
        });

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
