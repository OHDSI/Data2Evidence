import { describe, it, expect } from "vitest";
import { isTruncated } from "../components/truncation";

describe("isTruncated", () => {
  it("is false when the content fits", () => {
    expect(isTruncated({ scrollWidth: 100, clientWidth: 100 })).toBe(false);
    expect(isTruncated({ scrollWidth: 80, clientWidth: 100 })).toBe(false);
  });

  it("is false for a sub-pixel overhang, which is rounding not truncation", () => {
    expect(isTruncated({ scrollWidth: 101, clientWidth: 100 })).toBe(false);
  });

  it("is true for a 1px overhang when the measured text is wider than its box", () => {
    expect(
      isTruncated({
        scrollWidth: 165,
        clientWidth: 164,
        textWidth: 164.64,
        boxWidth: 164,
      }),
    ).toBe(true);
  });

  it("is true when the rounded widths are equal but the measured text is wider than its box", () => {
    expect(
      isTruncated({
        scrollWidth: 165,
        clientWidth: 165,
        textWidth: 164.64,
        boxWidth: 164.5,
      }),
    ).toBe(true);
  });

  it("is false when the rounded widths are equal and the measured text fits its box", () => {
    expect(
      isTruncated({
        scrollWidth: 165,
        clientWidth: 165,
        textWidth: 164.2,
        boxWidth: 164.5,
      }),
    ).toBe(false);
  });

  it("is false for a 1px overhang when the measured text fits its box", () => {
    expect(
      isTruncated({
        scrollWidth: 101,
        clientWidth: 100,
        textWidth: 99.8,
        boxWidth: 100,
      }),
    ).toBe(false);
  });

  it("is true once the content genuinely overflows", () => {
    expect(isTruncated({ scrollWidth: 102, clientWidth: 100 })).toBe(true);
    expect(isTruncated({ scrollWidth: 400, clientWidth: 100 })).toBe(true);
  });
});
