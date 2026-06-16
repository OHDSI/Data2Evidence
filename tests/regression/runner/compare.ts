import { config } from "../config.js";
import type { TimingResult } from "./httpClient.js";

export type CompareStatus = "pass" | "warn" | "fail" | "no-baseline";

export interface CompareResult {
  scenarioName: string;
  status: CompareStatus;
  currentMinMs: number;
  baselineMinMs: number | null;
  deltaFraction: number | null;
  minMs: number;
  maxMs: number;
}

export type Baseline = Record<string, { minMs: number }>;

export function compareToBaseline(result: TimingResult, baseline: Baseline): CompareResult {
  const entry = baseline[result.scenarioName];

  if (!entry) {
    return {
      scenarioName: result.scenarioName,
      status: "no-baseline",
      currentMinMs: result.minMs,
      baselineMinMs: null,
      deltaFraction: null,
      minMs: result.minMs,
      maxMs: result.maxMs,
    };
  }

  const delta = (result.minMs - entry.minMs) / entry.minMs;
  let status: CompareStatus = "pass";
  if (delta > config.failThreshold) status = "fail";
  else if (delta > config.warnThreshold) status = "warn";

  return {
    scenarioName: result.scenarioName,
    status,
    currentMinMs: result.minMs,
    baselineMinMs: entry.minMs,
    deltaFraction: delta,
    minMs: result.minMs,
    maxMs: result.maxMs,
  };
}
