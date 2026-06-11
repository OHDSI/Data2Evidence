# Regression / Performance Test Suite

Performance and regression tests for the d2e backend. Each test run produces:
- `results/k6-summary.json` — per-metric latency stats (p50/p95/p99, error rate)
- `results/traces.json` — OTLP traces exported from Jaeger (HTTP + DB spans)

Both files are intended to be uploaded as GitHub Artifacts for later consumption in Jaeger.

## How it works

1. `docker-compose.regression.yml` adds a Jaeger all-in-one sidecar and enables Deno OTEL env vars on the trex container so every HTTP request and DuckDB query is traced automatically.
2. k6 runs inside the `alp` Docker network, injects `traceparent` headers on every request (correlating k6 scenario → backend HTTP span → DB query span in Jaeger), and authenticates via the existing Logto OIDC flow.
3. After the k6 run, `scripts/export-traces.sh` pulls all traces from Jaeger's HTTP API.

## Running locally

### Prerequisites
- d2e stack already started with `docker-compose.yml` + any local override
- `LOGTO__D2E_APP__CLIENT_ID` known (printed in container logs or set in env)

### Start Jaeger sidecar and enable OTEL on trex

```sh
docker compose \
  -f docker-compose.yml \
  -f tests/regression/docker-compose.regression.yml \
  up -d jaeger
```

Then restart trex to pick up the new OTEL env vars:

```sh
docker compose \
  -f docker-compose.yml \
  -f tests/regression/docker-compose.regression.yml \
  up -d --no-deps trex
```

> **Note:** Deno native OTEL also requires the `--unstable-otel` flag at startup.
> This step is pending — see the open item in the implementation plan.

### Run a scenario

```sh
docker compose \
  -f docker-compose.yml \
  -f tests/regression/docker-compose.regression.yml \
  run --rm k6 run \
  -e BASE_URL=https://d2e-caddy.alp.local:${PORT:-443} \
  -e LOGTO_CLIENT_ID=<client_id> \
  /scripts/scenarios/_example.js
```

Results are written to `tests/regression/results/`.

### Export traces

```sh
JAEGER_HOST=localhost JAEGER_PORT=16686 bash tests/regression/scripts/export-traces.sh
```

### View traces in Jaeger UI

Open `http://localhost:16686` in a browser.

## Adding new scenarios

Copy `k6/scenarios/_example.js`, rename it for the API flow, and replace the placeholder request. See `k6/scenarios/README.md` for the full pattern and env var reference.

## Directory structure

```
tests/regression/
├── docker-compose.regression.yml   Jaeger sidecar + OTEL env vars override
├── k6/
│   ├── auth/logto.js               Logto OIDC auth flow (k6 setup())
│   ├── lib/
│   │   ├── tracing.js              W3C traceparent injection via k6/experimental/tracing
│   │   └── client.js               Authenticated HTTP helpers (get / post)
│   ├── scenarios/
│   │   ├── README.md               How to write a scenario
│   │   └── _example.js             Skeleton scenario
│   └── summary.js                  handleSummary → results/k6-summary.json
├── scripts/
│   └── export-traces.sh            Post-run Jaeger trace export
└── results/                        Output directory (gitignored)
```

## Deferred items

- `--unstable-otel` flag for Deno startup (required for HTTP-level tracing on trex)
- GitHub Actions workflow step
- HANA `hdb` wrapper for DB-level tracing on HANA paths
- External large dataset integration
- Actual test scenarios (to be written per agreed API list)
- Phase 2: percentage-based regression detection against main branch artifacts
