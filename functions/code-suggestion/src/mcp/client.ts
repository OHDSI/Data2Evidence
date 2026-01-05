import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { MultiServerMCPClient } from "@langchain/mcp-adapters";

export interface MCPClientConfig {
  serverUrl: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

export class MCPClient {
  private client: MultiServerMCPClient | null = null;
  private transport: StreamableHTTPClientTransport | null = null;
  private config: MCPClientConfig;
  private isConnected: boolean = false;
  private reconnectAttempts: number = 0;
  private maxRetries: number;
  private retryDelay: number;

  constructor(config: MCPClientConfig) {
    this.config = config;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelay = config.retryDelay || 1000;
  }

  async connect(): Promise<void> {
    try {
      this.client = new MultiServerMCPClient({
        "d2e-mcp": {
          transport: "http", // ← Magic string, no manual transport needed
          url: this.config.serverUrl, // Your MCP endpoint (must have /mcp)
          headers: {
            Authorization: this.config.headers?.Authorization || "",
            datasetId: this.config.headers?.datasetId || "", // Pass dataset context
          },
        },
      });
      await this.client.getTools();
      this.isConnected = true;
      this.reconnectAttempts = 0;
      console.log(`MCP Client connected to ${this.config.serverUrl}`);
    } catch (error) {
      console.error("Failed to connect to MCP server:", error);
      await this.handleConnectionError(error);
    }
  }

  private async handleConnectionError(error: any): Promise<void> {
    if (this.reconnectAttempts < this.maxRetries) {
      this.reconnectAttempts++;
      console.log(
        `Retrying connection (${this.reconnectAttempts}/${this.maxRetries})...`
      );
      await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
      await this.connect();
    } else {
      this.isConnected = false;
      throw new Error(
        `Failed to connect to MCP server after ${this.maxRetries} attempts: ${error.message}`
      );
    }
  }

  async disconnect(): Promise<void> {
    try {
      if (this.transport) {
        await this.transport.close();
        this.transport = null;
      }
      this.isConnected = false;
      console.log("MCP Client disconnected");
    } catch (error) {
      console.error("Error disconnecting MCP client:", error);
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Expose the underlying MCP client for use with langchain adapters
  getUnderlyingClient(): MultiServerMCPClient {
    return this.client;
  }
}
