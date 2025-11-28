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

### Local Development (Bun)

**1. Configure environment variables**

Edit `ui/apps/vue-mri-ui-lib/.env`:

```bash
VUE_APP_STANDALONE_ATLAS=true  # Enable standalone Atlas mode
```

**2. Build and start mock server**

```bash
# From ui/apps/vue-mri-ui-lib directory
npm run build:mock
npm run start:mock
```

**3. Start development server**

```bash
# From ui/ directory
bun serve
```

Open `http://localhost:3131` in your browser.

## Configuration

### Environment Variables

Configuration is managed in `ui/apps/vue-mri-ui-lib/.env`:

| Variable                   | Default | Description                                       |
| -------------------------- | ------- | ------------------------------------------------- |
| `VUE_APP_STANDALONE_ATLAS` | `false` | Enable standalone Atlas mode (set `true` for dev) |
| `VUE_APP_CLIENT_ID`        | -       | Logto client ID from main d2e `.env`              |
| `VUE_APP_DATASET_ID`       | -       | Dataset UUID identifier                           |

### Mock Server Runtime Variables

Set these when starting the mock server:

| Variable     | Default                               | Description                 |
| ------------ | ------------------------------------- | --------------------------- |
| `SERVER_URL` | `http://localhost:3131`               | Server URL and port         |
| `WEBAPI_URL` | `https://atlas-demo.ohdsi.org/WebAPI` | External OHDSI WebAPI proxy |
| `SOURCE`     | `vocab`                               | Vocabulary source key       |
| `USE_CACHE`  | `true`                                | Enable response caching     |
| `DEBUG`      | `false`                               | Show debug info in UI       |

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

## Development Workflows

### Full Build Development (Recommended)

For testing the complete production-like build:

1. Set `VUE_APP_STANDALONE_ATLAS=true` in `ui/apps/vue-mri-ui-lib/.env`
2. Build mock server: `npm run build:mock`
3. Start mock server: `npm run start:mock`
4. Open `http://localhost:3131`

For vue server hot reload:

5. From `ui/` directory: `bun serve`
6. Open `https://localhost:8081`

The `build:mock` script:

- Builds vue-mri-ui-lib, ui5, portal-components, and concept-sets
- Copies built files to mock server static directory
- Installs mock server dependencies

## Features

- **WebAPI Proxy**: Routes requests to external OHDSI WebAPI instances
- **Response Caching**: Caches external API responses for faster development
- **URL Rewriting**: Automatically replaces URLs in served files and mock data with `SERVER_URL`
- **CORS Support**: Enables cross-origin requests for development
- **Bun Support**: Fast package installation and development workflow
