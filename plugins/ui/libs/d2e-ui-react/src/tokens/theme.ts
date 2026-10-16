import { createTheme, type Theme } from "@mui/material/styles";
import { tokens } from "./tokens";

// The flat `d2e` colour map, carried verbatim from the Vue library's Vuetify
// theme and attached to the MUI theme as `theme.d2e.colors`. Values reference
// `tokens` where one exists, else keep the existing literal.
export function buildD2eColors(): Record<string, string> {
  return {
    // Primary colors
    primary: tokens.color.primary,
    "primary-darken-1": "#000066",
    "primary-lighten-1": tokens.color.primaryLight,
    // Secondary colors
    secondary: tokens.color.secondary,
    "secondary-darken-1": "#e75248",
    "secondary-lighten-1": "#ffa19d",
    tertiary: "#ffd2c3",
    // Semantic colors matching Bootstrap variables
    success: "#28a745",
    info: "#17a2b8",
    warning: "#ffc107",
    error: "#dc3545",
    // Feedback colors
    "feedback-success": tokens.color.success,
    "feedback-warning": tokens.color.warning,
    "feedback-error": tokens.color.danger,
    "feedback-alarm": "#d53939",
    // Neutral colors
    background: tokens.color.white,
    surface: "#f9f9f9",
    "surface-variant": "#e5e5e5",
    // Text colors
    "on-primary": tokens.color.white,
    "on-secondary": tokens.color.white,
    "on-background": tokens.color.primary,
    "on-surface": tokens.color.primary,
    "primary-hover": "#007eba",
    "primary-info": "#007cc0",
    // Border colors (Bootstrap gray scale)
    "border-color": "#dee2e6",
    "border-light": "#dddddd",
    "border-medium": "#cccccc",
  };
}

// React counterpart of the Vue library's `buildD2eVuetifyOptions()`: maps the
// same palette, type scale and radius into an MUI theme. Raw CSS variables
// still come from `tokens.css`.
export function buildD2eMuiTheme(): Theme {
  const colors = buildD2eColors();
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
      success: { main: colors.success },
      info: { main: colors.info },
      warning: { main: colors.warning },
      error: { main: colors.error },
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
      MuiMenuItem: {
        styleOverrides: {
          root: {
            fontFamily: f.family,
            fontSize: f.body1.size,
            letterSpacing: "0.15px",
            minHeight: 40,
            "&.Mui-selected, &.Mui-selected:hover": {
              backgroundColor: "rgba(0,0,0,0.12)",
            },
          },
        },
      },
      MuiAutocomplete: {
        styleOverrides: {
          option: {
            fontFamily: f.family,
            fontSize: f.body1.size,
            letterSpacing: "0.15px",
            minHeight: 40,
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
