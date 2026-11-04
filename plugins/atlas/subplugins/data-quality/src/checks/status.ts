import type { DqdCheckRow } from './types';

export type CheckStatus = 'error' | 'not-applicable' | 'failed' | 'passed';

/** The order statuses are listed in, in the chip map and in the Status filter. */
export const STATUS_ORDER: CheckStatus[] = ['error', 'not-applicable', 'failed', 'passed'];

/**
 * What a check came to. The design shows only Failed and Passed, but a check
 * whose SQL errored, or that does not apply, has `failed: 0` too - reading those
 * as Passed would claim a result the check never produced.
 */
export function deriveStatus(row: DqdCheckRow): CheckStatus {
  if (row.isError === 1) return 'error';
  if (row.notApplicable === 1) return 'not-applicable';
  if (row.failed === 1) return 'failed';
  return 'passed';
}

export const STATUS_CHIP: Record<
  CheckStatus,
  { variant: 'warning' | 'neutral' | 'negative' | 'positive'; key: string; fallback: string }
> = {
  error: { variant: 'warning', key: 'plugins.dataQuality.checks.status.error', fallback: 'Error' },
  'not-applicable': {
    variant: 'neutral',
    key: 'plugins.dataQuality.checks.status.notApplicable',
    fallback: 'Not applicable',
  },
  failed: { variant: 'negative', key: 'plugins.dataQuality.checks.status.failed', fallback: 'Failed' },
  passed: { variant: 'positive', key: 'plugins.dataQuality.checks.status.passed', fallback: 'Passed' },
};

/** The English label, which search and the CSV export use. */
export const statusLabel = (row: DqdCheckRow): string => STATUS_CHIP[deriveStatus(row)].fallback;
