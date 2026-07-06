```
name: d2e-regression-tests-skill
description: A skill for writing and running performance regression tests for D2E HTTP API endpoints. Use when adding new scenarios, updating baselines, or investigating performance regressions flagged in CI.
```

# Data2Evidence Performance Regression Tests

- Framework: Vitest + TypeScript, located in `tests/regression/`
- Scenarios are defined as HAR files (`input.har`) or curl commands (`input.curl`) under `tests/regression/scenarios/<name>/`
- Template variables in scenario files use `{{key}}` syntax (e.g. `{{D2E_BASE_URL}}`, `{{DATASET_ID}}`, `{{PA_CONFIG_ID}}`) and are substituted from `config.ts` at runtime; `bearerToken` is injected as the `Authorization` header automatically and does not need a template variable

## Config (`tests/regression/config.ts`)

| Key | Env var | Purpose |
|---|---|---|
| `D2E_BASE_URL` | `D2E_BASE_URL` | Host and port of the D2E instance (e.g. `localhost:41100`) |
| `DATASET_ID` | `DATASET_ID` | Injected into matching query params and JSON body fields |
| `PA_CONFIG_ID` | `PA_CONFIG_ID` | Injected into matching query params and JSON body fields |
| `bearerToken` | `BEARER_TOKEN` | Added as `Authorization` header on every request; **required** — the run exits immediately if unset |
| `failThreshold` | `PERF_FAIL_THRESHOLD` | p95 regression fraction that fails the test (default 0.20) |
| `warnThreshold` | `PERF_WARN_THRESHOLD` | p95 regression fraction that warns (default 0.10) |
| `repetitions` | `PERF_REPETITIONS` | Requests per scenario per run (default 3) |
| `warmupRequests` | `PERF_WARMUP_REQUESTS` | Throwaway requests fired per scenario before timing starts, to warm up edge runtime workers (default 1) |

## Commands

Copy `tests/regression/env.example` to `tests/regression/.env` and fill in the values before running. Obtain the bearer token with `node d2e-skill/scripts/auth.mjs` and set it as the `BEARER_TOKEN` env var.

```sh
# Run regression tests (compares vs per-scenario baseline.json)
set -a && source .env && set +a && npm test

# Record/update baseline — run on main, then commit the baseline files
set -a && source .env && set +a && npm run baseline

# Print comparison report without updating baseline
set -a && source .env && set +a && npm run report
```

For every prompt type, generate a new .env file with the required env vars and run the command accordingly.

## Adding a scenario

1. Create `scenarios/<name>/input.har` or `scenarios/<name>/input.curl`
2. Replace hardcoded values with `{{key}}` template variables from the table above
3. Run `npm run baseline` to record initial timings; this writes `scenarios/<name>/baseline.json` — commit it alongside the input file

## Baseline storage

Each scenario directory holds its own `baseline.json`:

```
scenarios/
  <name>/
    input.har  (or input.curl)
    baseline.json   ← written by `npm run baseline`, keyed by scenario name
```

The test runner merges all per-directory `baseline.json` files at startup. To update the baseline for a specific scenario, re-run `npm run baseline` — only directories that produce successful (2xx) responses will have their file updated.

## Baseline metric

The baseline is **p95 latency** (`p95Ms`) — the 95th-percentile response time across all timed repetitions. The results table also displays current min and max as separate columns. Delta (Δ%) and pass/warn/fail thresholds are computed against the stored p95.

## Test failure conditions

A scenario fails if any of the following are true:
- Any timed response returned a non-2xx HTTP status
- No baseline entry exists for the scenario (run `npm run baseline` and commit `baseline.json`)
- The current p95 exceeds the baseline p95 by more than `PERF_FAIL_THRESHOLD` (default 20%)

## HTML Report

On a failed run, `tests/regression/test-results/regression-report.html` is generated — a dark-theme table showing each scenario's baseline p95, current p95, min, max, Δ%, and status, with a summary and alert banner for failures. It is uploaded automatically as part of the `regression-failure-report-<attempt>` GitHub Actions artifact.

## CI

Runs via `.github/workflows/_test-regression.yml`, called from `docker-build-push.yaml` as `test_regression`. Uses pre-published `develop` images — no build step required. Results gate the `docker-success` job.

## Stability Probe

Use the stability probe to observe how the backend responds across repeated runs without modifying baselines or triggering test assertions.

```sh
cd tests/regression && set -a && source .env && set +a && npx tsx runner/stabilityProbe.ts
```

Runs all scenarios N times (default 8) with a 20s delay between runs and prints a comparison table of p95 per run vs the current baseline. Scenarios with no baseline entry are skipped. Configure via constants at the top of `tests/regression/runner/stabilityProbe.ts`:

| Constant | Default | Purpose |
|---|---|---|
| `RUNS` | `8` | Number of probe runs |
| `DELAY_MS` | `20000` | Delay between runs (ms) |

**Warmup behaviour:** HAR groups are warmed up as a full sequence before each run (not per-step), ensuring downstream steps benefit from upstream cache/session state. Markers in the output: `!` = >20% above baseline, `▼` = >20% below baseline. StdDev column shows variability across runs.
