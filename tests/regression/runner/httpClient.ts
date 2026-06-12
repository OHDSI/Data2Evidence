import { config } from "../config.js";
import type { Scenario } from "./harParser.js";

export interface TimingResult {
  scenarioName: string;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  minMs: number;
  maxMs: number;
  samples: number[];
}

export async function runScenario(scenario: Scenario): Promise<TimingResult> {
  const samples: number[] = [];

  const headers: Record<string, string> = { ...scenario.headers };
  if (config.bearerToken) {
    headers["Authorization"] = `Bearer ${config.bearerToken}`;
  }

  for (let i = 0; i < config.repetitions; i++) {
    const start = performance.now();
    const res = await fetch(scenario.url, {
      method: scenario.method,
      headers,
      body: scenario.body,
    });
    const elapsed = performance.now() - start;
    // Drain the body so the connection is properly closed
    await res.text();
    samples.push(elapsed);
  }

  samples.sort((a, b) => a - b);
  return {
    scenarioName: scenario.name,
    p50Ms: percentile(samples, 50),
    p95Ms: percentile(samples, 95),
    p99Ms: percentile(samples, 99),
    minMs: samples[0],
    maxMs: samples[samples.length - 1],
    samples,
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
