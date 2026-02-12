import { MultiServerMCPClient } from "@langchain/mcp-adapters";
import { env } from "../env";

export function createMcpClient(token?: string, datasetId?: string): MultiServerMCPClient {
  return new MultiServerMCPClient({
    "d2e-mcp": {
      transport: "http",
      url: `${env.SERVICE_ROUTES["mcp-server"]}`,
      headers: {
        Authorization: token || "",
        datasetId: datasetId || "",
      },
    },
  });
}
