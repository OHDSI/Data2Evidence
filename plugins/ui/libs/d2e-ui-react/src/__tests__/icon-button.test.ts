import { describe, expect, it } from "vitest";
import { ICON_BUTTON_SIZE_MAP } from "../components/iconButtonSizes";

describe("D2eIconButton size map", () => {
  it("maps sizes to the Figma container and icon dimensions", () => {
    expect(ICON_BUTTON_SIZE_MAP.sm).toEqual({ container: 40, icon: 18, padding: 11 });
    expect(ICON_BUTTON_SIZE_MAP.md).toEqual({ container: 48, icon: 24, padding: 12 });
    expect(ICON_BUTTON_SIZE_MAP.lg).toEqual({ container: 56, icon: 24, padding: 16 });
  });
});
