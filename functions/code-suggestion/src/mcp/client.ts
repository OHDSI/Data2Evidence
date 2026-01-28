import { MultiServerMCPClient } from "@langchain/mcp-adapters";

export interface MCPClientConfig {
  serverUrl: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

export class MCPClient {
  private client?: MultiServerMCPClient;
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

  getConnectionStatus(): boolean {
    return this.isConnected;
  }

  // Expose the underlying MCP client for use with langchain adapters
  getUnderlyingClient(): MultiServerMCPClient {
    if (!this.client) {
      throw new Error("MCP client is not connected. Call connect() first.");
    }
    return this.client;
  }
}
