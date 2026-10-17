export const SELECT_SIZE_MAP = {
  sm: { height: 40 },
  md: { height: 48 },
} as const;

export type D2eSelectSize = keyof typeof SELECT_SIZE_MAP;

export interface D2eSelectItem {
  label: string;
  value: string;
  disabled?: boolean;
}
