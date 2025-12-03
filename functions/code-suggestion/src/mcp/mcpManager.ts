import { MCPClient, MCPClientConfig } from "./client";
import { env } from "../env";

export class MCPManager {
  private static instance: MCPManager;
  private client: MCPClient | null = null;
  private isInitialized: boolean = false;

  private constructor() {}

  static getInstance(): MCPManager {
    if (!MCPManager.instance) {
      MCPManager.instance = new MCPManager();
    }
    return MCPManager.instance;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Accept": "application/json, text/event-stream",
    };

    if (env.MCP_AUTH_TOKEN) {
      headers["Authorization"] = `Bearer ${env.MCP_AUTH_TOKEN}`;
    }

    if (env.MCP_DATASET_ID) {
      headers["datasetId"] = env.MCP_DATASET_ID;
    }

    const config: MCPClientConfig = {
      serverUrl: env.MCP_SERVER_URL,
      headers,
      maxRetries: 3,
      retryDelay: 2000,
    };

    this.client = new MCPClient(config);
    await this.client.connect();
    this.isInitialized = true;
  }

  getClient(): MCPClient {
    if (!this.client || !this.isInitialized) {
      throw new Error("MCP Manager not initialized. Call initialize() first.");
    }
    return this.client;
  }

  async shutdown(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.client = null;
      this.isInitialized = false;
    }
  }

  isReady(): boolean {
    return this.isInitialized && this.client !== null && this.client.getConnectionStatus();
  }
}
