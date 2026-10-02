export const MIN_TABLE_HEIGHT = 320;
export const TABLE_BOTTOM_GAP = 42;

export const getAvailableTableHeight = (
  viewportHeight: number,
  tableTop: number
): number =>
  Math.max(MIN_TABLE_HEIGHT, viewportHeight - tableTop - TABLE_BOTTOM_GAP);
