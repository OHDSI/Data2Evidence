import { config } from "../config.js";
import type { TimingResult } from "./httpClient.js";

export type CompareStatus = "pass" | "warn" | "fail" | "no-baseline";

export interface CompareResult {
  scenarioName: string;
  status: CompareStatus;
  baselineP95Ms: number | null;
  currentP95Ms: number;
  deltaFraction: number | null;
  message: string;
}

export type Baseline = Record<string, { p95Ms: number }>;

export function compareToBaseline(result: TimingResult, baseline: Baseline): CompareResult {
  const entry = baseline[result.scenarioName];

  if (!entry) {
    return {
      scenarioName: result.scenarioName,
      status: "no-baseline",
      baselineP95Ms: null,
      currentP95Ms: result.p95Ms,
      deltaFraction: null,
      message: `No baseline found — skipping assertion. Run 'npm run baseline' to record one.`,
    };
  }

  const delta = (result.p95Ms - entry.p95Ms) / entry.p95Ms;

  let status: CompareStatus = "pass";
  let message = `p95 ${fmt(result.p95Ms)} vs baseline ${fmt(entry.p95Ms)} (${pct(delta)})`;

  if (delta > config.failThreshold) {
    status = "fail";
    message = `FAIL: p95 regression ${pct(delta)} exceeds fail threshold ${pct(config.failThreshold)}. ${message}`;
  } else if (delta > config.warnThreshold) {
    status = "warn";
    message = `WARN: p95 regression ${pct(delta)} exceeds warn threshold ${pct(config.warnThreshold)}. ${message}`;
  }

  return {
    scenarioName: result.scenarioName,
    status,
    baselineP95Ms: entry.p95Ms,
    currentP95Ms: result.p95Ms,
    deltaFraction: delta,
    message,
  };
}

const fmt = (ms: number) => `${ms.toFixed(1)}ms`;
const pct = (f: number) => `${(f * 100).toFixed(1)}%`;
