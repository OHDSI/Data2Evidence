export const TABLE_BOTTOM_GAP = 42;

export const getAvailableTableHeight = (
  viewportHeight: number,
  tableTop: number
): number => Math.max(0, viewportHeight - tableTop - TABLE_BOTTOM_GAP);
