import { textSummary } from "https://jslib.k6.io/k6-summary/0.0.2/index.js";

/**
 * Called by k6 after the test run completes.
 * Writes two files to /results/:
 *   k6-summary.json  - structured per-metric summary for regression comparison
 *   k6-summary.txt   - human-readable console output
 */
export function handleSummary(data) {
  const metrics = {};

  for (const [name, metric] of Object.entries(data.metrics)) {
    const v = metric.values || {};
    metrics[name] = {
      type: metric.type,
      avg: v.avg ?? null,
      min: v.min ?? null,
      med: v.med ?? null,
      max: v.max ?? null,
      p90: v["p(90)"] ?? null,
      p95: v["p(95)"] ?? null,
      p99: v["p(99)"] ?? null,
      count: v.count ?? null,
      rate: v.rate ?? null,
      value: v.value ?? null,
    };
  }

  const summary = {
    timestamp: new Date().toISOString(),
    root_group: data.root_group?.name ?? "default",
    metrics,
  };

  return {
    "/results/k6-summary.json": JSON.stringify(summary, null, 2),
    stdout: textSummary(data, { indent: " ", enableColors: true }),
  };
}
