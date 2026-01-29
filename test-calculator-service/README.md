# D2E Calculator Plugin test

## 1. architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Request Flow                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   Browser                                                        │
│      │                                                           │
│      ▼                                                           │
│   https://localhost/calculator                                   │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────────────────────────────────────────────┐       │
│   │  Caddy (Port 443)                                    │       │
│   │  - TLS termination                                   │       │
│   │  - @calculator matcher: path /calculator*            │       │
│   │  - uri strip_prefix /calculator                      │       │
│   │  - reverse_proxy → calculator:8080                   │       │
│   └─────────────────────────────────────────────────────┘       │
│      │                                                           │
│      ▼                                                           │
│   ┌─────────────────────────────────────────────────────┐       │
│   │  Calculator Service (Port 8080)                      │       │
│   │  - Deno + Oak framework                              │       │
│   │  - GET / → HTML calculator UI                        │       │
│   │  - GET /health → {"status":"ok"}                     │       │
│   └─────────────────────────────────────────────────────┘       │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

- **Caddy**: get outside HTTPS request and routes into inside service
- **Calculator Service**: seperate Docker container deno server

---

## 2. how to make new service

### 2.1 Calculator Service 

**test-calculator-service/Dockerfile**
```dockerfile
FROM denoland/deno:alpine-1.40.0
WORKDIR /app
COPY src/ ./src/
EXPOSE 8080
CMD ["run", "--allow-net", "--allow-env", "src/server.ts"]
```

**test-calculator-service/src/server.ts**

### 2.2 docker-compose.yml fix

**1) add Calculator service**
```yaml
  calculator:
    build:
      context: ./test-calculator-service
    container_name: ${PROJECT_NAME:-d2e}-calculator
    networks:
      alp:
        priority: 20
    restart: ${DOCKER__RESTART_POLICY:-unless-stopped}
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:8080/health"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 10s
```

**2) Trex SERVICE_ROUTES** 
```yaml
        "calculator": "http://${PROJECT_NAME:-d2e}-calculator:8080"
```

**3) Caddy (portal) snippet** 
```yaml
          @calculator {
            path /calculator*
          }
          handle @calculator {
            uri strip_prefix /calculator
            reverse_proxy http://${PROJECT_NAME:-d2e}-calculator:8080
          }
```

---

## 3. troublesohotings

| what happened | why it happened | how to fix |
|------|------|------|
| Caddy setting changed but still getting 404 | container restart was not recreating command heredoc | `docker compose up -d --force-recreate alp-caddy` |
| Calculator container `unhealthy` | Alpine img was without wget  | ignore |

---

## 4. how to test

### Step 1: create file
```bash
mkdir -p test-calculator-service/src
```

create `test-calculator-service/Dockerfile` and `test-calculator-service/src/server.ts` 

### Step 2: docker-compose.yml fix

### Step 3: test
```bash

d2e stop && d2e start

curl -k https://localhost/calculator/health
open https://localhost/calculator/
```
