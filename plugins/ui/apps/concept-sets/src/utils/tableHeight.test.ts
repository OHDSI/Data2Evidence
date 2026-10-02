import { describe, expect, it } from "vitest";

import { TABLE_BOTTOM_GAP, getAvailableTableHeight } from "./tableHeight";

describe("getAvailableTableHeight", () => {
  it("fills the viewport below the table top, less the bottom gap", () => {
    expect(getAvailableTableHeight(930, 250)).toBe(
      930 - 250 - TABLE_BOTTOM_GAP
    );
  });

  it("stays inside a short viewport instead of overflowing it", () => {
    expect(getAvailableTableHeight(465, 207)).toBe(
      465 - 207 - TABLE_BOTTOM_GAP
    );
  });

  it("never returns a negative height when no space is left", () => {
    expect(getAvailableTableHeight(930, 1200)).toBe(0);
  });
});
