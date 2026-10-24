import { COLUMN_BY_KEY } from './columns';
import type { DqdCheckRow } from './types';

export interface CheckSort {
  key: string;
  order: 'asc' | 'desc';
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

/**
 * A sorted copy. Numbers compare as numbers, text naturally ("a9" before "a10");
 * an empty value sorts first ascending. An empty sort, or an unknown column,
 * keeps the input order. The input is never changed.
 */
export function sortRows(rows: readonly DqdCheckRow[], sortBy: readonly CheckSort[]): DqdCheckRow[] {
  const [active] = sortBy;
  const column = active ? COLUMN_BY_KEY[active.key] : undefined;
  if (!active || !column) return [...rows];
  const direction = active.order === 'asc' ? 1 : -1;
  return [...rows].sort((a, b) => {
    const left = column.value(a);
    const right = column.value(b);
    if (left === right) return 0;
    if (left === '') return -direction;
    if (right === '') return direction;
    if (typeof left === 'number' && typeof right === 'number') return direction * (left - right);
    return direction * collator.compare(String(left), String(right));
  });
}
