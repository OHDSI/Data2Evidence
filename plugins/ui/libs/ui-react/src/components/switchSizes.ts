export const SWITCH_SIZE_MAP = {
  sm: { mui: "small", scale: 1 },
  md: { mui: "medium", scale: 1 },
  lg: { mui: "medium", scale: 1.25 },
} as const;

export type SwitchSize = keyof typeof SWITCH_SIZE_MAP;
