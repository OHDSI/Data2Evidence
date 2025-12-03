import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";

export interface MCPClientConfig {
  serverUrl: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  retryDelay?: number;
}

export interface MCPTool {
  name: string;
  description?: string;
  inputSchema?: any;
}

export class MCPClient {
  private client: Client;
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
    this.client = new Client(
      {
        name: "code-suggestion-mcp-client",
        version: "1.0.0",
      },
      {
        capabilities: {
          tools: {},
          prompts: {},
        },
      }
    );
  }

  async connect(): Promise<void> {
    try {
      this.transport = new StreamableHTTPClientTransport({
        url: this.config.serverUrl,
        headers: this.config.headers || {},
      });

      await this.client.connect(this.transport);
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

  async listTools(): Promise<MCPTool[]> {
    if (!this.isConnected) {
      throw new Error("MCP client is not connected");
    }

    try {
      const response = await this.client.request(
        {
          method: "tools/list",
        },
        {}
      );
      return response.tools || [];
    } catch (error) {
      console.error("Error listing tools:", error);
      await this.handleRequestError(error);
      return [];
    }
  }

  async callTool(
    toolName: string,
    args: Record<string, any>
  ): Promise<any> {
    if (!this.isConnected) {
      throw new Error("MCP client is not connected");
    }

    try {
      const response = await this.client.request(
        {
          method: "tools/call",
          params: {
            name: toolName,
            arguments: args,
          },
        },
        {}
      );
      return response;
    } catch (error) {
      console.error(`Error calling tool ${toolName}:`, error);
      await this.handleRequestError(error);
      throw error;
    }
  }

  async listPrompts(): Promise<any[]> {
    if (!this.isConnected) {
      throw new Error("MCP client is not connected");
    }

    try {
      const response = await this.client.request(
        {
          method: "prompts/list",
        },
        {}
      );
      return response.prompts || [];
    } catch (error) {
      console.error("Error listing prompts:", error);
      await this.handleRequestError(error);
      return [];
    }
  }

  async getPrompt(promptName: string, args?: Record<string, any>): Promise<any> {
    if (!this.isConnected) {
      throw new Error("MCP client is not connected");
    }

    try {
      const response = await this.client.request(
        {
          method: "prompts/get",
          params: {
            name: promptName,
            arguments: args || {},
          },
        },
        {}
      );
      return response;
    } catch (error) {
      console.error(`Error getting prompt ${promptName}:`, error);
      await this.handleRequestError(error);
      throw error;
    }
  }

  private async handleRequestError(error: any): Promise<void> {
    if (error.message?.includes("connection") || error.message?.includes("ECONNREFUSED")) {
      console.log("Connection lost, attempting to reconnect...");
      this.isConnected = false;
      await this.connect();
    }
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}
