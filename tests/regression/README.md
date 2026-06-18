# Regression Performance Tests

Measures response times against a locked baseline.

## Setup

```sh
cp env.example .env
# fill in values
npm install
```

## Run baseline (write new baseline.json)

```sh
source .env && npm run baseline
```

## Run tests (compare against baseline)

```sh
source .env && npm test
```

Results print a table showing p95 response time vs baseline, delta per scenario, and min/max. Tests fail if any scenario exceeds 20% above baseline p95 (`PERF_FAIL_THRESHOLD`), if a non-2xx response is returned, or if no baseline entry exists for the scenario. The run exits immediately if `BEARER_TOKEN` is not set.
