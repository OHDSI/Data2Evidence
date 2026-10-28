import { describe, expect, it } from "vitest";
import { ICON_BUTTON_SIZE_MAP } from "../components/iconButtonSizes";

describe("IconButton size map", () => {
  it("maps sizes to the Figma container and icon dimensions", () => {
    expect(ICON_BUTTON_SIZE_MAP.xs).toEqual({ container: 20, icon: 13 });
    expect(ICON_BUTTON_SIZE_MAP.sm).toEqual({ container: 28, icon: 15 });
    expect(ICON_BUTTON_SIZE_MAP.md).toEqual({ container: 36, icon: 18 });
    expect(ICON_BUTTON_SIZE_MAP.lg).toEqual({ container: 44, icon: 21 });
  });
});
