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
  statusCodes: number[];
}

function buildHeaders(scenario: Scenario): Record<string, string> {
  const headers: Record<string, string> = { ...scenario.headers };
  if (config.bearerToken) headers["Authorization"] = `Bearer ${config.bearerToken}`;
  return headers;
}

async function warmupScenario(scenario: Scenario, headers: Record<string, string>): Promise<void> {
  for (let i = 0; i < config.warmupRequests; i++) {
    try {
      const res = await fetch(scenario.url, { method: scenario.method, headers, body: scenario.body });
      await res.text();
      if (!res.ok) {
        console.warn(`[warmup] ${scenario.name} request ${i + 1} returned HTTP ${res.status} ${res.statusText}`);
      }
    } catch (err) {
      console.warn(`[warmup] ${scenario.name} request ${i + 1} failed:`, err);
    }
  }
}

// Warms up a group of scenarios by running the full sequence warmupRequests times.
// Use before timing individual HAR steps so the whole flow is warm, not just each step in isolation.
export async function warmupScenarios(scenarios: Scenario[]): Promise<void> {
  for (let pass = 0; pass < config.warmupRequests; pass++) {
    for (const scenario of scenarios) {
      const headers = buildHeaders(scenario);
      try {
        const res = await fetch(scenario.url, { method: scenario.method, headers, body: scenario.body });
        await res.text();
      } catch (err) {
        console.warn(`[group-warmup] ${scenario.name} failed:`, err);
      }
    }
  }
}

export async function runScenario(scenario: Scenario, options?: { skipWarmup?: boolean }): Promise<TimingResult> {
  const samples: number[] = [];
  const statusCodes: number[] = [];
  const headers = buildHeaders(scenario);

  if (!options?.skipWarmup) {
    await warmupScenario(scenario, headers);
  }

  for (let i = 0; i < config.repetitions; i++) {
    const start = performance.now();
    const res = await fetch(scenario.url, { method: scenario.method, headers, body: scenario.body });
    const elapsed = performance.now() - start;
    // Drain the body so the connection is properly closed
    await res.text();
    statusCodes.push(res.status);
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
    statusCodes,
  };
}

function percentile(sorted: number[], p: number): number {
  const idx = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, idx)];
}
