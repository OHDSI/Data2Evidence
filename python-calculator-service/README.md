# D2E Python Calculator Service Plugin Demo

This project demonstrates how to integrate an **external Python-based service** as a plugin into the D2E (Data2Evidence) platform. It follows the same integration pattern established by the existing [Calculator Plugin Demo (PR #1745)](https://github.com/OHDSI/Data2Evidence/pull/1745), but replaces the Deno/Hono stack with **Python + FastAPI + Uvicorn**.

The goal is to prove that non-TypeScript services can be seamlessly added to the D2E infrastructure using the **Service Plugin** approach — going through Caddy → Trex Gateway → external container.

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
│   https://localhost:41100/python-calculator                       │
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
│   │    (python-calculator.read, python-calculator.write)      │   │
│   │  - Routing via SERVICE_ROUTES                            │   │
│   │  - /python-calculator → python-calculator:8001           │   │
│   └──────────────────────────────────────────────────────────┘   │
│     │                                                            │
│     ▼                                                            │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Python Calculator Service (Port 8001)                   │   │
│   │  - Python 3.12 + FastAPI + Uvicorn                       │   │
│   │  - GET /python-calculator       → base route             │   │
│   │  - GET /python-calculator/add   → addition endpoint      │   │
│   │  - GET /python-calculator/health → health check          │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key Components:**

- **Caddy**: Receives external HTTPS requests, terminates TLS, and forwards everything to the Trex gateway.
- **Trex Gateway**: Handles authentication/authorization (via scopes defined in `functions/package.json`) and proxies requests to internal services according to `SERVICE_ROUTES`.
- **Python Calculator Service**: A standalone FastAPI application running in its own Docker container on port 8001.

---

## 2. What Was Built

### 2.1 Project Structure

```
test-python-calculator-service/
├── Dockerfile
├── requirements.txt
└── src/
    └── server.py
```

### 2.2 Service Application

**`requirements.txt`**
```
fastapi==0.115.0
uvicorn==0.30.0
```

**`src/server.py`** — A minimal FastAPI application with three endpoints:

| Method | Path                        | Description                              |
|--------|-----------------------------|------------------------------------------|
| GET    | `/python-calculator`        | Base route, returns a welcome message    |
| GET    | `/python-calculator/add`    | Returns JSON with addition of two random numbers |
| GET    | `/python-calculator/health` | Health check (`{ status, timestamp }`)   |

**`Dockerfile`**
```dockerfile
FROM python:3.12-slim

WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY src/ ./src/

EXPOSE 8001

CMD ["uvicorn", "src.server:app", "--host", "0.0.0.0", "--port", "8001"]
```

---

## 3. What Was Modified

Three existing files were modified to integrate the Python service into D2E.

### 3.1 `docker-compose.yml` — 2 changes

**Change 1: Added `SERVICE_ROUTES` entry for Trex**

In the `trex` service's `SERVICE_ROUTES` environment variable, a new entry was added so Trex knows how to reach the Python service:

```yaml
"python-calculator": "http://${PROJECT_NAME:-d2e}-python-calculator:8001"
```

> ⚠️ **Important:** Make sure the preceding entry (e.g. `"calculator": "..."`) ends with a comma. A missing comma here causes a JSON parse error that crashes Trex on startup.

**Change 2: Added the service container definition**

```yaml
python-calculator:
  build:
    context: ./test-python-calculator-service
  image: d2e-python-calculator:latest
  container_name: ${PROJECT_NAME:-d2e}-python-calculator
  networks:
    alp:
      priority: 20
  restart: ${DOCKER__RESTART_POLICY:-unless-stopped}
  healthcheck:
    test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://0.0.0.0:8001/python-calculator/health')"]
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 10s
```

### 3.2 `functions/package.json` — 3 changes

**Change 1: Registered the API route** in `trex.functions.api`:

```json
{
  "source": "/python-calculator",
  "service": "python-calculator"
}
```

**Change 2: Assigned role-based scopes** in `trex.functions.roles`:

Added to both `ALP_SYSTEM_ADMIN` and `RESEARCHER` roles:
```json
"python-calculator.read",
"python-calculator.write"
```

**Change 3: Defined scope-to-path mappings** in `trex.functions.scopes`:

```json
{
  "path": "^/python-calculator/(.*)",
  "scopes": ["python-calculator.read", "python-calculator.write"],
  "httpMethods": ["GET", "POST"]
},
{
  "path": "^/python-calculator",
  "scopes": ["python-calculator.read"],
  "httpMethods": ["GET"]
}
```

> **Note:** Two scope entries are needed — one for sub-paths (`/python-calculator/health`, `/python-calculator/add`) and one for the base path (`/python-calculator`).

---

## 4. How to Run & Test

### 4.1 Prerequisites

- D2E development environment set up and previously running via `npm start`
- Docker installed and running

### 4.2 Starting the Service

```bash
# If D2E is already running, restart only the affected services:
npm stop
npm start

# Or restart only trex after config changes:
npm start -- --services trex
```

> ⚠️ **Do NOT use `d2e stop && d2e start`.** In the local development setup, always use `npm stop` / `npm start` which internally runs `docker compose` with the correct `docker-compose-local.yml` overlay and dev port (41100).

### 4.3 Verifying the Service is Running

```bash
# Check that the python-calculator container is up and healthy
docker ps | grep python-calculator

# Check trex logs for any errors
docker logs d2e-trex --tail 50
```

### 4.4 Testing the Endpoints

All requests go through the Trex gateway, which requires authentication. Use a valid bearer token obtained from the D2E web UI.

```bash
# Set your token
TOKEN="<your-bearer-token>"

# Health check
curl -k -X GET "https://localhost:41100/python-calculator/health" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"status":"healthy","timestamp":"2026-03-02T12:00:00.000000"}

# Base route
curl -k -X GET "https://localhost:41100/python-calculator" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"message":"Python Calculator route"}

# Addition endpoint
curl -k -X GET "https://localhost:41100/python-calculator/add" \
  -H "Authorization: Bearer $TOKEN"
# Expected: {"a":42,"b":17,"result":59}
```

---

## 5. Troubleshooting

| Symptom | Cause | Solution |
|---------|-------|----------|
| **Trex unhealthy / crashes on startup** | `SERVICE_ROUTES` JSON syntax error (usually a missing comma) | Check `docker logs d2e-trex --tail 50` for `SyntaxError: Expected ',' or '}'`. Fix the comma in `docker-compose.yml`. |
| **Trex unhealthy** | `functions/package.json` JSON syntax error | Run `python3 -c "import json; json.load(open('functions/package.json'))"` to validate. |
| **404 Not Found** | Route not registered in `functions/package.json` `api` array | Add the `{"source": "/python-calculator", "service": "python-calculator"}` entry. |
| **403 Forbidden** | Scopes not assigned to the user's role | Add `python-calculator.read` and `python-calculator.write` to the relevant roles in `functions/package.json`. |
| **502 Bad Gateway** | Python service container not running or not on the `alp` network | Run `docker ps \| grep python-calculator` and check `docker logs d2e-python-calculator`. |
| **Config not applied after changes** | Container was restarted but not recreated | Use `npm start -- --services trex` (which uses `--force-recreate`) instead of `docker restart`. |
| **Token expired (401/403)** | Bearer token has expired | Refresh the token from the D2E web UI and retry. |

---

## 6. Comparison with the Deno Calculator

| Aspect | Deno Calculator (PR #1745) | Python Calculator (this project) |
|--------|---------------------------|----------------------------------|
| Language | TypeScript (Deno) | Python 3.12 |
| Framework | Hono | FastAPI |
| Runtime | Deno 1.40 | Uvicorn (ASGI) |
| Container Port | 8000 | 8001 |
| Base Image | `denoland/deno:alpine-1.40.0` | `python:3.12-slim` |
| Route Prefix | `/calculator` | `/python-calculator` |
| Integration Pattern | Service Plugin (same) | Service Plugin (same) |

Both services follow the exact same D2E integration pattern: Docker container → `SERVICE_ROUTES` → `functions/package.json` (api + roles + scopes). The only differences are the language/framework used and the route prefix.

---

## 7. Key Takeaways

1. **D2E's Service Plugin pattern is language-agnostic.** Any HTTP server that runs in a Docker container can be integrated — Python, Go, Java, Rust, etc.
2. **Never bypass Caddy/Trex by adding paths directly to the Caddyfile.** Always register routes through `functions/package.json` to use D2E's built-in auth framework.
3. **The `SERVICE_ROUTES` JSON in `docker-compose.yml` is extremely sensitive to syntax errors.** A single missing comma will crash Trex. Always validate carefully.
4. **Two scope entries are needed per service** — one for the base path and one for sub-paths — to ensure both `/python-calculator` and `/python-calculator/*` are authorized.
5. **Use `npm start` / `npm stop` for local development**, never `d2e start` / `d2e stop`.