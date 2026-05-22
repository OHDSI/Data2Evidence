# Code Suggestion Service

This service provides AI-powered code suggestions and chat functionality for OHDSI/Strategus development, with optional integration with MCP (Model Context Protocol) servers.

## Environment Configuration

### AI Model Configuration

To use code-suggestion, the API_KEY for specific AI models should be provided in `.env` or `.env.local` file.

#### If use model directly from model providers, set below API_KEY
- `OPENAI_API_KEY=xxx`
- `ANTHROPIC_API_KEY=xxx`
- `GOOGLE_API_KEY=xxx`

#### If use Azure OpenAI, set below variables
Values can be extracted from "Endpoint" of the deployment.
- `AZURE_OPENAI_API_KEY='yyy'`
- `AZURE_OPENAI_API_VERSION="xxx"`
- `AZURE_OPENAI_API_INSTANCE_NAME=<resource_name_of_your_deployment>`
- `AZURE_OPENAI_API_DEPLOYMENT_NAME=<YOUR_DEPLOYMENT_NAME>`

#### If use Ollama, set the server URL
- `OLLAMA_BASE_URL=http://host.docker.internal:11434`
- `OLLAMA_API_KEY=xxx` (optional — required for Ollama Cloud / Turbo or self-hosted Ollama behind an auth proxy. Sent as `Authorization: Bearer <key>`.)

#### Set AI_MODEL environment variable
The provider is selected by the prefix on `AI_MODEL`:
- OpenAI: model name as-is, e.g. `AI_MODEL='gpt:GPT-4o'`
- Azure OpenAI: `AI_MODEL='azure:gpt-4o'`
- Anthropic: `AI_MODEL='anthropic:claude-sonnet-4-5'`
- Google Gemini: `AI_MODEL='gemini:gemini-2.0-flash'`
- Ollama: `AI_MODEL='ollama:llama3.1'`
- Local Trex GGUF model: anything that doesn't match a prefix above (e.g. `AI_MODEL='local'`)

#### Example .env file with MCP
```env
# AI Model Configuration
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-...
```

### POST /code-suggestion/chat
Interactive chat with AI assistant, with optional MCP integration.

**Request Body:**
```json
{
  "userInput": "How do I create a cohort in Strategus?",
  "context": "// Notebook code and chat history",
  "model": "// LLM Model"
}
```

**Parameters:**
- `userInput` (required): The user's question or request
- `context` (optional): Notebook code and chat history
- `model` (required): AI model to use

## Development

### Project Structure

```
functions/code-suggestion/
├── src/
│   ├── code-suggestion/
│   │   ├── routes.ts        # API endpoints
│   │   └── services.ts      # Business logic
│   ├── mcp/
│   │   ├── client.ts        # MCP client implementation
│   │   └── mcpManager.ts    # MCP lifecycle manager
│   ├── env.ts               # Environment configuration
│   └── type.ts              # TypeScript types
├── index.ts                 # Application entry point
├── deno.json                # Deno configuration
└── README.md                # This file
```

## Troubleshooting

### MCP Connection Issues
1. Verify MCP server is running
   ```
   curl --cacert path/of/cert/file \  -H "Authorization: Bear xxx" \
   -H "datasetId: yyy" -H "Content-Type: application/json" \
   -H "Accept: application/json, text/event-stream" \
   -X POST https://localhost:41100/mcp/chat \
   -d '{
      "jsonrpc": "2.0",
      "id": 1,
      "method": "tools/call",
      "params": {
         "name": "get_cohorts_id_name_list",
         "arguments": {
         "cohortInfo": "test"
         }
      }
   }
   ```
   - `path/of/cert/file`: Please refer to README.md in mcp-server function
2. Check logs for MCP-related warnings in trex container

### AI Model Issues

1. **Model Not Found**
   - Verify API keys are set correctly
   - Check model name matches provider's naming

2. **Rate Limiting**
   - Implement request throttling
   - Use appropriate tier for your usage