import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect } from "vitest";
import { parseHar } from "../runner/harParser.js";
import { parseCurl } from "../runner/curlParser.js";
import { runScenario } from "../runner/httpClient.js";
import { compareToBaseline } from "../runner/compare.js";
import type { Baseline } from "../runner/compare.js";
import type { Scenario } from "../runner/harParser.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SCENARIOS_DIR = join(ROOT, "scenarios");
const BASELINE_FILE = join(ROOT, "baseline.json");

function loadBaseline(): Baseline {
  if (!existsSync(BASELINE_FILE)) return {};
  return JSON.parse(readFileSync(BASELINE_FILE, "utf8"));
}

function loadScenarios(): Scenario[] {
  if (!existsSync(SCENARIOS_DIR)) return [];
  const scenarios: Scenario[] = [];
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

const baseline = loadBaseline();
const scenarios = loadScenarios();

if (scenarios.length === 0) {
  describe("performance regression", () => {
    it("no scenarios found — add a .har or .curl file to scenarios/<name>/", () => {
      console.warn("No scenarios found. Skipping performance tests.");
    });
  });
} else {
  describe("performance regression", () => {
    for (const scenario of scenarios) {
      it(scenario.name, async () => {
        const result = await runScenario(scenario);
        const comparison = compareToBaseline(result, baseline);

        console.log(`  ${comparison.message}`);

        if (comparison.status === "no-baseline") {
          console.warn(`  [${scenario.name}] No baseline recorded yet. Run 'npm run baseline' first.`);
          return; // skip assertion, don't fail
        }

        expect(
          comparison.status,
          comparison.message
        ).not.toBe("fail");
      });
    }
  });
}
