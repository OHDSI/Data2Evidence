export const CHECKBOX_SIZE_MAP = {
  sm: { box: 20, padding: 9, ripple: 34 },
  md: { box: 24, padding: 9, ripple: 38 },
} as const;

export type D2eCheckboxSize = keyof typeof CHECKBOX_SIZE_MAP;
