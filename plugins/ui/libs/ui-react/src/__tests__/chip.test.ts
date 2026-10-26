import { describe, expect, it } from "vitest";
import { CHIP_VARIANT_MAP } from "../components/chipVariants";

describe("Chip variant map", () => {
  it("maps every variant to the Figma background/text pair", () => {
    expect(CHIP_VARIANT_MAP.positive).toEqual({
      background: "var(--d2e-color-success-light)",
      color: "var(--d2e-color-success)",
    });
    expect(CHIP_VARIANT_MAP.warning).toEqual({
      background: "var(--d2e-color-warning-light)",
      color: "var(--d2e-color-warning-text)",
    });
    expect(CHIP_VARIANT_MAP.negative).toEqual({
      background: "var(--d2e-color-alarm-light)",
      color: "var(--d2e-color-alarm)",
    });
    expect(CHIP_VARIANT_MAP.neutral).toEqual({
      background: "var(--d2e-color-neutral-lightest)",
      color: "var(--d2e-color-neutral)",
    });
    expect(CHIP_VARIANT_MAP.multiselect).toEqual({
      background: "var(--d2e-color-support-blue-light)",
      color: "var(--d2e-color-primary)",
    });
  });

  it("maps the dataset-status variants", () => {
    expect(CHIP_VARIANT_MAP["have-access"].color).toBe(
      "var(--d2e-color-success)",
    );
    expect(CHIP_VARIANT_MAP["pending-access"].color).toBe(
      "var(--d2e-color-warning-text)",
    );
    expect(CHIP_VARIANT_MAP.locked.color).toBe("var(--d2e-color-alarm)");
  });
});
