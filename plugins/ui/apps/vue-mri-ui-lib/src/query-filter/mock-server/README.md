# PA-Atlas Mock Server

Development server for PA-Atlas (query-filter) with mock APIs and built application serving.

## Quick Start

### Using Docker (Recommended)

```bash
# Build from repo root
docker build -f ui/Dockerfile.mock-server -t pa-atlas:latest .

# Run
docker run -e WEBAPI_URL="https://atlas-demo.ohdsi.org/WebAPI" -e SOURCE="SYNPUF1K" -p 3131:3131 pa-atlas:latest
```

Open `http://localhost:3131` in your browser.

### Using NPM

```bash
# From repo root: install dependencies
cd ui && yarn

# Build and start
cd apps/vue-mri-ui-lib
npm run build:mock
npm run start:mock
```

Open `http://localhost:3131` in your browser.

### Environment Variables

| Variable     | Default                                                       | Description                 |
| ------------ | ------------------------------------------------------------- | --------------------------- |
| `SERVER_URL` | `http://localhost:3131`                                       | Server URL and port         |
| `WEBAPI_URL` | `http://alp-dev-sg-3.southeastasia.cloudapp.azure.com/WebAPI` | External OHDSI WebAPI proxy |
| `SOURCE`     | `vocab`                                                       | Vocabulary source key       |
| `USE_CACHE`  | `true`                                                        | Enable response caching     |
| `DEBUG`      | `false`                                                       | Show debug info in UI       |

**Examples**:

```bash
WEBAPI_URL='https://atlas-demo.ohdsi.org/WebAPI' SOURCE='SYNPUF1K' npm run start:mock
```

## Architecture

**Development Mode** (with hot-reload):

```
Browser (8081) → Vue CLI Dev Server → Proxy → Mock Server (3001) → External WebAPI
```

**Production Mode** (built):

```
Browser (3131) → Mock Server → External WebAPI
                 ├─ Built UI assets
                 └─ API endpoints
```

## Development Modes

### Hot-Reload Development

For active development with hot-reload:

1. **Configure**: Set `USE_MOCK_SERVER = true` in `public/authenticate.js`
2. **Set proxy**: In `vue.config.js`, set `target: 'http://localhost:3001'`
3. **Start mock server**:
   ```bash
   cd src/query-filter/mock-server && npm install && npm start
   ```
4. **Start dev server**: `nx serve vue-mri` (port 8081)

### Built Application

Serves both UI and APIs from single server (port 3131):

```bash
npm run build:mock
npm run start:mock
```

The `build:mock` script builds the Vue app and copies built files to the mock server directory.

## Features

- **WebAPI Proxy**: Routes requests to external OHDSI WebAPI instances
- **Response Caching**: Caches external API responses for faster development
- **URL Rewriting**: Automatically replaces URLs in served files and mock data with `SERVER_URL`
- **CORS Support**: Enables cross-origin requests for development
