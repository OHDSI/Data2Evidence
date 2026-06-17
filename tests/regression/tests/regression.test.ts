import { readFileSync, writeFileSync, mkdirSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, it, expect, afterAll } from "vitest";
import { parseHar } from "../runner/harParser.js";
import { parseCurl } from "../runner/curlParser.js";
import { runScenario } from "../runner/httpClient.js";
import { compareToBaseline } from "../runner/compare.js";
import type { Baseline, CompareResult, CompareStatus } from "../runner/compare.js";
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

const STATUS_RANK: Record<string, number> = { fail: 3, warn: 2, pass: 1, "no-baseline": 0 };

interface GroupedResult {
  name: string;
  status: CompareStatus;
  totalCurrentMinMs: number;
  totalBaselineMinMs: number | null;
  deltaFraction: number | null;
  totalMinMs: number;
  totalMaxMs: number;
  requestCount: number;
}

function groupResults(results: CompareResult[]): GroupedResult[] {
  const HAR_RE = /_\d+$/;
  const groups = new Map<string, CompareResult[]>();

  for (const r of results) {
    const key = HAR_RE.test(r.scenarioName) ? r.scenarioName.replace(HAR_RE, "") : r.scenarioName;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return Array.from(groups.entries()).map(([key, members]) => {
    const isHar = members.length > 1 || HAR_RE.test(members[0].scenarioName);
    const name = isHar ? `${key} (${members.length} req)` : key;
    const status = members.reduce<CompareStatus>(
      (worst, m) => STATUS_RANK[m.status] > STATUS_RANK[worst] ? m.status : worst,
      "no-baseline"
    );
    const totalCurrentMinMs = members.reduce((s, m) => s + m.currentMinMs, 0);
    const anyNoBaseline = members.some(m => m.baselineMinMs === null);
    const totalBaselineMinMs = anyNoBaseline ? null : members.reduce((s, m) => s + m.baselineMinMs!, 0);
    const deltaFraction = totalBaselineMinMs !== null
      ? (totalCurrentMinMs - totalBaselineMinMs) / totalBaselineMinMs
      : null;
    return {
      name,
      status,
      totalCurrentMinMs,
      totalBaselineMinMs,
      deltaFraction,
      totalMinMs: members.reduce((s, m) => s + m.minMs, 0),
      totalMaxMs: members.reduce((s, m) => s + m.maxMs, 0),
      requestCount: members.length,
    };
  });
}

function writeDetailedReport(results: CompareResult[]): void {
  const dir = join(ROOT, "test-results");
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, "detailed-report.json"), JSON.stringify(results, null, 2) + "\n");
}

function printTable(results: GroupedResult[]): void {
  const COL_SCENARIO = 32;
  const COL_P95      = 26;
  const COL_MIN      = 8;
  const COL_MAX      = 8;
  const COL_DELTA    = 8;
  const COL_STATUS   = 9;

  const pad  = (s: string, n: number) => s.padEnd(n);
  const lpad = (s: string, n: number) => s.padStart(n);
  const divider = `${"─".repeat(COL_SCENARIO + 2)}┼${"─".repeat(COL_P95 + 2)}┼${"─".repeat(COL_MIN + 2)}┼${"─".repeat(COL_MAX + 2)}┼${"─".repeat(COL_DELTA + 2)}┼${"─".repeat(COL_STATUS + 2)}`;
  const row = (a: string, b: string, c: string, d: string, e: string, f: string) =>
    ` ${pad(a, COL_SCENARIO)} │ ${pad(b, COL_P95)} │ ${lpad(c, COL_MIN)} │ ${lpad(d, COL_MAX)} │ ${lpad(e, COL_DELTA)} │ ${pad(f, COL_STATUS)}`;

  const lines: string[] = [
    "",
    "Performance Regression Results",
    divider,
    row("Scenario", "min of all runs (baseline)", "min", "max", "Δ%", "Status"),
    divider,
  ];

  for (const r of results) {
    const minBaselineStr =
      r.totalBaselineMinMs !== null
        ? `${r.totalCurrentMinMs.toFixed(1)}ms (${r.totalBaselineMinMs.toFixed(1)}ms)`
        : `${r.totalCurrentMinMs.toFixed(1)}ms (no baseline)`;
    const minStr = `${r.totalMinMs.toFixed(1)}ms`;
    const maxStr = `${r.totalMaxMs.toFixed(1)}ms`;
    const deltaStr =
      r.deltaFraction !== null
        ? `${r.deltaFraction >= 0 ? "+" : ""}${(r.deltaFraction * 100).toFixed(1)}%`
        : "-";
    lines.push(row(r.name, minBaselineStr, minStr, maxStr, deltaStr, STATUS_ICON[r.status]));
  }

  lines.push(divider);

  const failing = results.filter((r) => r.status === "fail");
  if (failing.length > 0) {
    lines.push("");
    lines.push("Scenarios exceeding fail threshold:");
    for (const r of failing) {
      lines.push(
        `  ✗ ${r.name}: min ${r.totalCurrentMinMs.toFixed(1)}ms` +
        ` (baseline ${r.totalBaselineMinMs!.toFixed(1)}ms, +${(r.deltaFraction! * 100).toFixed(1)}%)`
      );
    }
  }

  const warning = results.filter((r) => r.status === "warn");
  if (warning.length > 0) {
    lines.push("");
    lines.push("Scenarios exceeding warn threshold:");
    for (const r of warning) {
      lines.push(
        `  ⚠ ${r.name}: min ${r.totalCurrentMinMs.toFixed(1)}ms` +
        ` (baseline ${r.totalBaselineMinMs!.toFixed(1)}ms, +${(r.deltaFraction! * 100).toFixed(1)}%)`
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
    afterAll(() => {
      if (results.some(r => r.status === "fail")) {
        writeDetailedReport(results);
      }
      printTable(groupResults(results));
    });

    for (const scenario of scenarios) {
      it(scenario.name, async () => {
        const timing = await runScenario(scenario);
        const comparison = compareToBaseline(timing, baseline);
        results.push(comparison);

        expect(
          comparison.status,
          `${scenario.name} min ${timing.minMs.toFixed(1)}ms exceeded fail threshold` +
          (comparison.baselineMinMs ? ` (baseline ${comparison.baselineMinMs.toFixed(1)}ms)` : "")
        ).not.toBe("fail");
      });
    }
  });
}
