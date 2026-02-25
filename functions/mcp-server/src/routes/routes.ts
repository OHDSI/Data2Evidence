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

      // Notifications are fire-and-forget. In stateless Trex (no session persistence),
      // return 200 to prevent the client from attempting a GET SSE stream.
      if (method.startsWith("notifications/")) {
        console.log(
          `[MCP-TIMING] === REQUEST END === method=${method} total=${(performance.now() - reqStart).toFixed(1)}ms (short-circuit)`,
        );
        res.status(200).json({ jsonrpc: "2.0" });
        return;
      }

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

        // Auto-initialize for non-initialize requests (e.g., direct tools/call from static client). Trex is stateless — each request is a fresh process,
        // so the SDK transport is never pre-initialized.
        if (method !== "initialize") {
          const noOp: any = {
            writeHead() { return this; },
            setHeader() { return this; },
            getHeader() {},
            write() { return true; },
            end() {},
            on() { return this; },
            once() { return this; },
            status() { return this; },
            json() { return this; },
            headersSent: false,
            statusCode: 200,
          };
          await transport.handleRequest(req, noOp, {
            jsonrpc: "2.0",
            method: "initialize",
            id: "auto-init",
            params: {
              protocolVersion: "2025-03-26",
              capabilities: {},
              clientInfo: { name: "d2e-static-client", version: "1.0.0" },
            },
          });
        }

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
