# AGENTS.md

## Overview

Infrastructure services providing core platform capabilities: API gateway, workflow orchestration, database management, and authentication.

## Services

| Service | Technology | Purpose |
|---------|------------|---------|
| **trex** | Rust + Deno | API gateway, runtime engine (port 41111) |
| **alp-dataflow** | Python/Prefect | Workflow orchestration |
| **cachedb** | DuckDB | Analytics cache with CDC replication |
| **alp-logto** | Docker | OpenID Connect identity provider |
| **alp-pg-management** | Node.js | PostgreSQL schema management |
| **enterprise-gateway** | Python | Jupyter kernel gateway |

## Trex (Core Gateway)

Central API gateway routing all requests on port 41111.

**Features:**
- PostgreSQL wire protocol support
- DuckDB backend for analytics
- CDC (Change Data Capture) replication
- Service routing and load balancing
- TypeScript/JavaScript execution via Deno V8

**Configuration:** Defined in `functions/package.json` under `trex` section.

## alp-dataflow (Prefect)

Python workflow orchestration using Prefect.

**Features:**
- Flow execution and scheduling
- Task dependency management
- Flow run monitoring
- API for job management

## cachedb (DuckDB)

Analytics database with real-time replication from PostgreSQL.

**Features:**
- Columnar storage for fast analytics
- CDC replication from PostgreSQL
- In-memory query execution
- Parquet file support

## alp-logto (Authentication)

OpenID Connect identity provider.

**Features:**
- User authentication
- SSO integration
- Token management
- Multi-tenant support

## Commands

```bash
# View service logs (from d2e root)
npm run logs

# Check running services
npm run ps

# Start/stop services
npm run start
npm run stop
```

## Configuration

Services are configured via environment variables in `.env.local`:

```bash
# Trex
RUST_LOG=info

# Database
PG_ADMIN_PASSWORD=...
PG_SUPER_PASSWORD=...

# Logto
LOGTO_API_M2M_CLIENT_SECRET=...

# Redis
REDIS_PASSWORD=...
```

## Docker Compose

Services defined in `docker-compose-local.yml`:
- Port mappings
- Volume mounts
- Environment variables
- Health checks
- Dependencies

## Important Files

- `../docker-compose-local.yml` - Service orchestration
- `../deploy/caddy-config/Caddyfile` - Reverse proxy
- `../functions/package.json` - Trex routing config
