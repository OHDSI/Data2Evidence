# Regression / Performance Test Suite

Performance and regression tests for the d2e backend. Each test run produces:
- `results/k6-summary.json` — per-metric latency stats (p50/p95/p99, error rate)
- `results/traces.json` — OTLP traces exported from Jaeger (HTTP + DB spans)

Both files are intended to be uploaded as GitHub Artifacts for later consumption in Jaeger.

---

## TODO

### Enable `--unstable-otel` on the Trex start command

Deno 2.7.12 requires the `--unstable-otel` flag at runtime to activate its
native OpenTelemetry support. Without it, HTTP-level spans are not emitted by
trex, and only DB-level spans (from the `PostgresConnection.ts` wrapper) will
appear in Jaeger.

**What needs to be done:**
Find the `deno` start command for the trex container (likely in `start.sh` or
the service's `package.json` start script under `services/trex/`) and add
`--unstable-otel` to it. This should be conditional — either gated behind an
env var (e.g. `${OTEL_DENO_UNSTABLE:-}`) so it only activates when the
regression overlay is used, or added unconditionally since it is a no-op when
no collector endpoint is configured.

---

## How it works

1. `docker-compose.regression.yml` adds a Jaeger all-in-one sidecar and sets
   OTEL env vars on the trex service (`OTEL_EXPORTER_OTLP_ENDPOINT`,
   `OTEL_SERVICE_NAME`). When `--unstable-otel` is also active, every HTTP
   request handled by trex produces a trace automatically via Deno's native
   OTEL support.
2. DuckDB query spans are emitted by a thin wrapper in
   `plugins/functions/_shared/alp-base-utils/src/PostgresConnection.ts` using
   `@opentelemetry/api`. These appear as children of the HTTP span in Jaeger.
3. k6 runs inside the `alp` Docker network, injects `traceparent` W3C headers
   on every request (correlating the k6 scenario → backend HTTP span → DB
   query spans), and authenticates via the Logto OIDC flow.
4. After the k6 run, `scripts/export-traces.sh` pulls all traces from Jaeger's
   HTTP API and writes them to `results/traces.json`.

## Running locally

### Prerequisites
- d2e stack already started with `docker-compose.yml` + any local override
- `LOGTO__D2E_APP__CLIENT_ID` known (printed in container logs or set in env)

### Start the Jaeger sidecar and apply OTEL env vars to trex

```sh
docker compose \
  -f docker-compose.yml \
  -f tests/regression/docker-compose.regression.yml \
  up -d jaeger

# Restart trex to pick up the new OTEL env vars
docker compose \
  -f docker-compose.yml \
  -f tests/regression/docker-compose.regression.yml \
  up -d --no-deps trex
```

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

Copy `k6/scenarios/_example.js`, rename it for the API flow, and replace the
placeholder request. See `k6/scenarios/README.md` for the full pattern and env
var reference.

## Directory structure

```
tests/regression/
├── docker-compose.regression.yml   Jaeger sidecar + OTEL env vars override
├── k6/
│   ├── auth/logto.js               Logto OIDC auth flow (k6 setup())
│   ├── lib/
│   │   ├── tracing.js              W3C traceparent injection
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

- GitHub Actions workflow step for the regression suite
- HANA `hdb` wrapper for DB-level tracing on HANA paths
- External large dataset integration
- Actual test scenarios (to be written per agreed API list)
- Phase 2: percentage-based regression detection against main branch artifacts
