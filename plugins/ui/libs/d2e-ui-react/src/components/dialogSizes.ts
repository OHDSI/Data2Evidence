export const DIALOG_SIZE_MAP = { s: 540, l: 900, xl: 1200 } as const;

export type D2eDialogSize = keyof typeof DIALOG_SIZE_MAP;
