export const DIALOG_SIZE_MAP = { s: 540, l: 900, xl: 1200 } as const;

export type DialogSize = keyof typeof DIALOG_SIZE_MAP;
