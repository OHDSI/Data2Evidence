# Code Suggestion Service

This service provides AI-powered code suggestions and chat functionality for OHDSI/Strategus development, with optional integration with MCP (Model Context Protocol) servers.

## Environment Configuration

### AI Model Configuration

To use code-suggestion, the API_KEY for specific AI models should be provided in `.env` or `.env.local` file.

#### If use model directly from model providers, set below API_KEY
- `OPENAI_API_KEY=xxx`
- `ANTHROPIC_API_KEY=xxx`

#### If use Azure OpenAI, set below variables
Values can be extracted from "Endpoint" of the deployment.
- `AZURE_OPENAI_API_KEY='yyy'`
- `AZURE_OPENAI_API_VERSION="xxx"`
- `AZURE_OPENAI_API_INSTANCE_NAME=<resource_name_of_your_deployment>`
- `AZURE_OPENAI_API_DEPLOYMENT_NAME=<YOUR_DEPLOYMENT_NAME>`

#### Set AI_MODEL environment variable
The name of specific model is provided as well:
- For calling model directly from AI model provider, use the model name, e.g. `'gpt-4o'`
- For calling model from Azure OpenAI, set the `AI_MODEL='azure:gpt-4o'`
- For calling model from local, set the `AI_MODEL='local'`

### MCP (Model Context Protocol) Configuration

The service can optionally connect to an MCP server to access additional tools and context.

#### Required Environment Variables for MCP
- `MCP_SERVER_URL` (optional): URL of the MCP server
  - Default: `${baseURL}/mcp/chat`

#### Optional Environment Variables for MCP
- `MCP_AUTH_TOKEN` (optional): JWT token for MCP server authentication
- `MCP_DATASET_ID` (optional): Dataset ID to use with MCP server

#### Example .env file with MCP
```env
# AI Model Configuration
AI_MODEL=gpt-4o
OPENAI_API_KEY=sk-...

# MCP Configuration (optional)
MCP_SERVER_URL=http://localhost:10000/mcp/chat
MCP_AUTH_TOKEN=your_jwt_token_here
MCP_DATASET_ID=your_dataset_id
```

## API Endpoints
**Request Body:**
```json
{
  "code": "function example() {",
  "model": "// LLM Model"
}
```

### POST /code-suggestion/chat
Interactive chat with AI assistant, with optional MCP integration.

**Request Body:**
```json
{
  "userInput": "How do I create a cohort in Strategus?",
  "context": "// Current code context",
  "model": "// LLM Model"
}
```

**Parameters:**
- `userInput` (required): The user's question or request
- `context` (optional): Current code context
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
│   │   ├── mcpManager.ts    # MCP lifecycle manager
│   │   └── test-client.ts   # Test utilities
│   ├── env.ts               # Environment configuration
│   └── type.ts              # TypeScript types
├── index.ts                 # Application entry point
├── deno.json                # Deno configuration
└── README.md                # This file
```

## Troubleshooting

### MCP Connection Issues

1. **Connection Refused**
   - Verify MCP server is running
   - Check `MCP_SERVER_URL` is correct
   - Ensure firewall allows connection

2. **Authentication Errors**
   - Verify `MCP_AUTH_TOKEN` is valid and not expired
   - Check token has correct permissions

3. **MCP Not Working**
   - MCP failures don't break the service - it falls back gracefully
   - Check logs for MCP-related warnings
   - Test MCP connectivity using `test-client.ts`

### AI Model Issues

1. **Model Not Found**
   - Verify API keys are set correctly
   - Check model name matches provider's naming

2. **Rate Limiting**
   - Implement request throttling
   - Use appropriate tier for your usage