# Mock Server

Mock server for query filter UI component testing.

## Quick Start

```bash
npm start
```

Server runs on `http://localhost:3001`

## Update Mock Data

1. Export new HAR file from Chrome DevTools Network tab
2. Export .har from chrome devtools
3. Copy the entries from exported .har and append it to the entries section in `localhost1.har`
4. Run: `npm run parse-har`

## Scripts

```bash
npm start          # Start mock server
npm run parse-har  # Regenerate from HAR file
```

## Files

- `server.js` - Express mock server (auto-generated)
- `mock-data.json` - Response data (auto-generated)
- `parse-har.js` - HAR file processor
- `localhost1.har` - Network capture from Chrome
- `extracted-endpoints.json` - Debug/analysis data (optional)

## Endpoints

- Analytics APIs: `/analytics-svc/api/*`
- Auth: `/oidc/auth`
- Static assets: `/ui/*`, `/js/*`, `/sap/*`

Mock server returns exact responses captured from your browser network traffic.
