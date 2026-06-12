import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, afterAll } from "vitest";
import { parseHar } from "../runner/harParser.js";
import { parseCurl } from "../runner/curlParser.js";
import { runScenario } from "../runner/httpClient.js";
import { compareToBaseline } from "../runner/compare.js";
import type { Baseline, CompareResult } from "../runner/compare.js";
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

const STATUS_ICON: Record<string, string> = {
  pass: "✓",
  warn: "⚠ WARN",
  fail: "✗ FAIL",
  "no-baseline": "-",
};

function printTable(results: CompareResult[]): void {
  const COL_SCENARIO = 32;
  const COL_P95      = 26;
  const COL_DELTA    = 8;
  const COL_STATUS   = 9;

  const pad  = (s: string, n: number) => s.padEnd(n);
  const lpad = (s: string, n: number) => s.padStart(n);
  const divider = `${"─".repeat(COL_SCENARIO + 2)}┼${"─".repeat(COL_P95 + 2)}┼${"─".repeat(COL_DELTA + 2)}┼${"─".repeat(COL_STATUS + 2)}`;
  const row = (a: string, b: string, c: string, d: string) =>
    ` ${pad(a, COL_SCENARIO)} │ ${pad(b, COL_P95)} │ ${lpad(c, COL_DELTA)} │ ${pad(d, COL_STATUS)}`;

  const lines: string[] = [
    "",
    "Performance Regression Results",
    divider,
    row("Scenario", "p95 (baseline)", "Δ%", "Status"),
    divider,
  ];

  for (const r of results) {
    const p95Str =
      r.baselineP95Ms !== null
        ? `${r.currentP95Ms.toFixed(1)}ms (${r.baselineP95Ms.toFixed(1)}ms)`
        : `${r.currentP95Ms.toFixed(1)}ms (no baseline)`;
    const deltaStr =
      r.deltaFraction !== null
        ? `${r.deltaFraction >= 0 ? "+" : ""}${(r.deltaFraction * 100).toFixed(1)}%`
        : "-";
    lines.push(row(r.scenarioName, p95Str, deltaStr, STATUS_ICON[r.status]));
  }

  lines.push(divider);

  const failing = results.filter((r) => r.status === "fail");
  if (failing.length > 0) {
    lines.push("");
    lines.push("Scenarios exceeding fail threshold:");
    for (const r of failing) {
      lines.push(
        `  ✗ ${r.scenarioName}: p95 ${r.currentP95Ms.toFixed(1)}ms` +
        ` (baseline ${r.baselineP95Ms!.toFixed(1)}ms, +${(r.deltaFraction! * 100).toFixed(1)}%)`
      );
    }
  }

  const warning = results.filter((r) => r.status === "warn");
  if (warning.length > 0) {
    lines.push("");
    lines.push("Scenarios exceeding warn threshold:");
    for (const r of warning) {
      lines.push(
        `  ⚠ ${r.scenarioName}: p95 ${r.currentP95Ms.toFixed(1)}ms` +
        ` (baseline ${r.baselineP95Ms!.toFixed(1)}ms, +${(r.deltaFraction! * 100).toFixed(1)}%)`
      );
    }
  }

  lines.push("");
  console.log(lines.join("\n"));
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
  const results: CompareResult[] = [];

  describe("performance regression", () => {
    afterAll(() => printTable(results));

    for (const scenario of scenarios) {
      it(scenario.name, async () => {
        const timing = await runScenario(scenario);
        const comparison = compareToBaseline(timing, baseline);
        results.push(comparison);

        expect(
          comparison.status,
          `${scenario.name} p95 ${timing.p95Ms.toFixed(1)}ms exceeded fail threshold` +
          (comparison.baselineP95Ms ? ` (baseline ${comparison.baselineP95Ms.toFixed(1)}ms)` : "")
        ).not.toBe("fail");
      });
    }
  });
}
