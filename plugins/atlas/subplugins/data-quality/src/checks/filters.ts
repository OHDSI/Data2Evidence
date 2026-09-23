import { deriveStatus, STATUS_ORDER, type CheckStatus } from './status';
import type { DqdCheckRow } from './types';

/** The Filters panel's selections. An empty list means "any". */
export interface CheckFilters {
  category: string[];
  subcategory: string[];
  context: string[];
  cdmTableName: string[];
  checkLevel: string[];
  status: CheckStatus[];
}

type TextField = Exclude<keyof CheckFilters, 'status'>;
const TEXT_FIELDS: TextField[] = ['category', 'subcategory', 'context', 'cdmTableName', 'checkLevel'];

export const emptyFilters = (): CheckFilters => ({
  category: [],
  subcategory: [],
  context: [],
  cdmTableName: [],
  checkLevel: [],
  status: [],
});

/** AND across fields, OR within one: "Plausibility or Conformance, in PERSON". */
export function applyFilters(rows: readonly DqdCheckRow[], filters: CheckFilters): DqdCheckRow[] {
  return rows.filter(
    (row) =>
      TEXT_FIELDS.every((field) => filters[field].length === 0 || filters[field].includes(row[field] ?? '')) &&
      (filters.status.length === 0 || filters.status.includes(deriveStatus(row))),
  );
}

/** The values each filter can offer: unique, non-empty and sorted; statuses in chip order. */
export function filterOptions(rows: readonly DqdCheckRow[]): CheckFilters {
  const unique = (field: TextField): string[] =>
    [...new Set(rows.map((row) => row[field] ?? '').filter((value) => value !== ''))].sort((a, b) =>
      a.localeCompare(b),
    );
  const statuses = new Set(rows.map(deriveStatus));
  return {
    category: unique('category'),
    subcategory: unique('subcategory'),
    context: unique('context'),
    cdmTableName: unique('cdmTableName'),
    checkLevel: unique('checkLevel'),
    status: STATUS_ORDER.filter((status) => statuses.has(status)),
  };
}

/** How many values are selected across every filter, for the button's count. */
export const activeFilterCount = (filters: CheckFilters): number =>
  Object.values(filters).reduce((total, values) => total + values.length, 0);
