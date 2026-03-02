# D2E Calculator Plugin Demo — Deno Service Plugin Integration Example

This project demonstrates how to integrate an **external service** as a plugin into the D2E (Data2Evidence) platform. A simple calculator web app built with **Deno + Hono** is used as an example to document the integration pattern.

This is the first of two calculator demos. For the Python (FastAPI) version, see the [Python Calculator Service README](../test-python-calculator-service/README.md).

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Request Flow                              │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   curl / Browser                                                 │
│     │                                                            │
│     ▼                                                            │
│   https://localhost:41100/calculator                              │
│     │                                                            │
│     ▼                                                            │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Caddy (Port 443 / 41100 in local dev)                   │   │
│   │  - TLS termination                                       │   │
│   │  - Reverse proxy → Trex gateway                          │   │
│   └──────────────────────────────────────────────────────────┘   │
│     │                                                            │
│     ▼                                                            │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Trex Gateway                                            │   │
│   │  - Authentication & scope validation                     │   │
│   │    (calculator.read, calculator.write)                    │   │
│   │  - Routing via SERVICE_ROUTES                            │   │
│   │  - /calculator → calculator:8000                         │   │
│   └──────────────────────────────────────────────────────────┘   │
│     │                                                            │
│     ▼                                                            │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Calculator Service (Port 8000)                          │   │
│   │  - Deno 1.40 + Hono framework                            │   │
│   │  - GET /calculator       → base route                    │   │
│   │  - GET /calculator/add   → addition endpoint             │   │
│   │  - GET /calculator/health → health check                 │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key Components:**

- **Caddy**: Receives external HTTPS requests, terminates TLS, and forwards everything to the Trex gateway.
- **Trex Gateway**: Handles authentication/authorization (via scopes defined in `functions/package.json`) and proxies requests to internal services according to `SERVICE_ROUTES`.
- **Calculator Service**: A standalone Deno application running in its own Docker container on port 8000.

---

## 2. What Was Built

### 2.1 Project Structure

```
test-calculator-service/
├── Dockerfile
├── README.md
└── src/
    └── server.ts
```

### 2.2 Service Application

**`src/server.ts`** — A minimal Hono application with three endpoints:

| Method | Path                 | Description                                      |
|--------|----------------------|--------------------------------------------------|
| GET    | `/calculator`        | Base route, returns `"Calculator route"`         |
| GET    | `/calculator/add`    | Returns JSON with addition of two random numbers |
| GET    | `/calculator/health` | Health check (`{ status, timestamp }`)           |

```typescript
import { Hono } from "https://deno.land/x/hono@v4.0.0/mod.ts";

const app = new Hono();

app.get("/calculator", (c) => c.text("Calculator route"));

app.get("/calculator/health", (c) => {
  return c.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/calculator/add", (c) => {
  const a = Math.floor(Math.random() * 100);
  const b = Math.floor(Math.random() * 100);
  return c.json({ a, b, result: a + b });
});

Deno.serve(app.fetch);
```

**`Dockerfile`**

```dockerfile
FROM denoland/deno:alpine-1.40.0

WORKDIR /app
COPY src/ ./src/

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "src/server.ts"]
```

---

## 3. What Was Modified

Three existing files were modified to integrate the calculator service into D2E.

### 3.1 `docker-compose.yml` — 2 changes

**Change 1: Added `SERVICE_ROUTES` entry for Trex**

In the `trex` service's `SERVICE_ROUTES` environment variable, a new entry was added so Trex knows how to reach the calculator service:

```yaml
"calculator": "http://${PROJECT_NAME:-d2e}-calculator:8000"
```

> ⚠️ **Important:** The `SERVICE_ROUTES` value is a JSON object embedded in YAML heredoc (`|-`). Every entry except the last must end with a comma. A missing comma causes a `SyntaxError` that crashes Trex on startup.

**Change 2: Added the service container definition**

```yaml
calculator:
  build:
    context: ./test-calculator-service
  image: d2e-calculator:latest
  container_name: ${PROJECT_NAME:-d2e}-calculator
  networks:
    alp:
      priority: 20
  restart: ${DOCKER__RESTART_POLICY:-unless-stopped}
  healthcheck:
    test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://0.0.0.0:8000/calculator"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 10s
```

### 3.2 `functions/package.json` — 3 changes

**Change 1: Registered the API route** in `trex.functions.api`:

