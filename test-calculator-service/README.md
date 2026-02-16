# D2E Calculator Plugin Demo

This is a demo project showing how to integrate an external service as a plugin into the D2E (Data2Evidence) platform. It demonstrates a simple calculator service built with Deno + Hono and connected to the D2E infrastructure.

---

## 1. Architecture

```
┌──────────────────────────────────────────────────────────────────┐
│                        Request Flow                               │
├──────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Curl                                                        │
│     │                                                            │
│     ▼                                                            │
│   https://localhost/calculator                                   │
│     │                                                            │
│     ▼                                                            │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Caddy (Port 443)                                        │   │
│   │  - TLS termination                                       │   │
│   │  - Reverse proxy → Trex gateway                          │   │
│   └──────────────────────────────────────────────────────────┘   │
│     │                                                            │
│     ▼                                                            │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Trex Gateway                                            │   │
│   │  - Auth / scope validation (calculator.read, calculator.write) │
│   │  - Routing based on SERVICE_ROUTES                        │
│   │  - /calculator → calculator:8000                         │
│   └──────────────────────────────────────────────────────────┘   │
│     │                                                            │
│     ▼                                                            │
│   ┌──────────────────────────────────────────────────────────┐   │
│   │  Calculator Service (Port 8000)                          │   │
│   │  - Deno + Hono framework                                 │   │
│   │  - GET /calculator       → "Calculator route"            │   │
│   │  - GET /calculator/add   → Returns JSON with addition of two random numbers │
│   │  - GET /calculator/health → Health check JSON response    │   │
│   └──────────────────────────────────────────────────────────┘   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

**Key Components:**

* **Caddy**: Receives external HTTPS requests, terminates TLS, and forwards to the Trex gateway.
* **Trex Gateway**: Handles authentication/authorization and proxies requests to internal services according to `SERVICE_ROUTES`.
* **Calculator Service**: Deno-based service running in a separate Docker container.

---

## 2. Project Structure

```
test-calculator-service/
├── Dockerfile
├── README.md
└── src/
    └── server.ts
```

---

## 3. Adding a New Service Plugin

You can follow this calculator demo to add a new service to D2E.

### 3.1 Build the Service Application

**Dockerfile** (`test-calculator-service/Dockerfile`)

```dockerfile
FROM denoland/deno:alpine-1.40.0

WORKDIR /app
COPY src/ ./src/

EXPOSE 8000

CMD ["deno", "run", "--allow-net", "src/server.ts"]
```

**Server Code** (`test-calculator-service/src/server.ts`)

Using the Hono framework, define routes and start the service on port 8000 using `Deno.serve(app.fetch)`.

Key endpoints:

| Method | Path                 | Description                                      |
| ------ | -------------------- | ------------------------------------------------ |
| GET    | `/calculator`        | Default route                                    |
| GET    | `/calculator/add`    | Returns JSON with addition of two random numbers |
| GET    | `/calculator/health` | Health check (`{ status, timestamp }`)           |

### 3.2 Update docker-compose.yml

**1) Add the service container**

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

**2) Add the route to Trex `SERVICE_ROUTES`**

Add a new entry to the `SERVICE_ROUTES` JSON in Trex environment variables:

```yaml
"calculator": "http://${PROJECT_NAME:-d2e}-calculator:8000"
```

### 3.3 Update functions/package.json

**1) Register the API route**

Add the service path to the `api` array:

```json
{
  "source": "/calculator",
  "service": "calculator"
}
```

**2) Assign role-based scopes**

Add the necessary scopes for roles like `ALP_SYSTEM_ADMIN` or `RESEARCHER`:

```json
"calculator.read",
"calculator.write"
```

**3) Define scope-to-path mapping**

Define HTTP method-specific access in the `scopes` array:

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

---

## 4. Testing

### Step 1: Create Files

```bash
mkdir -p test-calculator-service/src
```

Create the `Dockerfile` and `server.ts` in `test-calculator-service/src`.

### Step 2: Update Configuration Files

Modify `docker-compose.yml` and `functions/package.json` as described in sections 3.2 and 3.3.

### Step 3: Start the Service and Check

```bash
# Restart D2E
d2e stop && d2e start

# Health check
curl -k https://localhost/calculator/health
# Example response: {"status":"healthy","timestamp":"2026-02-16T12:00:00.000Z"}

# Check default route
curl -k https://localhost/calculator
```

---

## 5. Troubleshooting

| Symptom                        | Cause                                               | Solution                                          |
| ------------------------------ | --------------------------------------------------- | ------------------------------------------------- |
| 404 after changing config      | Heredoc config not regenerated on container restart | `docker compose up -d --force-recreate <service>` |
| Authentication error (403)     | token was too old       | Verify token by refresh and copy from web         |

---

