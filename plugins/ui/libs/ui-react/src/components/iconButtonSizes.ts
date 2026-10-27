// Sizes match Button: XS 20 / SM 28 / MD 36 (default) / LG 44px, icons
// 13/15/18/21px, 8px radius (Figma "Icon button").
export const ICON_BUTTON_SIZE_MAP = {
  xs: { container: 20, icon: 13 },
  sm: { container: 28, icon: 15 },
  md: { container: 36, icon: 18 },
  lg: { container: 44, icon: 21 },
} as const;

export type IconButtonSize = keyof typeof ICON_BUTTON_SIZE_MAP;
export type IconButtonCategory = "primary" | "secondary" | "no-stroke";
