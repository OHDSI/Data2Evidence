# D2E MCP Server

Model Context Protocol (MCP) server for Data-to-Evidence (D2E) cohort definition management.

## Table of Contents
- [Setup Guide](#setup-guide)
- [Architecture](#architecture)
- [Development Guide](#development-guide)

---

## Setup Guide

This guide will help you set up the MCP server for local development and integration with MCP client, e.g. VS Code Copilot.

### 1. Certificate Setup
To enable secure communication, you need to set up the CA certificate:

```sh
docker exec alp-caddy cat /data/caddy/pki/authorities/local/root.crt > /path/to/ca_cert.pem
```
```sh
export NODE_EXTRA_CA_CERTS="/path/to/ca_cert.pem"
```
Replace `/path/to/ca_cert.pem` with the path to your CA certificate

### 2. Authorization Setup
Provide the JWT (to only allow authorized user) in your MCP client config file. Example config:

```json
"d2e-mcp": {
	"url": "https://localhost:d2e-port/mcp/chat",
	"type": "http",
	"headers": {
		"Authorization": "Bearer xxx",
		"Content-Type": "application/json",
		"Accept": "application/json, text/event-stream"
	}
}
```
Replace `d2e-port` with 443 for localhost or 41100 for development

### 3. Run the MCP Server
Start the Data2Evidence platform

### 4. Connect with VS Code Copilot
Once the server is running and the client is configured, you can use MCP features in VS Code Copilot.

---

## Architecture

### Overview

This MCP server provides tools for managing ATLAS cohort definitions in the D2E platform, including creating, reading, updating, and deleting cohorts, as well as fetching templates from the OHDSI Phenotype Library.

### Directory Structure

```
src/
├── config/
│   └── server.config.ts           # Server configuration and constants
│
├── types/
│   └── tool-schemas.ts            # TypeScript types and Zod schemas
│
├── api/
│   └── WebAPIAPI.ts               # D2E WebAPI HTTP client
│
├── utils/
│   ├── request-helpers.ts         # Authorization and response helpers
│   └── phenotype-helpers.ts       # OHDSI Phenotype Library utilities
│
├── tools/
│   ├── cohort-management.tools.ts # CRUD operations for cohorts
│   ├── cohort-validation.tools.ts # Cohort definition validation
│   ├── cohort-instruction.tools.ts # LLM instruction tools
│   └── phenotype-library.tools.ts  # OHDSI Phenotype Library tools
│
├── prompts/
│   └── cohort.prompts.ts          # MCP prompts for formatting
│
└── services/
    └── server.ts                  # MCP server initialization
```

---

## Development Guide

### Adding New Tools

**1. Define types in `types/tool-schemas.ts`**
```typescript
export const MyToolInput = {
  param: z.string().describe("Description"),
};
```

**2. Create tool file `tools/my-domain.tools.ts`**
```typescript
import { WebAPIAPI } from "../api/WebAPIAPI";
import { createTextResponse } from "../utils/request-helpers";

const webapi = new WebAPIAPI();

export function registerMyTools(server) {
  server.registerTool("my_tool", {...}, async ({ param }) => {
    const result = await webapi.myMethod(param);
    return createTextResponse(`Success: ${result}`);
  });
}
```

**3. Register in `services/server.ts`**
```typescript
import { registerMyTools } from "../tools/my-domain.tools";
registerMyTools(server);
```

### Key Helpers

- **Auth**: `requireAuth(requestInfo)`, `requireAuthAndDataset(requestInfo)`
- **Responses**: `createTextResponse(text)`, `createStructuredResponse(text, data)`
- **Config**: `MCP_SERVER_CONFIG`, `EXTERNAL_APIS`

### Design Principles

- Tools call `WebAPIAPI` directly (no wrappers)
- All types centralized in `types/tool-schemas.ts`
- Common patterns extracted to `utils/`
- Configuration in `config/`, not hardcoded
