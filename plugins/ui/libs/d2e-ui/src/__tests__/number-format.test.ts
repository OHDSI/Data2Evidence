import { describe, expect, it } from "vitest";
import { formatNumber } from "../components/numberFormat";

describe("formatNumber", () => {
  it("groups thousands with a comma", () => {
    expect(formatNumber(2340)).toBe("2,340");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("keeps the fraction digits after a period", () => {
    expect(formatNumber(1234.5678)).toBe("1,234.5678");
  });

  it("does not group numbers below one thousand", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });

  it("shows a value that is not finite as it is", () => {
    expect(formatNumber(Number.NaN)).toBe("NaN");
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe("Infinity");
  });
});
