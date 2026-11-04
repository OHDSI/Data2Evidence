import { CHECK_SEVERITY } from './severity';
import type { DqdCheckRow } from './types';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Check rows from the /results response, validated at the boundary.
 *
 * A row without a string `checkName` or `category` cannot be shown in the table
 * or filtered, so it is dropped rather than rendered half-empty; the count goes
 * to the console. `key` makes every row unique even when the backend repeats a
 * checkId, because the table and its expansion key on it.
 */
export function parseCheckResults(raw: unknown): DqdCheckRow[] {
  if (!Array.isArray(raw)) return [];
  let dropped = 0;
  const rows: DqdCheckRow[] = [];
  raw.forEach((item, index) => {
    if (!isRecord(item) || typeof item.checkName !== 'string' || typeof item.category !== 'string') {
      dropped += 1;
      return;
    }
    const checkId = typeof item.checkId === 'string' ? item.checkId : undefined;
    rows.push({
      ...(item as Partial<DqdCheckRow>),
      checkId,
      checkName: item.checkName,
      category: item.category,
      severity: typeof item.severity === 'string' && item.severity ? item.severity : CHECK_SEVERITY[item.checkName],
      failed: typeof item.failed === 'number' ? item.failed : 0,
      key: `${checkId ?? ''}#${index}`,
    });
  });
  if (dropped > 0) console.warn(`[data-quality] dropped ${dropped} malformed check rows`);
  return rows;
}
