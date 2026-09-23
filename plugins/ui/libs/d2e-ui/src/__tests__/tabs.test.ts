import { describe, expect, it } from "vitest";
import { TABS_STYLE_MAP } from "../components/tabsStyles";

describe("D2eTabs style map", () => {
  it("matches the Figma tab row (1801:210538)", () => {
    expect(TABS_STYLE_MAP).toEqual({
      height: 40,
      paddingX: 24,
      paddingY: 10,
      gap: 10,
      iconSize: 16,
      activeBorderWidth: 3,
      rowBorderWidth: 1,
    });
  });
});
