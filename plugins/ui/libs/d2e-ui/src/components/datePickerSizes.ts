export const DATE_PICKER_SIZE_MAP = {
  sm: { height: 32 },
  md: { height: 40 },
} as const;

export type D2eDatePickerSize = keyof typeof DATE_PICKER_SIZE_MAP;

export type D2eDatePickerIconPosition = "append" | "prepend";
