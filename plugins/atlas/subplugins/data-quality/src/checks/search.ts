import { COLUMN_BY_KEY } from './columns';
import type { DqdCheckRow } from './types';

/** Whether a row's visible cells contain the query, ignoring case and surrounding space. */
export function matchesSearch(row: DqdCheckRow, query: string, visibleKeys: readonly string[]): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return visibleKeys.some((key) => {
    const column = COLUMN_BY_KEY[key];
    return column ? String(column.value(row)).toLowerCase().includes(needle) : false;
  });
}
