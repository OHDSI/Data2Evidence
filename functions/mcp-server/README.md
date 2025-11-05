## MCP Server Setup Guide

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
Provide the JWT in your MCP client config file. Example config:

```json
"d2e-mcp": {
	"url": "https://localhost:d2e-port/mcp/chat",
	"type": "http",
	"headers": {
		"Authorization": "Bearer xxx",
		"datasetId": "xyz",
		"Content-Type": "application/json",
		"Accept": "application/json, text/event-stream"
	}
},
```
Replace `d2e-port` with 443 for localhost or 41100 for development

### 3. Run the MCP Server
Start the Data2Evidence

### 4. Connect with VS Code Copilot
Once the server is running and the client is configured, you can use MCP features in VS Code Copilot.

