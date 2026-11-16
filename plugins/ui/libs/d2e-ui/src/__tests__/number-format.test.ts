import { describe, expect, it } from "vitest";
import { formatNumber } from "../components/numberFormat";

describe("formatNumber", () => {
  it("groups thousands for the given locale", () => {
    expect(formatNumber(2340, "en")).toBe("2,340");
    expect(formatNumber(2340, "de")).toBe("2.340");
    expect(formatNumber(1234567, "en")).toBe("1,234,567");
  });

  it("follows the locale's own separator", () => {
    expect(formatNumber(2340, "ru")).toBe(
      new Intl.NumberFormat("ru").format(2340),
    );
    expect(formatNumber(2340, "ru")).not.toBe("2340");
  });

  it("uses English when no locale is given", () => {
    expect(formatNumber(2340)).toBe("2,340");
  });

  it("uses English when the locale is not a valid tag", () => {
    expect(formatNumber(2340, "default")).toBe("2,340");
    expect(formatNumber(2340, "")).toBe("2,340");
  });

  it("keeps the fraction digits", () => {
    expect(formatNumber(1234.5678, "en")).toBe("1,234.5678");
  });

  it("does not group numbers below one thousand", () => {
    expect(formatNumber(0, "en")).toBe("0");
    expect(formatNumber(999, "en")).toBe("999");
  });

  it("shows a value that is not finite as it is", () => {
    expect(formatNumber(Number.NaN, "en")).toBe("NaN");
    expect(formatNumber(Number.POSITIVE_INFINITY, "en")).toBe("Infinity");
  });
});
