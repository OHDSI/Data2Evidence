const _env = Deno.env.toObject();

export const env = {
  AI_MODEL: _env.AI_MODEL,
  OPENAI_API_KEY: _env.OPENAI_API_KEY,
  AZURE_OPENAI_API_KEY: _env.AZURE_OPENAI_API_KEY,
  MCP_SERVER_URL: _env.MCP_SERVER_URL || "http://localhost:10000/mcp/chat",
  MCP_AUTH_TOKEN: _env.MCP_AUTH_TOKEN,
  MCP_DATASET_ID: _env.MCP_DATASET_ID,
};
