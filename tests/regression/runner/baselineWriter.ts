#!/usr/bin/env tsx
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHar } from "./harParser.js";
import { parseCurl } from "./curlParser.js";
import { runScenario } from "./httpClient.js";
import type { Baseline } from "./compare.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCENARIOS_DIR = join(ROOT, "scenarios");
const BASELINE_FILE = join(ROOT, "baseline.json");

const reportOnly = process.argv.includes("--report-only");

async function loadScenarios() {
  const scenarios = [];
  for (const entry of readdirSync(SCENARIOS_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const dir = join(SCENARIOS_DIR, entry.name);
    const files = readdirSync(dir);

    if (files.includes("input.har")) {
      const raw = readFileSync(join(dir, "input.har"), "utf8");
      scenarios.push(...parseHar(entry.name, raw));
    } else if (files.includes("input.curl")) {
      const raw = readFileSync(join(dir, "input.curl"), "utf8").trim();
      scenarios.push(parseCurl(entry.name, raw));
    }
  }
  return scenarios;
}

async function main() {
  const scenarios = await loadScenarios();
  if (scenarios.length === 0) {
    console.log("No scenarios found in scenarios/. Add a .har or .curl file to get started.");
    process.exit(0);
  }

  const newBaseline: Baseline = {};

  console.log(`Running ${scenarios.length} scenario(s) with ${process.env.PERF_REPETITIONS ?? 3} reps each...\n`);

  for (const scenario of scenarios) {
    process.stdout.write(`  ${scenario.name} ... `);
    try {
      const result = await runScenario(scenario);
      newBaseline[scenario.name] = { p95Ms: result.p95Ms };
      console.log(`p95=${result.p95Ms.toFixed(1)}ms  p50=${result.p50Ms.toFixed(1)}ms  min=${result.minMs.toFixed(1)}ms  max=${result.maxMs.toFixed(1)}ms`);
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`);
    }
  }

  if (reportOnly) {
    console.log("\n--report-only: baseline.json not updated.");
    return;
  }

  writeFileSync(BASELINE_FILE, JSON.stringify(newBaseline, null, 2) + "\n");
  console.log(`\nBaseline written to baseline.json. Commit this file to lock the performance baseline.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
