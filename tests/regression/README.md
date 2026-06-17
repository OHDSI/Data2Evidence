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

Results print a table showing min response time, delta per scenario, min and max response times. Tests fail if any scenario exceeds 20% above baseline (`PERF_FAIL_THRESHOLD`).
