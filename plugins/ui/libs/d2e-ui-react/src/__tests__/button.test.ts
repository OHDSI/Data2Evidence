import { describe, expect, it } from "vitest";
import { SIZE_MAP, VARIANT_MAP } from "../components/buttonVariants";

describe("D2eButton lookup tables", () => {
  it("maps every variant to its MUI variant", () => {
    expect(VARIANT_MAP.primary).toEqual({ muiVariant: "contained" });
    expect(VARIANT_MAP.secondary).toEqual({ muiVariant: "outlined" });
    expect(VARIANT_MAP.danger).toEqual({ muiVariant: "text" });
    expect(VARIANT_MAP.positive).toEqual({ muiVariant: "text" });
    expect(VARIANT_MAP.ghost).toEqual({ muiVariant: "text" });
  });

  it("maps the Figma button sizes (XS/SM/MD/LG)", () => {
    expect(SIZE_MAP.xs).toEqual({ height: 20, font: 10, minWidth: 36, icon: 13 });
    expect(SIZE_MAP.sm).toEqual({ height: 28, font: 12, minWidth: 50, icon: 15 });
    expect(SIZE_MAP.md).toEqual({ height: 36, font: 14, minWidth: 64, icon: 18 });
    expect(SIZE_MAP.lg).toEqual({ height: 44, font: 16, minWidth: 78, icon: 21 });
  });
});
