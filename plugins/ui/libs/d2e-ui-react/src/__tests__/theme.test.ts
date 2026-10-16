import { describe, expect, it } from "vitest";
import { buildD2eColors, buildD2eMuiTheme } from "../tokens/theme";

// The flat `d2e` colour map carried verbatim from the Vue library's Vuetify
// theme. Values are unchanged; these assertions guard against silent drops and
// accidental drift.
const EXPECTED_COLORS = {
  primary: "#000080",
  "primary-darken-1": "#000066",
  "primary-lighten-1": "#333399",
  secondary: "#ff5e59",
  "secondary-darken-1": "#e75248",
  "secondary-lighten-1": "#ffa19d",
  tertiary: "#ffd2c3",
  success: "#28a745",
  info: "#17a2b8",
  warning: "#ffc107",
  error: "#dc3545",
  "feedback-success": "#00855f",
  "feedback-warning": "#f89c0e",
  "feedback-error": "#a3293d",
  "feedback-alarm": "#d53939",
  background: "#ffffff",
  surface: "#f9f9f9",
  "surface-variant": "#e5e5e5",
  "on-primary": "#ffffff",
  "on-secondary": "#ffffff",
  "on-background": "#000080",
  "on-surface": "#000080",
  "primary-hover": "#007eba",
  "primary-info": "#007cc0",
  "border-color": "#dee2e6",
  "border-light": "#dddddd",
  "border-medium": "#cccccc",
} as const;

function normalizeHex(color: string): string {
  const hex = color.toLowerCase().replace(/^#/, "");
  if (hex.length === 3 || hex.length === 4) {
    return `#${hex
      .split("")
      .map((ch) => ch + ch)
      .join("")}`;
  }
  return `#${hex}`;
}

function isCssHexColor(value: string): boolean {
  return /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(value);
}

describe("buildD2eColors", () => {
  const colors = buildD2eColors();

  it("exposes exactly the expected colour keys", () => {
    expect(Object.keys(colors).sort()).toEqual(
      Object.keys(EXPECTED_COLORS).sort(),
    );
  });

  it("keeps every colour value identical to the snapshot", () => {
    for (const key of Object.keys(EXPECTED_COLORS)) {
      expect(normalizeHex(colors[key])).toBe(
        normalizeHex(EXPECTED_COLORS[key as keyof typeof EXPECTED_COLORS]),
      );
    }
  });

  it("emits only valid CSS colours", () => {
    for (const value of Object.values(colors)) {
      expect(isCssHexColor(value)).toBe(true);
    }
  });
});

describe("buildD2eMuiTheme", () => {
  const theme = buildD2eMuiTheme();

  it("maps the primary palette from tokens", () => {
    expect(normalizeHex(theme.palette.primary.main)).toBe("#000080");
    expect(normalizeHex(theme.palette.primary.dark)).toBe("#000066");
    expect(normalizeHex(theme.palette.primary.light)).toBe("#333399");
  });

  it("carries the full flat colour map on theme.d2e.colors", () => {
    expect(Object.keys(theme.d2e.colors).sort()).toEqual(
      Object.keys(EXPECTED_COLORS).sort(),
    );
  });

  it("uses the token radius as the shape radius", () => {
    expect(theme.shape.borderRadius).toBe(8);
  });
});
