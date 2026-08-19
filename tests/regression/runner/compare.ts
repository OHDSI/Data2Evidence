import { config } from "../config.js";
import type { TimingResult } from "./httpClient.js";

export type CompareStatus = "pass" | "warn" | "fail" | "no-baseline";

export interface CompareResult {
  scenarioName: string;
  status: CompareStatus;
  currentP50Ms: number;
  baselineP95Ms: number | null;
  deltaFraction: number | null;
  minMs: number;
  maxMs: number;
}

// Baseline files on disk store a p95 under `p95Ms` and are deliberately left
// untouched, so the comparison is current-p50 vs stored-p95 and is therefore
// lenient by design. See "p50 vs p95 baseline" in tests/regression/README.md.
export type Baseline = Record<string, { p95Ms: number }>;

export function compareToBaseline(result: TimingResult, baseline: Baseline): CompareResult {
  const entry = baseline[result.scenarioName];

  // The median of this run's samples — p50Ms is already computed by runScenario().
  // Using it instead of p95Ms is the whole change: with 10 repetitions the p95
  // resolves to the slowest single sample, which made CI fail on runner noise.
  const currentP50Ms = result.p50Ms;

  const baselineP95Ms = entry?.p95Ms;
  if (typeof baselineP95Ms !== "number" || !isFinite(baselineP95Ms) || baselineP95Ms <= 0) {
    return {
      scenarioName: result.scenarioName,
      status: "no-baseline",
      currentP50Ms,
      baselineP95Ms: null,
      deltaFraction: null,
      minMs: result.minMs,
      maxMs: result.maxMs,
    };
  }

  const delta = (currentP50Ms - baselineP95Ms) / baselineP95Ms;
  let status: CompareStatus = "pass";
  if (currentP50Ms - baselineP95Ms > config.minDeltaMs) {
    if (delta > config.failThreshold) status = "fail";
    else if (delta > config.warnThreshold) status = "warn";
  }

  return {
    scenarioName: result.scenarioName,
    status,
    currentP50Ms,
    baselineP95Ms,
    deltaFraction: delta,
    minMs: result.minMs,
    maxMs: result.maxMs,
  };
}
