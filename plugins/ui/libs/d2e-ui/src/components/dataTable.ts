// Figma: the Data quality checks table — header row 2855:278875, body row
// 2855:278884, pagination 2855:278894 and the expanded detail 1783:373766 (D2E
// WebApp main file), built from the Table cell set 2445:7589 and Pagination
// 2105:169 in the design-system file.
export const DATA_TABLE_STYLE_MAP = {
  headerHeight: 52,
  rowHeight: 48,
  cellPaddingX: 16,
  expandColumnWidth: 48,
  expandButtonSize: 32,
  detailLineHeight: 32,
  detailLabelWidth: 140,
  itemsPerPageOptions: [10, 25, 50],
  defaultItemsPerPage: 10,
  sortIcons: {
    none: "mdi-swap-vertical",
    asc: "mdi-arrow-up",
    desc: "mdi-arrow-down",
  },
} as const;

export interface D2eDataTableHeader {
  key: string;
  title: string;
  sortable?: boolean;
  width?: number | string;
}

export interface D2eSortItem {
  key: string;
  order: "asc" | "desc";
}

/**
 * The next sort after a header click. One column at a time, cycling
 * none -> asc -> desc -> none; a different column starts again at asc.
 */
export function nextSort(
  current: readonly D2eSortItem[],
  key: string,
): D2eSortItem[] {
  const active = current.find((item) => item.key === key);
  if (!active) return [{ key, order: "asc" }];
  if (active.order === "asc") return [{ key, order: "desc" }];
  return [];
}

/** The rows a page shows, 1-based and inclusive; 0-0 when there are none. */
export function pageRange(
  page: number,
  itemsPerPage: number,
  total: number,
): { start: number; end: number; total: number } {
  if (total <= 0) return { start: 0, end: 0, total: 0 };
  const start = (page - 1) * itemsPerPage + 1;
  return { start, end: Math.min(page * itemsPerPage, total), total };
}

/** How many pages the rows fill. Never less than one, so page 1 always exists. */
export function pageCount(itemsPerPage: number, total: number): number {
  return Math.max(1, Math.ceil(total / itemsPerPage));
}
