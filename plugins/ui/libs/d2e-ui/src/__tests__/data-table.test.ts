import { describe, expect, it } from "vitest";
import {
  DATA_TABLE_STYLE_MAP,
  nextSort,
  pageCount,
  pageRange,
} from "../components/dataTable";

describe("D2eDataTable style map", () => {
  it("matches the Figma table (2855:278875, 2855:278884, 1783:373766)", () => {
    expect(DATA_TABLE_STYLE_MAP).toEqual({
      headerHeight: 52,
      rowHeight: 48,
      cellPaddingX: 16,
      expandColumnWidth: 48,
      expandButtonSize: 32,
      detailLineHeight: 32,
      detailLabelWidth: 140,
      itemsPerPageOptions: [10, 25, 50],
      defaultItemsPerPage: 10,
      sortIcons: {
        none: "mdi-swap-vertical",
        asc: "mdi-arrow-up",
        desc: "mdi-arrow-down",
      },
    });
  });
});

describe("nextSort", () => {
  it("cycles one column through asc, desc and off", () => {
    const asc = nextSort([], "name");
    expect(asc).toEqual([{ key: "name", order: "asc" }]);
    const desc = nextSort(asc, "name");
    expect(desc).toEqual([{ key: "name", order: "desc" }]);
    expect(nextSort(desc, "name")).toEqual([]);
  });

  it("starts a different column at asc, replacing the old sort", () => {
    expect(nextSort([{ key: "name", order: "desc" }], "table")).toEqual([
      { key: "table", order: "asc" },
    ]);
  });

  it("does not mutate its input", () => {
    const current = [{ key: "name", order: "asc" as const }];
    nextSort(current, "name");
    expect(current).toEqual([{ key: "name", order: "asc" }]);
  });
});

describe("pageRange", () => {
  it("is 1-based and inclusive", () => {
    expect(pageRange(1, 10, 123)).toEqual({ start: 1, end: 10, total: 123 });
  });

  it("stops at the last row on the last page", () => {
    expect(pageRange(13, 10, 123)).toEqual({
      start: 121,
      end: 123,
      total: 123,
    });
  });

  it("is 0-0 when there are no rows", () => {
    expect(pageRange(1, 10, 0)).toEqual({ start: 0, end: 0, total: 0 });
  });
});

describe("pageCount", () => {
  it("is at least one page", () => {
    expect(pageCount(10, 0)).toBe(1);
  });

  it("rounds up", () => {
    expect(pageCount(10, 123)).toBe(13);
    expect(pageCount(25, 50)).toBe(2);
  });
});
