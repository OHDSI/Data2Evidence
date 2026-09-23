import { describe, expect, it } from "vitest";
import { SPLIT_BUTTON_STYLE_MAP } from "../components/splitButton";

describe("D2eSplitButton style map", () => {
  it("matches the Figma split button (2855:278235)", () => {
    expect(SPLIT_BUTTON_STYLE_MAP).toEqual({
      height: 40,
      radius: 8,
      paddingX: 16,
      iconSize: 22,
      chevronWidth: 40,
      menuWidth: 177,
    });
  });
});
