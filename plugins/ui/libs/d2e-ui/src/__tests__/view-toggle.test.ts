import { describe, expect, it } from "vitest";
import { VIEW_TOGGLE_STYLE_MAP } from "../components/viewToggle";

describe("D2eViewToggle style map", () => {
  it("matches the Figma grid/list toggle (4530:449313)", () => {
    expect(VIEW_TOGGLE_STYLE_MAP).toEqual({
      width: 100,
      height: 44,
      borderColor: "#e3e3e3",
      selectedBackground: "#e2e2e2",
      defaultIconSize: 20,
    });
  });
});
