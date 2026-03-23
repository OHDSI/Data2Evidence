import { formatNumber } from "../utils";

describe("formatNumber", () => {
  it("formats large integers with thousands separators", () => {
    expect(formatNumber(1234567)).toBe("1,234,567");
    expect(formatNumber(1000)).toBe("1,000");
    expect(formatNumber(10000)).toBe("10,000");
    expect(formatNumber(1000000)).toBe("1,000,000");
  });

  it("formats numbers smaller than 1000 without separators", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(100)).toBe("100");
  });

  it("formats numbers with decimal parts correctly", () => {
    expect(formatNumber(1234.56)).toBe("1,234.56");
    expect(formatNumber(1234567.89)).toBe("1,234,567.89");
  });

  it("parses numeric strings and formats them", () => {
    expect(formatNumber("2326856")).toBe("2,326,856");
    expect(formatNumber("1000")).toBe("1,000");
    expect(formatNumber("999")).toBe("999");
  });

  it("returns non-numeric strings as-is", () => {
    expect(formatNumber("omop5-4")).toBe("omop5-4");
    expect(formatNumber("2021-01-01")).toBe("2021-01-01");
    expect(formatNumber('{"key": "value"}')).toBe('{"key": "value"}');
  });

  it("returns empty string for null, undefined, or empty string", () => {
    expect(formatNumber(null)).toBe("");
    expect(formatNumber(undefined)).toBe("");
    expect(formatNumber("")).toBe("");
  });

  it("formats negative numbers correctly", () => {
    expect(formatNumber(-1234567)).toBe("-1,234,567");
    expect(formatNumber(-1000)).toBe("-1,000");
  });
});
