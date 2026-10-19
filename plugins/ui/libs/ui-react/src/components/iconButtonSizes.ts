export const ICON_BUTTON_SIZE_MAP = {
  sm: { container: 40, icon: 18, padding: 11 },
  md: { container: 48, icon: 24, padding: 12 },
  lg: { container: 56, icon: 24, padding: 16 },
} as const;

export type IconButtonSize = keyof typeof ICON_BUTTON_SIZE_MAP;
export type IconButtonCategory = "primary" | "secondary" | "no-stroke";
