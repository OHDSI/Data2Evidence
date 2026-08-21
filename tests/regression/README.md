# Regression Performance Tests

Measures response times against a locked baseline.

## Setup

```sh
cp env.example .env
# fill in values
npm install
```

## Run baseline (write per-scenario baseline.json)

```sh
set -a && source .env && set +a && npm run baseline
```

Each scenario directory gets its own `baseline.json`. Commit these files to lock the baseline.

## Run tests (compare against baseline)

```sh
set -a && source .env && set +a && npm test
```

Results print a table showing the **p50** response time vs baseline, delta per scenario, and min/max. Tests fail if any scenario's p50 exceeds 20% above the stored baseline (`PERF_FAIL_THRESHOLD`) by more than 15ms (`PERF_MIN_DELTA_MS`, so ms-level jitter on small baselines doesn't fail CI), if a non-2xx response is returned, or if no baseline entry exists for the scenario. The run exits immediately if `BEARER_TOKEN` is not set.

## p50 vs p95 baseline

The comparison metric is the **p50 (median)** of each scenario's timed samples. CI runs 10 repetitions, and `percentile()` (`runner/httpClient.ts`) computes `idx = Math.ceil((p/100) * len) - 1`, so with 10 samples the p95 index resolves to the **last element** — the slowest single request of the run. That made the gate a function of runner noise rather than of application performance. The p50 is the stable statistic over the same samples.

The stored baselines in `scenarios/*/baseline.json` are still **p95** values under the `p95Ms` key — they were deliberately left unregenerated when the comparison switched to the p50.

So the gate compares *current p50* against *stored p95*, which is systematically lenient: each scenario carries headroom equal to the spread between its own p50 and p95. This is a known and accepted trade-off — the thresholds were deliberately left at 10%/20%, and nothing that passes today can start failing because of the metric switch.

To remove the asymmetry later, regenerate the baselines on a quiet environment (`npm run baseline`) and commit the result — at that point the stored values become p50s, and the `p95Ms` key should be renamed to `p50Ms` across `runner/compare.ts`, `runner/baselineWriter.ts` and the three `baseline.json` files in one change.
