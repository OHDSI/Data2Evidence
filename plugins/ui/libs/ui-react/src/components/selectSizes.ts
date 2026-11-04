export const SELECT_SIZE_MAP = {
  sm: { height: 40 },
  md: { height: 48 },
} as const;

export type SelectSize = keyof typeof SELECT_SIZE_MAP;

export interface SelectItem {
  label: string;
  value: string;
  disabled?: boolean;
}
