import { describe, expect, it } from "vitest";
import { generateTokensCss } from "../../scripts/build-tokens";

describe("tokens.css generator", () => {
  it("emits the generated banner as the first line", () => {
    const css = generateTokensCss();
    expect(
      css.startsWith(
        "/* GENERATED — DO NOT EDIT.\n * Source: src/tokens/tokens.ts."
      )
    ).toBe(true);
  });

  it("is deterministic across two runs", () => {
    expect(generateTokensCss()).toBe(generateTokensCss());
  });

  it("kebab-cases camelCase token keys", () => {
    const css = generateTokensCss();
    expect(css).toContain("--d2e-color-primary-xtra-lightest: #E5E6F2;");
    expect(css).toContain("--d2e-font-heading4-letter-spacing: -2px;");
  });

  it("appends px to numeric spacing and radius values", () => {
    const css = generateTokensCss();
    expect(css).toContain("--d2e-spacing-xs: 8px;");
    expect(css).toContain("--d2e-radius-md: 8px;");
  });

  it("emits color, family and elevation tokens", () => {
    const css = generateTokensCss();
    expect(css).toContain("--d2e-color-danger: #A3293D;");
    expect(css).toContain("--d2e-font-family:");
    expect(css).toContain("--d2e-elevation-e16:");
  });
});
