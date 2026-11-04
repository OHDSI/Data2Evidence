import { COLUMN_BY_KEY, displayValue } from './columns';
import type { DqdCheckRow } from './types';

/** Whether a row's visible cells contain the query, ignoring case and surrounding space. */
export function matchesSearch(row: DqdCheckRow, query: string, visibleKeys: readonly string[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return visibleKeys.some((key) => {
    const column = COLUMN_BY_KEY[key];
    return column ? String(displayValue(column, row)).toLowerCase().includes(needle) : false;
  });
}
