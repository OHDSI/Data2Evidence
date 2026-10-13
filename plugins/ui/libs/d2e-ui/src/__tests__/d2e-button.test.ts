import { describe, expect, it } from "vitest";
import {
  BUTTON_SIZE_SPEC,
  SIZE_MAP,
  VARIANT_MAP,
} from "../components/buttonVariants";
import { tokens } from "../tokens/tokens";

describe("D2eButton lookup tables", () => {
  it("maps every variant to the Vuetify variant/color pair", () => {
    expect(VARIANT_MAP.primary).toEqual({ variant: "flat", color: "primary" });
    expect(VARIANT_MAP.secondary).toEqual({
      variant: "outlined",
      color: "primary",
    });
    expect(VARIANT_MAP.danger).toEqual({
      variant: "flat",
      color: "feedback-error",
    });
    expect(VARIANT_MAP.ghost).toEqual({ variant: "text", color: "primary" });
  });

  it("maps every size to the Vuetify size value", () => {
    expect(SIZE_MAP.sm).toBe("small");
    expect(SIZE_MAP.md).toBeUndefined();
    expect(SIZE_MAP.lg).toBe("large");
  });

  it("gives each size the design system height and label size", () => {
    expect(BUTTON_SIZE_SPEC.sm).toEqual({ height: 28, fontSize: 12 });
    expect(BUTTON_SIZE_SPEC.md).toEqual({ height: 36, fontSize: 14 });
    expect(BUTTON_SIZE_SPEC.lg).toEqual({ height: 44, fontSize: 16 });
  });

  it("keeps the default label size token at the md size", () => {
    expect(tokens.font.button.size).toBe(BUTTON_SIZE_SPEC.md.fontSize);
  });
});
