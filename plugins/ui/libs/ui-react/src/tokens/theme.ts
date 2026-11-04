import { createTheme, type Theme } from "@mui/material/styles";
import { tokens } from "./tokens";

// The flat `d2e` colour map, carried verbatim from the Vue library's Vuetify
// theme and attached to the MUI theme as `theme.d2e.colors`. Values reference
// `tokens` where one exists, else keep the existing literal.
// Vuetify-style colour map exposed as `theme.d2e.colors`. Every value derives
// from `tokens` (single source of truth) — semantics use the D2E functional
// palette, surfaces/borders use D2E neutrals.
export function buildColors(): Record<string, string> {
  const c = tokens.color;
  return {
    // Primary
    primary: c.primary,
    "primary-darken-1": c.primaryDarken,
    "primary-lighten-1": c.primaryLight,
    // Secondary
    secondary: c.secondary,
    "secondary-darken-1": c.secondaryDark,
    "secondary-lighten-1": c.secondaryLight,
    tertiary: c.tertiary,
    // Semantic (D2E functional palette; D2E has no distinct info, so info = navy)
    success: c.success,
    info: c.primary,
    warning: c.warning,
    error: c.alarm,
    // Feedback
    "feedback-success": c.success,
    "feedback-warning": c.warning,
    "feedback-error": c.danger,
    "feedback-alarm": c.alarm,
    // Surfaces
    background: c.white,
    surface: c.white,
    "surface-variant": c.neutralLighter,
    // Text
    "on-primary": c.white,
    "on-secondary": c.white,
    "on-background": c.primary,
    "on-surface": c.primary,
    "primary-hover": c.primaryHover,
    "primary-info": c.primaryInfo,
    // Borders (D2E neutrals)
    "border-color": c.neutralLighter,
    "border-light": c.neutralLighter,
    "border-medium": c.neutralLight,
  };
}

// React counterpart of the Vue library's `buildVuetifyOptions()`: maps the
// same palette, type scale and radius into an MUI theme. Raw CSS variables
// still come from `tokens.css`.
export function buildMuiTheme(): Theme {
  const colors = buildColors();
  const f = tokens.font;

  return createTheme({
    palette: {
      mode: "light",
      primary: {
        main: colors.primary,
        dark: colors["primary-darken-1"],
        light: colors["primary-lighten-1"],
        contrastText: colors["on-primary"],
      },
      secondary: {
        main: colors.secondary,
        dark: colors["secondary-darken-1"],
        light: colors["secondary-lighten-1"],
        contrastText: colors["on-secondary"],
      },
      // MUI semantic colors map to the D2E functional palette (not the Vuetify
      // Bootstrap compat values in `colors`), so palette-driven bits like field
      // error text / `color="error|success|warning"` are on-brand. D2E has no
      // distinct info colour, so info uses primary (navy).
      success: { main: tokens.color.success },
      info: { main: tokens.color.primary },
      warning: { main: tokens.color.warning },
      error: { main: tokens.color.alarm },
      background: {
        default: colors.background,
        paper: colors.surface,
      },
      text: {
        primary: colors["on-background"],
        secondary: tokens.color.textSecondary,
      },
      divider: colors["border-color"],
    },
    shape: {
      borderRadius: tokens.radius.md,
    },
    typography: {
      fontFamily: f.family,
      h1: typeScale(f.heading1),
      h2: typeScale(f.heading2),
      h3: typeScale(f.heading3),
      h4: typeScale(f.heading4),
      h5: typeScale(f.heading5),
      subtitle1: typeScale(f.subtitle1),
      subtitle2: typeScale(f.subtitle2),
      body1: typeScale(f.body1),
      body2: typeScale(f.body2),
      caption: typeScale(f.caption1),
      button: { ...typeScale(f.button), textTransform: "none" },
    },
    components: {
      MuiButton: {
        styleOverrides: {
          root: { textTransform: "none" },
        },
      },
      // Menu-item rows (Figma "Menu item"): black text, hover = 4% black
      // overlay, selected = 12% black overlay — never a navy/primary tint.
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontFamily: f.family,
            fontSize: f.body1.size,
            letterSpacing: "0.15px",
            minHeight: 40,
            color: tokens.color.neutralBlack,
            "&:hover, &.Mui-focusVisible": {
              backgroundColor: "rgba(0,0,0,0.04)",
            },
            "&.Mui-selected, &.Mui-selected:hover, &.Mui-selected.Mui-focusVisible": {
              backgroundColor: "rgba(0,0,0,0.12)",
            },
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          // Text/size only. MUI tints the selected option navy via a rule that
          // Autocomplete's `option` styleOverrides can't reach, so the hover /
          // selected greys are pinned in Select.scss instead.
          option: {
            fontFamily: f.family,
            fontSize: f.body1.size,
            letterSpacing: "0.15px",
            minHeight: 40,
            color: tokens.color.neutralBlack,
          },
        },
      },
    },
    d2e: { colors },
  });
}

function typeScale(scale: {
  size: number;
  weight: number;
  lineHeight: number | string;
  letterSpacing: string;
}) {
  return {
    fontSize: scale.size,
    fontWeight: scale.weight,
    lineHeight: scale.lineHeight,
    letterSpacing: scale.letterSpacing,
  };
}

declare module "@mui/material/styles" {
  interface Theme {
    d2e: { colors: Record<string, string> };
  }
  interface ThemeOptions {
    d2e?: { colors: Record<string, string> };
  }
}
