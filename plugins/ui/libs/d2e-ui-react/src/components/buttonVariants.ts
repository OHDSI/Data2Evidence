export const VARIANT_MAP = {
  primary: { muiVariant: "contained" },
  secondary: { muiVariant: "outlined" },
  danger: { muiVariant: "text" },
  positive: { muiVariant: "text" },
  ghost: { muiVariant: "text" },
} as const;

export const SIZE_MAP = {
  xs: { height: 20, font: 10, minWidth: 36, icon: 13 },
  sm: { height: 28, font: 12, minWidth: 50, icon: 15 },
  md: { height: 36, font: 14, minWidth: 64, icon: 18 },
  lg: { height: 44, font: 16, minWidth: 78, icon: 21 },
} as const;

export type D2eButtonVariant = keyof typeof VARIANT_MAP;
export type D2eButtonSize = keyof typeof SIZE_MAP;
