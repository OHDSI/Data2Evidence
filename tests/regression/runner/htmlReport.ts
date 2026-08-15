import { writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import type { CompareResult } from "./compare.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

export function writeHtmlReport(results: CompareResult[], runDate: string): void {
  const dir = join(ROOT, "test-results");
  mkdirSync(dir, { recursive: true });

  const failed = results.filter(r => r.status === "fail");
  const warned = results.filter(r => r.status === "warn");
  const passed = results.filter(r => r.status === "pass");
  const noBaseline = results.filter(r => r.status === "no-baseline");

  const alertHtml = failed.length > 0
    ? `<div class="alert"><strong>Regression detected:</strong> ${failed.length} scenario(s) exceeded the fail threshold — ${failed.map(r => `<code>${r.scenarioName}</code>`).join(", ")}</div>`
    : "";

  const rows = results.map(r => {
    const baseStr = r.baselineP95Ms !== null ? r.baselineP95Ms.toFixed(1) + "ms" : "—";
    const deltaStr = r.deltaFraction !== null
      ? `${r.deltaFraction >= 0 ? "+" : ""}${(r.deltaFraction * 100).toFixed(1)}%`
      : "—";
    const rowCls = r.status === "fail" ? "row-fail"
      : r.status === "warn" ? "row-warn"
      : r.status === "no-baseline" ? "row-nobase"
      : "row-pass";
    const statusLabel = r.status === "fail" ? "✗ FAIL"
      : r.status === "warn" ? "⚠ WARN"
      : r.status === "pass" ? "✓"
      : "—";
    const deltaCls = r.deltaFraction === null ? "nobase"
      : r.deltaFraction > 0.2 ? "delta-fail"
      : r.deltaFraction > 0.1 ? "delta-warn"
      : r.deltaFraction < 0 ? "delta-below"
      : "delta-pass";
    return `<tr class="${rowCls}">
      <td>${r.scenarioName}</td>
      <td class="baseline-col">${baseStr}</td>
      <td>${r.currentP95Ms.toFixed(1)}ms</td>
      <td>${r.minMs.toFixed(1)}ms</td>
      <td>${r.maxMs.toFixed(1)}ms</td>
      <td class="${deltaCls}">${deltaStr}</td>
      <td class="status-cell status-${r.status}">${statusLabel}</td>
    </tr>`;
  }).join("\n");

  const total = results.length;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>D2E Regression — Performance Report</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #0f1117; color: #e2e8f0; padding: 24px; }
    h1 { font-size: 1.25rem; font-weight: 600; color: #f8fafc; margin-bottom: 4px; }
    .subtitle { font-size: 0.8rem; color: #64748b; margin-bottom: 24px; }
    .legend { display: flex; gap: 16px; margin-bottom: 16px; font-size: 0.75rem; flex-wrap: wrap; }
    .legend-item { display: flex; align-items: center; gap: 6px; }
    .dot { width: 10px; height: 10px; border-radius: 2px; }
    .dot-pass { background: #1e3a2e; border: 1px solid #22c55e; }
    .dot-warn { background: #3a2e1e; border: 1px solid #f59e0b; }
    .dot-fail { background: #3a1e1e; border: 1px solid #ef4444; }
    .dot-nobase { background: #1e2330; border: 1px solid #475569; }
    .wrapper { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; font-size: 0.78rem; min-width: 900px; }
    thead th { background: #1e2330; color: #94a3b8; font-weight: 600; text-align: right; padding: 8px 10px; border-bottom: 1px solid #2d3748; white-space: nowrap; }
    thead th:first-child { text-align: left; width: 280px; }
    thead th.baseline-col { color: #cbd5e1; border-right: 2px solid #475569; }
    tbody tr { border-bottom: 1px solid #1a1f2e; }
    tbody tr:hover { background: #161b27; }
    td { padding: 6px 10px; text-align: right; white-space: nowrap; }
    td:first-child { text-align: left; color: #cbd5e1; font-family: "SF Mono", "Fira Code", monospace; font-size: 0.72rem; }
    td.baseline-col { color: #94a3b8; font-weight: 500; border-right: 2px solid #475569; }
    .row-fail { background: #1f1515; }
    .row-warn { background: #1f1c15; }
    .row-pass { }
    .row-nobase { opacity: 0.6; }
    .delta-fail { color: #f87171; font-weight: 700; }
    .delta-warn { color: #fbbf24; font-weight: 600; }
    .delta-pass { color: #4ade80; }
    .delta-below { color: #60a5fa; }
    td.nobase { color: #64748b; font-style: italic; }
    .status-cell { font-weight: 600; }
    .status-pass { color: #4ade80; }
    .status-warn { color: #fbbf24; }
    .status-fail { color: #f87171; }
    .status-no-baseline { color: #64748b; font-style: italic; }
    .alert { background: #3a1e1e; border: 1px solid #ef4444; border-radius: 6px; padding: 10px 14px; margin-bottom: 16px; font-size: 0.78rem; color: #fecaca; }
    .alert strong { color: #f87171; }
    .summary { margin-top: 20px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
    .card { background: #1a1f2e; border: 1px solid #2d3748; border-radius: 8px; padding: 14px; }
    .card-label { font-size: 0.7rem; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 4px; }
    .card-value { font-size: 1.4rem; font-weight: 700; }
    .card-value.green { color: #4ade80; }
    .card-value.red { color: #f87171; }
    .card-value.yellow { color: #fbbf24; }
    .card-value.gray { color: #64748b; }
    .footer { margin-top: 16px; font-size: 0.7rem; color: #334155; }
  </style>
</head>
<body>
  <h1>D2E Regression — Performance Report</h1>
  <p class="subtitle">${total} scenario(s) · p95 latency · ${runDate}</p>

  ${alertHtml}

  <div class="legend">
    <div class="legend-item"><div class="dot dot-pass"></div><span>pass (within thresholds)</span></div>
    <div class="legend-item"><div class="dot dot-warn"></div><span>warn (&gt;${(0.1 * 100).toFixed(0)}% above baseline)</span></div>
    <div class="legend-item"><div class="dot dot-fail"></div><span>fail (&gt;${(0.2 * 100).toFixed(0)}% above baseline)</span></div>
    <div class="legend-item"><div class="dot dot-nobase"></div><span>no baseline</span></div>
  </div>

  <div class="wrapper">
  <table>
    <thead>
      <tr>
        <th>Scenario</th>
        <th class="baseline-col">Baseline p95</th>
        <th>Current p95</th>
        <th>Min</th>
        <th>Max</th>
        <th>Δ%</th>
        <th>Status</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
  </div>

  <div class="summary">
    <div class="card"><div class="card-label">Total Scenarios</div><div class="card-value">${total}</div></div>
    <div class="card"><div class="card-label">Passed</div><div class="card-value green">${passed.length} <span style="font-size:0.9rem;font-weight:400">(${total ? (passed.length / total * 100).toFixed(0) : 0}%)</span></div></div>
    <div class="card"><div class="card-label">Warned</div><div class="card-value yellow">${warned.length} <span style="font-size:0.9rem;font-weight:400">(${total ? (warned.length / total * 100).toFixed(0) : 0}%)</span></div></div>
    <div class="card"><div class="card-label">Failed</div><div class="card-value red">${failed.length} <span style="font-size:0.9rem;font-weight:400">(${total ? (failed.length / total * 100).toFixed(0) : 0}%)</span></div></div>
    <div class="card"><div class="card-label">No Baseline</div><div class="card-value gray">${noBaseline.length}</div></div>
  </div>

  <p class="footer">Baseline p95 values from <code>tests/regression/scenarios/*/baseline.json</code>. Δ% computed vs stored baseline p95. Thresholds: warn &gt;10%, fail &gt;20%.</p>
</body>
</html>`;

  writeFileSync(join(dir, "regression-report.html"), html);
}
