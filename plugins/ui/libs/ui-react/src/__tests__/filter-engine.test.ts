import { describe, expect, it } from "vitest";
import {
  activeFilterCount,
  applyFilters,
  deriveAllOptions,
  deriveOptions,
  isActive,
  matchesFilter,
  serializeFilters,
} from "../components/filterEngine";
import type { FilterDef } from "../components/filterTypes";

interface Row {
  category: string;
  table: string;
  severity?: string;
  violated: number;
  date: string;
  active: boolean;
}

const rows: Row[] = [
  { category: "Plausibility", table: "PERSON", severity: "Fatal", violated: 10, date: "2026-01-10", active: true },
  { category: "Conformance", table: "PERSON", severity: "Convention", violated: 0, date: "2026-03-01", active: false },
  { category: "Plausibility", table: "VISIT", violated: 55, date: "2026-02-15", active: true },
  { category: "Completeness", table: "DRUG", severity: "Fatal", violated: 3, date: "2026-05-20", active: false },
];

const defs: FilterDef<Row>[] = [
  { id: "category", label: "Category", control: { kind: "multiSelect" } },
  { id: "table", label: "Table", control: { kind: "singleSelect" } },
  { id: "severity", label: "Severity", control: { kind: "multiSelect" } },
  { id: "violated", label: "% violated", control: { kind: "numberRange" } },
  { id: "date", label: "Run date", control: { kind: "dateRange" } },
  { id: "active", label: "Active only", control: { kind: "bool" } },
];

describe("isActive", () => {
  it("treats empty selections and ranges as inactive", () => {
    expect(isActive(undefined)).toBe(false);
    expect(isActive({ op: "in", values: [] })).toBe(false);
    expect(isActive({ op: "range", min: undefined, max: undefined })).toBe(false);
    expect(isActive({ op: "contains", text: "  " })).toBe(false);
    expect(isActive({ op: "bool", value: false })).toBe(false);
  });
  it("treats any selection or bound as active", () => {
    expect(isActive({ op: "in", values: ["a"] })).toBe(true);
    expect(isActive({ op: "range", min: 1 })).toBe(true);
    expect(isActive({ op: "dateRange", to: "2026-01-01" })).toBe(true);
    expect(isActive({ op: "bool", value: true })).toBe(true);
  });
});

describe("matchesFilter", () => {
  const def = defs[0];
  it("in: membership on the stringified field", () => {
    expect(matchesFilter(def, { op: "in", values: ["Plausibility"] }, rows[0])).toBe(true);
    expect(matchesFilter(def, { op: "in", values: ["Conformance"] }, rows[0])).toBe(false);
  });
  it("range: inclusive bounds, missing value never matches", () => {
    const r = defs[3];
    expect(matchesFilter(r, { op: "range", min: 5, max: 20 }, rows[0])).toBe(true);
    expect(matchesFilter(r, { op: "range", min: 20 }, rows[0])).toBe(false);
  });
  it("dateRange: lexical ISO compare", () => {
    const d = defs[4];
    expect(matchesFilter(d, { op: "dateRange", from: "2026-02-01", to: "2026-04-01" }, rows[1])).toBe(true);
    expect(matchesFilter(d, { op: "dateRange", from: "2026-02-01" }, rows[0])).toBe(false);
  });
  it("bool: matches the raw truthiness", () => {
    expect(matchesFilter(defs[5], { op: "bool", value: true }, rows[0])).toBe(true);
    expect(matchesFilter(defs[5], { op: "bool", value: true }, rows[1])).toBe(false);
  });
});

describe("applyFilters", () => {
  it("returns all rows when nothing active", () => {
    expect(applyFilters(rows, {}, defs)).toHaveLength(4);
  });
  it("ORs within a field", () => {
    const out = applyFilters(rows, { category: { op: "in", values: ["Plausibility", "Conformance"] } }, defs);
    expect(out).toHaveLength(3);
  });
  it("ANDs across fields", () => {
    const out = applyFilters(
      rows,
      { category: { op: "in", values: ["Plausibility"] }, table: { op: "in", values: ["PERSON"] } },
      defs,
    );
    expect(out.map((r) => r.date)).toEqual(["2026-01-10"]);
  });
  it("missing severity never matches a severity filter", () => {
    const out = applyFilters(rows, { severity: { op: "in", values: ["Fatal"] } }, defs);
    expect(out).toHaveLength(2);
  });
  it("uses an accessor when given", () => {
    const upper: FilterDef<Row>[] = [
      { id: "cat", label: "Cat", control: { kind: "multiSelect" }, accessor: (r) => r.category.toUpperCase() },
    ];
    expect(applyFilters(rows, { cat: { op: "in", values: ["VISIT"] } }, upper)).toHaveLength(0);
    expect(applyFilters(rows, { cat: { op: "in", values: ["PLAUSIBILITY"] } }, upper)).toHaveLength(2);
  });
});

describe("deriveOptions", () => {
  it("is unique, non-empty and sorted; no counts by default", () => {
    expect(deriveOptions(defs[0], rows)).toEqual([
      { value: "Completeness", label: "Completeness" },
      { value: "Conformance", label: "Conformance" },
      { value: "Plausibility", label: "Plausibility" },
    ]);
  });
  it("attaches counts when asked", () => {
    const sev = deriveOptions(defs[2], rows, { withCounts: true });
    expect(sev).toEqual([
      { value: "Convention", label: "Convention", count: 1 },
      { value: "Fatal", label: "Fatal", count: 2 },
    ]);
  });
  it("deriveAllOptions only covers select fields; static passes through", () => {
    const withStatic: FilterDef<Row>[] = [
      ...defs,
      { id: "x", label: "X", control: { kind: "multiSelect" }, options: { source: "static", items: [{ value: "z", label: "Z" }] } },
    ];
    const all = deriveAllOptions(withStatic, rows);
    expect(Object.keys(all).sort()).toEqual(["category", "severity", "table", "x"]);
    expect(all.x).toEqual([{ value: "z", label: "Z" }]);
  });
});

describe("activeFilterCount", () => {
  it("sums multi-select values and counts other active facets once", () => {
    const count = activeFilterCount({
      category: { op: "in", values: ["Plausibility", "Conformance"] },
      violated: { op: "range", min: 1 },
      table: { op: "in", values: [] },
    });
    expect(count).toBe(3);
  });
});

describe("serializeFilters", () => {
  it("mirrors the DatasetFilters query shape", () => {
    const q = serializeFilters(
      {
        category: { op: "in", values: ["Plausibility", "Conformance"] },
        violated: { op: "range", min: 5, max: 90 },
        date: { op: "dateRange", from: "2026-01-01" },
        active: { op: "bool", value: true },
        table: { op: "in", values: [] },
      },
      defs,
    );
    expect(q).toEqual({
      category: "Plausibility,Conformance",
      "violated[gte]": "5",
      "violated[lte]": "90",
      "date[gte]": "2026-01-01",
      active: "true",
    });
  });
  it("honours a per-def serialize override", () => {
    const custom: FilterDef<Row>[] = [
      { id: "severity", label: "Severity", control: { kind: "multiSelect" }, serialize: (v) => (v.op === "in" ? { sev: v.values.join("|") } : {}) },
    ];
    expect(serializeFilters({ severity: { op: "in", values: ["Fatal", "Convention"] } }, custom)).toEqual({
      sev: "Fatal|Convention",
    });
  });
});
