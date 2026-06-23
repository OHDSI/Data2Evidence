import { config } from "../config.js";
import type { TimingResult } from "./httpClient.js";

export type CompareStatus = "pass" | "warn" | "fail" | "no-baseline";

export interface CompareResult {
  scenarioName: string;
  status: CompareStatus;
  currentP95Ms: number;
  baselineP95Ms: number | null;
  deltaFraction: number | null;
  minMs: number;
  maxMs: number;
}

export type Baseline = Record<string, { p95Ms: number }>;

export function compareToBaseline(result: TimingResult, baseline: Baseline): CompareResult {
  const entry = baseline[result.scenarioName];

  if (!entry || typeof entry.p95Ms !== "number") {
    return {
      scenarioName: result.scenarioName,
      status: "no-baseline",
      currentP95Ms: result.p95Ms,
      baselineP95Ms: null,
      deltaFraction: null,
      minMs: result.minMs,
      maxMs: result.maxMs,
    };
  }

  const delta = (result.p95Ms - entry.p95Ms) / entry.p95Ms;
  let status: CompareStatus = "pass";
  if (delta > config.failThreshold) status = "fail";
  else if (delta > config.warnThreshold) status = "warn";

  return {
    scenarioName: result.scenarioName,
    status,
    currentP95Ms: result.p95Ms,
    baselineP95Ms: entry.p95Ms,
    deltaFraction: delta,
    minMs: result.minMs,
    maxMs: result.maxMs,
  };
}
