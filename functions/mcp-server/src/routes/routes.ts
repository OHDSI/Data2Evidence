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
      console.log(`[MCP-TIMING] === REQUEST START === method=${method}`);
      try {
        const t0 = performance.now();
        const transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: undefined,
          enableJsonResponse: true,
        });
        console.log(`[MCP-TIMING] Transport created in ${(performance.now() - t0).toFixed(1)}ms`);

        res.on("close", () => {
          transport.close();
          console.log(`[MCP-TIMING] === REQUEST END === method=${method} total=${(performance.now() - reqStart).toFixed(1)}ms`);
        });

        const t1 = performance.now();
        await server.connect(transport);
        console.log(`[MCP-TIMING] server.connect() in ${(performance.now() - t1).toFixed(1)}ms`);

        const t2 = performance.now();
        await transport.handleRequest(req, res, req.body);
        console.log(`[MCP-TIMING] handleRequest() in ${(performance.now() - t2).toFixed(1)}ms`);
      } catch (error) {
        console.error("Error in MCP server:", error);
        if (!res.headersSent) {
          res.status(500).json({ error: "Internal server error" });
        }
      }
    });
  }
}
