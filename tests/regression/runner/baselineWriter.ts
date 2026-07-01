#!/usr/bin/env tsx
import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHar } from "./harParser.js";
import { parseCurl } from "./curlParser.js";
import { runScenario, warmupScenarios } from "./httpClient.js";
import type { Baseline } from "./compare.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCENARIOS_DIR = join(ROOT, "scenarios");

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

  const dirBaselines = new Map<string, Baseline>();

  // Group HAR scenarios (name ends with _N) by their base name for group warmup
  const harGroups = new Map<string, typeof scenarios>();
  for (const scenario of scenarios) {
    const base = scenario.name.replace(/_\d+$/, "");
    if (base !== scenario.name) {
      if (!harGroups.has(base)) harGroups.set(base, []);
      harGroups.get(base)!.push(scenario);
    }
  }

  // Run full-sequence warmup for each HAR group before timing any steps
  for (const [base, group] of harGroups) {
    process.stdout.write(`  [group warmup] ${base} (${group.length} steps) ... `);
    await warmupScenarios(group);
    console.log("done");
  }

  console.log(`\nRunning ${scenarios.length} scenario(s) with ${process.env.PERF_REPETITIONS ?? 3} reps each...\n`);

  const harGroupNames = new Set([...harGroups.keys()].flatMap(base => harGroups.get(base)!.map(s => s.name)));

  for (const scenario of scenarios) {
    process.stdout.write(`  ${scenario.name} ... `);
    try {
      const result = await runScenario(scenario, { skipWarmup: harGroupNames.has(scenario.name) });
      const badStatuses = result.statusCodes.filter(s => s < 200 || s >= 300);
      if (badStatuses.length > 0) {
        console.log(`SKIPPED — non-2xx responses: ${[...new Set(badStatuses)].join(", ")} (baseline not updated)`);
        continue;
      }
      const dirName = scenario.name.replace(/_\d+$/, "");
      if (!dirBaselines.has(dirName)) dirBaselines.set(dirName, {});
      dirBaselines.get(dirName)![scenario.name] = { p95Ms: result.p95Ms };
      console.log(`p95=${result.p95Ms.toFixed(1)}ms  p50=${result.p50Ms.toFixed(1)}ms  min=${result.minMs.toFixed(1)}ms  max=${result.maxMs.toFixed(1)}ms`);
    } catch (err) {
      console.log(`ERROR: ${(err as Error).message}`);
    }
  }

  if (reportOnly) {
    console.log("\n--report-only: baseline not updated.");
    return;
  }

  for (const [dirName, baseline] of dirBaselines) {
    const file = join(SCENARIOS_DIR, dirName, "baseline.json");
    writeFileSync(file, JSON.stringify(baseline, null, 2) + "\n");
    console.log(`  baseline written → scenarios/${dirName}/baseline.json`);
  }
  console.log(`\nCommit the baseline.json files to lock the performance baseline.`);
}

main().catch((e) => { console.error(e); process.exit(1); });
