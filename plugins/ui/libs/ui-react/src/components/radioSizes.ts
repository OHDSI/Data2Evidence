export const RADIO_SIZE_MAP = {
  sm: { box: 20, padding: 9 },
  md: { box: 24, padding: 9 },
} as const;

export type RadioSize = keyof typeof RADIO_SIZE_MAP;
