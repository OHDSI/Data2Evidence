import { describe, it, expect } from "vitest";
import { filterAndSort } from "../TypeaheadField";

describe("filterAndSort", () => {
  it("should return all items when query is empty", () => {
    const items = [
      { label: "Alpha", value: "A1" },
      { label: "Beta", value: "B2" },
    ];
    expect(filterAndSort(items, "")).toEqual(items);
  });

  describe("text and value are different", () => {
    const items = [
      { label: "Alpha", value: "A1" },
      { label: "Alpha extended", value: "A1-A5" },
      { label: "Alpha minor", value: "A1.0" },
      { label: "Beta", value: "B2" },
    ];

    it("should match by value when label does not contain query", () => {
      const result = filterAndSort(items, "A1");
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.value)).toEqual(["A1", "A1-A5", "A1.0"]);
    });

    it("should match by label text", () => {
      const result = filterAndSort(items, "alpha");
      expect(result).toHaveLength(3);
      expect(result.map((r) => r.value)).toContain("A1");
      expect(result.map((r) => r.value)).toContain("A1-A5");
      expect(result.map((r) => r.value)).toContain("A1.0");
    });

    it("should not filter out items when query matches value but not label", () => {
      // Searching by value code "A1" — labels like "Alpha" don't contain "A1"
      // but should still appear because the value matches
      const result = filterAndSort(items, "A1");
      expect(result).not.toHaveLength(0);
      expect(result.find((r) => r.value === "A1")).toBeDefined();
      expect(result.find((r) => r.value === "A1-A5")).toBeDefined();
      expect(result.find((r) => r.value === "A1.0")).toBeDefined();
    });

    it("should prioritize exact value match over starts-with", () => {
      const result = filterAndSort(items, "A1");
      expect(result[0].value).toBe("A1");
    });
  });

  describe("text and value are the same", () => {
    const items = [
      { label: "A1", value: "A1" },
      { label: "A1.0", value: "A1.0" },
      { label: "B2", value: "B2" },
    ];

    it("should match items where label equals value", () => {
      const result = filterAndSort(items, "A1");
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({ label: "A1", value: "A1" });
      expect(result[1]).toEqual({ label: "A1.0", value: "A1.0" });
    });
  });

  describe("only value present (label falls back to value)", () => {
    const items = [
      { label: "A1", value: "A1" },
      { label: "A1-A5", value: "A1-A5" },
      { label: "B2", value: "B2" },
    ];

    it("should match via the fallback label that equals value", () => {
      const result = filterAndSort(items, "A1");
      expect(result).toHaveLength(2);
      expect(result.map((r) => r.value)).toEqual(["A1", "A1-A5"]);
    });

    it("should not match unrelated items", () => {
      const result = filterAndSort(items, "B2");
      expect(result).toHaveLength(1);
      expect(result[0].value).toBe("B2");
    });
  });

  describe("sorting priority", () => {
    it("should order exact > starts-with > contains", () => {
      const items = [
        { label: "contains abc in middle", value: "X3" },
        { label: "abc starts here", value: "X2" },
        { label: "abc", value: "X1" },
      ];
      const result = filterAndSort(items, "abc");
      expect(result[0].label).toBe("abc");
      expect(result[1].label).toBe("abc starts here");
      expect(result[2].label).toBe("contains abc in middle");
    });

    it("should order exact value match before starts-with value match", () => {
      const items = [
        { label: "Gamma", value: "A1.0" },
        { label: "Delta", value: "A1" },
      ];
      const result = filterAndSort(items, "A1");
      expect(result[0].value).toBe("A1");
      expect(result[1].value).toBe("A1.0");
    });
  });
});
