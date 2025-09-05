# PA-Atlas Mock Server

This mock server provides a development environment for PA-Atlas (query-filter) with mock API endpoints and the ability to serve the built application.

## Quick Start

```bash
# Build and bundle the application
npm run build:mock

# Start the server
cd src/query-filter/mock-server
node server.js
```

Then open `http://localhost:3001` in your browser.

## Architecture Overview

### Development Mode Routing

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────────┐    ┌─────────────────┐
│   Browser       │    │  Vue CLI Dev     │    │  Mock Server        │    │  Demo Atlas     │
│   localhost:8081│◄──►│  Server          │◄──►│  localhost:3001     │◄──►│  Instance       │
│                 │    │  (Hot Reload)    │    │  (API Endpoints)    │    │                 │
│   - Vue App     │    │  - Serves UI     │    │  - Mock APIs        │    │  - Live Atlas   │
│   - Dev Tools   │    │  - Proxy API     │    │  - CORS Headers     │    │  - WebAPI       │
│   - Hot Reload  │    │  - Source Maps   │    │  - Proxy to Atlas   │    │  - Real Data    │
└─────────────────┘    └──────────────────┘    └─────────────────────┘    └─────────────────┘
                              │                         │
                              └─── Proxy Config ───────┘
                              target: 'http://localhost:3001'
```

### Built/Production Mode Routing

```
┌─────────────────────────────────────────────────────────────────────┐    ┌─────────────────┐
│                        Mock Server (localhost:3001)                 │    │  Demo Atlas     │
│                                                                     │◄──►│  Instance       │
│  ┌─────────────────┐              ┌──────────────────────────────┐  │    │                 │
│  │  Static Files   │              │       API Routes             │  │    │  - Live Atlas   │
│  │                 │              │                              │  │    │  - WebAPI       │
│  │  - Built UI     │              │  - Mock APIs                 │  │    │  - Real Data    │
│  │  - Assets       │              │  - Data Responses            │  │    │                 │
│  │  - Index HTML   │              │  - Proxy to Atlas            │  │    │                 │
│  └─────────────────┘              └──────────────────────────────┘  │    │                 │
│           │                                      │                  │    │                 │
│           └──────── Single Express Server ───────┘                  │    │                 │
└─────────────────────────────────────────────────────────────────────┘    └─────────────────┘
```

### Request Flow Comparison

```
Development Flow:
Browser → Vue CLI Dev Server → Proxy → Mock Server → Response
  │              │                        │
  │              ├─ UI Assets (hot)       ├─ API Data (mock)
  │              └─ Source Maps           └─ CORS Headers

Production Flow:
Browser → Mock Server → Response
             │
             ├─ UI Assets (built)
             └─ API Data (mock)
```

## Development Setup

For active development with hot-reload and Vue CLI dev tools:

1. **Configure authentication**:

   - Set `USE_MOCK_SERVER = true` in `public/authenticate.js`

2. **Configure single-spa wrapper** (optional):

   - Set `isLocal: true` in `public/index.html` to disable single-spa wrapper
   - Set `isLocal: false` to use single-spa wrapper

3. **Start the Vue CLI dev server**:

   First change the vue proxy in vue.config.js

   ```bash
   target: 'http://localhost:3001'
   ```

   ```bash

   nx serve vue-mri
   ```

4. **Start the mock server** (in a separate terminal):
   ```bash
   cd src/query-filter/mock-server
   npm start
   ```

This setup allows you to develop with Vue CLI's hot-reload while the mock server provides API endpoints on port 3001.

## Mock Server Only

To run just the mock server for API testing:

```bash
cd src/query-filter/mock-server
npm start
```

The mock server will start on port 3001 and provide mock API endpoints.

## Combined Build Setup

For a production-like bundle that serves both the application and APIs from a single server:

1. **Build and bundle the application**:

   ```bash
   npm run build:mock
   ```

   This command:

   - Builds the Vue application (`npm run build`)
   - Copies built files to the mock server directory
   - Copies `authenticate.js` with necessary modifications

2. **Start the bundled server**:

   ```bash
   cd src/query-filter/mock-server
   node server.js

   # or with url specified (3001 by default)
   SERVER_URL=http://localhost:3131 node server.js
   ```

3. **Access the application**:
   - Open your browser to `http://localhost:3131`
   - The server will serve both the application and API endpoints

## Configuration Options

### Environment Variables

- **`SERVER_URL`** (default: `https://localhost:3001`)

  - Sets the base URL for the server
  - Automatically extracts the port number for the server
  - Used for URL replacement in mock data and served files

- **`PORT`** (optional)
  - Overrides the port extracted from SERVER_URL
  - Only use if you need a different port than what's in SERVER_URL

## File Modifications

The mock server automatically modifies certain files when serving:

### `authenticate.js`

- Replaces `const USE_MOCK_SERVER = false` with `const USE_MOCK_SERVER = true`
- Replaces `https://localhost:8081` with the current `SERVER_URL`

### `index.html`

- Replaces `https://localhost:8081` with the current `SERVER_URL`

### Mock Data

- All mock API responses have URLs replaced dynamically
- `https://localhost:8081` is replaced with the current `SERVER_URL`
