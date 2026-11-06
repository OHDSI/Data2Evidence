import { applyFilters, type CheckFilters } from './filters';
import { matchesSearch } from './search';
import { sortRows, type CheckSort } from './sort';
import type { DqdCheckRow } from './types';

export interface ViewState {
  query: string;
  filters: CheckFilters;
  sortBy: readonly CheckSort[];
  visibleKeys: readonly string[];
}

/** The rows the table shows, in the order it shows them - and what Download exports. */
export function visibleRows(rows: readonly DqdCheckRow[], view: ViewState): DqdCheckRow[] {
  const searched = rows.filter((row) => matchesSearch(row, view.query, view.visibleKeys));
  return sortRows(applyFilters(searched, view.filters), view.sortBy);
}