```json
{
  "source": "/calculator",
  "service": "calculator"
}
```

This tells Trex to treat `/calculator` as a **service** route (proxied to an external container) rather than a **function** route (executed within Trex itself).

**Change 2: Assigned role-based scopes** in `trex.functions.roles`:

Added to both `ALP_SYSTEM_ADMIN` and `RESEARCHER` roles:
```json
"calculator.read",
"calculator.write"
```

**Change 3: Defined scope-to-path mappings** in `trex.functions.scopes`:

```json
{
  "path": "^/calculator/(.*)",
  "scopes": ["calculator.read"],
  "httpMethods": ["GET"]
},
{
  "path": "^/calculator",
  "scopes": ["calculator.read"],
  "httpMethods": ["GET"]
}
```

> **Note:** Two scope entries are needed — one for sub-paths (`/calculator/health`, `/calculator/add`) and one for the base path (`/calculator`). Without the base path entry, requests to `/calculator` will fail with a 403.

---

## 4. How to Run & Test

### 4.1 Prerequisites

- D2E development environment set up and previously running via `npm start`
- Docker installed and running

### 4.2 Starting the Service

```bash
# Full restart
npm stop
npm start

# Or restart only trex after config changes
npm start -- --services trex
```

> ⚠️ **Do NOT use `d2e stop && d2e start`.** In the local development setup, always use `npm stop` / `npm start` which internally runs `docker compose` with the correct `docker-compose-local.yml` overlay and dev port (41100).

### 4.3 Verifying the Service is Running

```bash
# Check that the calculator container is up and healthy
docker ps | grep calculator

# Check trex logs for any errors
docker logs d2e-trex --tail 50
```

### 4.4 Testing the Endpoints

All requests go through the Trex gateway, which requires authentication. Use a valid bearer token obtained from the D2E web UI.

```bash
# Set your token
TOKEN="<your-bearer-token>"

# Health check
curl -k -X GET "https://localhost:41100/calculator/health" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"status":"healthy","timestamp":"2026-03-02T12:00:00.000Z"}

# Base route
curl -k -X GET "https://localhost:41100/calculator" \
  -H "Authorization: Bearer $TOKEN"
# Expected: Calculator route

# Addition endpoint
curl -k -X GET "https://localhost:41100/calculator/add" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"a":42,"b":17,"result":59}
```

---

## 5. Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| **Trex unhealthy / crashes on startup** | `SERVICE_ROUTES` JSON syntax error (usually a missing comma) | Check `docker logs d2e-trex --tail 50` for `SyntaxError: Expected ',' or '}'`. Fix the comma in `docker-compose.yml`. |
| **Trex unhealthy** | `functions/package.json` JSON syntax error | Run `python3 -c "import json; json.load(open('functions/package.json'))"` to validate. |
| **404 Not Found** | Route not registered in `functions/package.json` `api` array | Add the `{"source": "/calculator", "service": "calculator"}` entry. |
| **403 Forbidden** | Scopes not assigned to the user's role | Add `calculator.read` and `calculator.write` to the relevant roles in `functions/package.json`. |
| **502 Bad Gateway** | Calculator container not running or not on the `alp` network | Run `docker ps \| grep calculator` and check `docker logs d2e-calculator`. |
| **Config not applied after changes** | Container was restarted but not recreated (heredoc config baked at creation time) | Use `npm start -- --services trex` (which uses `--force-recreate`) instead of `docker restart`. |
| **Token expired (401/403)** | Bearer token has expired | Refresh the token from the D2E web UI and retry. |

---

## 6. How Trex Routes Services Internally

Understanding how Trex processes a service request helps with debugging:

1. **`functions/package.json` → `api` array**: Trex reads the `api` list at startup. Entries with `"service"` (not `"function"`) are registered via `_addService()`, which sets up a catch-all route with `authn` and `authz` middleware.

2. **`SERVICE_ROUTES` → URL mapping**: When a request hits the registered path, Trex looks up the service name in `env.SERVICE_ROUTES` to get the target URL (e.g., `"calculator"` → `"http://d2e-calculator:8000"`).

3. **`scopes` array → authorization**: Before proxying, the `authz` middleware checks whether the user's token includes the required scopes for the matched path and HTTP method.

4. **Proxy**: The request is forwarded to the target container with original headers plus `x-source-origin`.

```
Request → authn → authz (scopes check) → fetch(SERVICE_ROUTES[service] + path) → Response
```
