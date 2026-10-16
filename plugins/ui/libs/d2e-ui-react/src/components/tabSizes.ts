export const TAB_SIZE_MAP = {
  default: { height: 52, font: 16 },
  small: { height: 40, font: 14 },
} as const;

export type D2eTabSize = keyof typeof TAB_SIZE_MAP;
