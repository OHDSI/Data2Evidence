# Mock Server

Mock server for query filter UI component testing.

## Quick Start

```bash
npm start
```

Server runs on `http://localhost:3001`

## Update Mock Data

**For Analytics/Static Assets:**

1. Export new HAR file from Chrome DevTools Network tab
2. Copy the entries from exported .har and append to `localhost1.har`
3. Run: `npm run parse-har`

**For WebAPI Endpoints:**

1. Add webapi network calls to `webapi.har`
2. Run: `npm run parse-har`

## Scripts

```bash
npm start          # Start mock server
npm run parse-har  # Regenerate from HAR file
```

## Files

- `server.js` - Express mock server (auto-generated)
- `mock-data.json` - Response data for mock endpoints (auto-generated)
- `parse-har.js` - HAR file processor
- `localhost1.har` - Network capture for analytics/static assets
- `webapi.har` - Network capture for WebAPI endpoints
- `extracted-endpoints.json` - Debug/analysis data (optional)

## Endpoints

**Mock Endpoints** (with real data):

- Analytics APIs: `/analytics-svc/api/*`
- Auth: `/oidc/auth`
- Static assets: `/ui/*`, `/js/*`, `/sap/*`

**WebAPI Placeholders** (logs requests, returns 501):

- WebAPI: `/d2e-webapi/*`

Mock server returns exact responses for analytics endpoints. WebAPI endpoints log requests and return placeholders until connected to real WebAPI server.
