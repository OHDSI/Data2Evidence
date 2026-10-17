export const ICON_BUTTON_SIZE_MAP = {
  sm: { container: 40, icon: 18, padding: 11 },
  md: { container: 48, icon: 24, padding: 12 },
  lg: { container: 56, icon: 24, padding: 16 },
} as const;

export type D2eIconButtonSize = keyof typeof ICON_BUTTON_SIZE_MAP;
export type D2eIconButtonCategory = "primary" | "secondary" | "no-stroke";
