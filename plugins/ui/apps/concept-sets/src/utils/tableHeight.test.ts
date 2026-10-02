import { describe, expect, it } from "vitest";

import {
  MIN_TABLE_HEIGHT,
  TABLE_BOTTOM_GAP,
  getAvailableTableHeight,
} from "./tableHeight";

describe("getAvailableTableHeight", () => {
  it("fills the viewport below the table top, less the bottom gap", () => {
    expect(getAvailableTableHeight(930, 250)).toBe(
      930 - 250 - TABLE_BOTTOM_GAP
    );
  });

  it("never returns less than the minimum height on a short viewport", () => {
    expect(getAvailableTableHeight(400, 300)).toBe(MIN_TABLE_HEIGHT);
  });

  it("keeps the minimum when the table top is below the viewport", () => {
    expect(getAvailableTableHeight(930, 1200)).toBe(MIN_TABLE_HEIGHT);
  });
});
