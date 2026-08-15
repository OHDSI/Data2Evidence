import { describe, it, expect } from "vitest";
import { compareToBaseline } from "../runner/compare.js";
import type { Baseline } from "../runner/compare.js";
import type { TimingResult } from "../runner/httpClient.js";

function timing(overrides: Partial<TimingResult> & { p50Ms: number }): TimingResult {
  return {
    scenarioName: "demo",
    p95Ms: 9999,
    p99Ms: 9999,
    minMs: overrides.p50Ms,
    maxMs: 9999,
    samples: [],
    statusCodes: [200],
    ...overrides,
  };
}

// Baselines on disk are p95-derived and stay that way — see the plan's Scope section.
const baseline: Baseline = { demo: { p95Ms: 100 } };

describe("compareToBaseline", () => {
  it("compares the p50, not the p95", () => {
    // p95 is ~100x the baseline; the p50 is below it. The p50 must win → pass.
    // This is the whole point of the change: one slow request out of ten no
    // longer decides the verdict.
    const result = compareToBaseline(timing({ p50Ms: 90, p95Ms: 9999 }), baseline);

    expect(result.status).toBe("pass");
    expect(result.currentP50Ms).toBe(90);
  });

  it("reports the baseline p95 it compared against", () => {
    const result = compareToBaseline(timing({ p50Ms: 90 }), baseline);

    expect(result.baselineP95Ms).toBe(100);
    expect(result.deltaFraction).toBeCloseTo(-0.1, 10);
  });

  it("fails when the p50 exceeds the baseline by more than the 20% fail threshold", () => {
    // +30% and +30ms — past both the fail threshold and the 15ms floor.
    const result = compareToBaseline(timing({ p50Ms: 130 }), baseline);

    expect(result.status).toBe("fail");
    expect(result.deltaFraction).toBeCloseTo(0.3, 10);
  });

  it("warns between the 10% and 20% thresholds when the 15ms floor is cleared", () => {
    // +16% and +16ms — past the warn threshold and the floor, under 20%.
    const result = compareToBaseline(timing({ p50Ms: 116 }), baseline);

    expect(result.status).toBe("warn");
  });

  it("passes below the warn threshold", () => {
    const result = compareToBaseline(timing({ p50Ms: 105 }), baseline);

    expect(result.status).toBe("pass");
  });

  it("does not fail on small absolute growth even when the percentage is large", () => {
    // +100% but only +10ms, under the 15ms minDeltaMs jitter guard.
    const smallBaseline: Baseline = { demo: { p95Ms: 10 } };
    const result = compareToBaseline(timing({ p50Ms: 20 }), smallBaseline);

    expect(result.status).toBe("pass");
  });

  it("returns no-baseline when the scenario has no baseline entry", () => {
    const result = compareToBaseline(timing({ p50Ms: 90 }), {});

    expect(result.status).toBe("no-baseline");
    expect(result.baselineP95Ms).toBeNull();
    expect(result.deltaFraction).toBeNull();
    expect(result.currentP50Ms).toBe(90);
  });

  it("returns no-baseline when the stored baseline value is not a usable number", () => {
    const broken = { demo: { p95Ms: 0 } } as Baseline;
    const result = compareToBaseline(timing({ p50Ms: 90 }), broken);

    expect(result.status).toBe("no-baseline");
  });

  it("passes through min and max unchanged", () => {
    const result = compareToBaseline(timing({ p50Ms: 90, minMs: 80, maxMs: 400 }), baseline);

    expect(result.minMs).toBe(80);
    expect(result.maxMs).toBe(400);
  });
});
