# CLAUDE.md

## Rules

- **Never commit anything** — do not run `git commit` or any git command that creates a commit. Staging is allowed (`git add`, `git mv`, `git rm`); leave the staged changes for the human to commit.
- **Never push to GitHub** — do not run `git push` or create pull requests.
- **Never post to GitHub** — do not create issues, comments, releases, or any other GitHub interactions.
- **Production-code-level comments only** — only add a comment if it would survive a senior code review. No conversation context, no rationale rehashing what the diff already shows, no "why we picked this value" essays, no chat summaries embedded as comments. If the WHY isn't a hidden constraint or non-obvious invariant, don't write it. Default to no comment.

---

## Project Overview

**Data2Evidence (D2E)** is an end-to-end, open-source platform for medical research data management, analysis, and integration. Part of the [OHDSI](https://www.ohdsi.org/) ecosystem. Licensed under Apache 2.0.

Key capabilities:
- Interactive dataset exploration with visual interfaces
- Visual cohort creation without coding (Patient Analytics)
- Integrated OHDSI solutions (Achilles, Data Quality Dashboard, ATLAS)
- Data ingestion, ETL, and ongoing data governance
- Research analysis with notebooks, statistical analysis, and visualization
- FHIR server support for healthcare data standards

**Version:** 0.13.0 (Beta — breaking changes possible)

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend/API** | TypeScript, Deno, Trex (Rust/Wasm runtime) |
| **Frontend** | Vue.js 3, NX monorepo, SAP UI5 (legacy), Starboard (notebooks) |
| **ETL/Flows** | Python (Prefect), R (HADES packages) |
| **Databases** | PostgreSQL (primary), Redis (cache), MinIO (objects), SAP HANA (optional) |
| **Auth** | Logto (identity provider), RBAC |
| **Proxy** | Caddy (HTTPS reverse proxy) |
| **Build** | NX, Bun, Yarn, npm, TypeScript compiler, @trex/cli |
| **Testing** | Mocha, Chai, Sinon, Playwright (E2E) |
| **CI/CD** | GitHub Actions |
| **Containers** | Docker, Docker Compose |
| **Registry** | `ghcr.io/ohdsi/` |

---

## Repository Structure

```
d2e/
├── services/           # Core backend microservices
├── scripts/            # CLI tooling, setup, and deployment scripts
├── plugins/            # All plugins:
│   ├── functions/      #   Deno-based serverless functions (~36 packages)
│   ├── fhir_functions/ #   FHIR-specific API functions
│   ├── atlas/          #   Atlas UI plugin
│   ├── chat_functions/ #   Chat assistant functions
│   ├── flows/          #   Python/R/Prefect ETL flows
│   └── ui/             #   Frontend apps (Vue.js + NX monorepo)
├── tests/              # Integration, E2E, and performance tests
├── internal/           # Internal utilities and configurations
├── cache/              # Cache management utilities
├── .github/            # CI/CD workflows
├── docker-compose.yml          # Production orchestration (~35 services)
├── docker-compose-local.yml    # Local development compose
├── package.json                # Root npm config / D2E CLI
└── env-vars.md                 # Environment variable reference
```

---

## Services (`/services/`)

| Service | Purpose |
|---------|---------|
| `trex` | Main API server, Deno function executor, SQL gateway (ports 33000/33001/5433) |
| `alp-logto` | Identity provider |
| `alp-pg-management` | PostgreSQL management & initialization |
| `alp-dataflow-gen-worker` | Dataflow generation worker (Python) |
| `enterprise-gateway` | Jupyter kernel gateway for notebooks |
| `auth-proxy` | Authentication proxy |
| `supabase-storage` | File/blob storage |

**Plugin bundling.** Plugins are bundled into the `d2e-trex` image at build time (CI's `build_plugins` matrix → `plugin-artifacts/` → `/usr/src/bundled-plugins/`). At startup trex discovers them from `PLUGINS_DEV_PATH` (colon-separated; bind mounts override bundled). The Plugins setup menu is hidden by default and gated by the `trexPlugins` feature flag.

---

## Functions (`/plugins/functions/`)

Key Deno-based microservices (registered in `plugins/functions/package.json`):

- `dataset` — Dataset management
- `analytics-svc` — Patient Analytics calculations
- `cdw-svc` — Common Data Warehouse management
- `query-gen-svc` — SQL query generation
- `concept-mapping` — Medical concept mapping
- `data-mapping` — ETL data mapping
- `portal` — Portal API
- `strategus-analysis` — Statistical analysis framework
- `alp-usermgmt` — User management
- `jobplugins` — Job execution plugins
- `code-suggestion` — AI code suggestions
- `mcp-server` — Model Context Protocol server

---

## Frontend (`/plugins/ui/`)

NX monorepo managed with Bun/Yarn.

**Apps:**
- `portal/` — Main researcher portal (Vue 3)
- `vue-mri-ui-lib/` — Patient Analytics UI
- `analysis-ui/` — Analysis workflow UI
- `flow/` — ETL flow builder UI
- `concept-sets/` — Concept set management
- `concept-mapping/` — Data element mapping UI
- `notebook-ui/` — Notebook/Starboard integration
- `jobs/` — Job queue viewer

**Libraries:**
- `portal-components/` — Shared UI components
- `portal-plugin/` — Plugin framework

---

## Flows / ETL (`/plugins/flows/`)

Python-based Prefect workflows:

- `base/` — Core ETL flows (OHDSI/CDM)
- `hades/` — HADES statistical package workflows
- `data_transformation/` — Custom data transformations
- `data_management/` — Data governance
- `search_embedding/` — Semantic search embedding generation
- `i2b2/` — i2b2 format support

See [`plugins/flows/README.md`](plugins/flows/README.md) for setup.

---

## Architecture

```
Presentation:  Vue.js apps (portal, analytics, notebooks) → Caddy (HTTPS)
API Gateway:   Trex → routes to Deno function services
Services:      ~39 Deno microservices (analytics, CDW, queries, etc.)
Data:          PostgreSQL | Redis | MinIO | (optional SAP HANA)
Processing:    Prefect workflows (ETL, batch jobs, HADES analysis)
Auth:          Logto → RBAC
```

**Key patterns:**
- Plugin architecture — services/UIs register as plugins with Trex
- Gateway pattern — Trex acts as API gateway for all functions
- Schema-based multi-tenancy — multiple studies/datasets per instance
- Database-agnostic — supports PostgreSQL and SAP HANA via ODBC

---

## Development

### CLI Commands

```bash
npm i -g d2e              # Install CLI globally
d2e init                  # Generate .env with secrets/certs
d2e -e start              # Start all services
d2e -e stop               # Stop services
d2e -e pull               # Pull latest images
d2e setupdemo             # Load demo CDM data
d2e status                # Show running services
d2e logs                  # View container logs
```

### Local Development

```bash
npm run local start       # Uses docker-compose-local.yml (mounts source, enables debugging)
```

### UI Build

```bash
cd plugins/ui
yarn install
nx run-many --targets=build
yarn build-all            # Complete build (NX + UI5 + Starboard)
```

### Local Development Ports

| Service | Port |
|---------|------|
| Portal | https://localhost:41100 |
| Trex (TLS) | https://localhost:33000 |
| Trex (API) | https://localhost:33001 |
| SQL Gateway | localhost:5433 |
| Prefect | http://localhost:41120 |
| Jupyter | https://localhost:41125/jupyter |
| PostgreSQL | localhost:5432 |
| Redis | localhost:6379 |
| Node Inspector | localhost:9229 |

---

## Testing

```bash
npm run inittestdb        # Initialize test database
npm test                  # Run backend integration tests
npm run removetestdb      # Clean test database
```

- **Backend integration tests:** `tests/backend_integration_tests/` — Mocha/Chai, see [README](tests/backend_integration_tests/README.md)
- **E2E tests:** `tests/e2e/` — Playwright
- **Performance tests:** `tests/performance/`

### Test Utilities
- `patient_builder.js` — Fluent API for creating test patients
- `request_builder.js` — Construct analytics requests
- `mri_result_parser.js` — Navigate complex response structures

---

## Key Configuration Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` | Production orchestration (~35 services) |
| `docker-compose-local.yml` | Local dev compose (source mounts, debug ports) |
| `package.json` | Root CLI package |
| `.env` / `.env.local` | Secrets (DB creds, API keys, TLS certs) |
| `env-vars.md` | Environment variable documentation |
| `functions/package.json` | Function service registry |
| `plugins/ui/package.json` | UI monorepo workspace config |
| `plugins/ui/nx.json` | NX monorepo config |
| `services/trex/package.json` | Trex runtime config |
| `scripts/cli.ts` | Main CLI entry point |

---

## Existing Documentation

- [`README.md`](README.md) — Project overview & quick start
- [`plugins/ui/README.md`](plugins/ui/README.md) — Frontend setup & development
- [`plugins/flows/README.md`](plugins/flows/README.md) — ETL flow development
- [`scripts/README.md`](scripts/README.md) — CLI scripts reference
- [`tests/backend_integration_tests/README.md`](tests/backend_integration_tests/README.md) — Test framework docs
- [`env-vars.md`](env-vars.md) — Environment variable reference
- [`cache/README.md`](cache/README.md) — Cache management
