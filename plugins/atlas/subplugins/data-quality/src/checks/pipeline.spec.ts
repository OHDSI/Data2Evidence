import { describe, expect, it } from 'vitest';
import { visibleRows } from './pipeline';
import { emptyFilters } from './filters';
import { row } from './fixtures';

describe('visibleRows', () => {
  it('searches, filters and sorts in one pass', () => {
    const rows = [
      row({ key: '1', checkName: 'zeta', category: 'Plausibility' }),
      row({ key: '2', checkName: 'alpha', category: 'Plausibility' }),
      row({ key: '3', checkName: 'alphabet', category: 'Conformance' }),
      row({ key: '4', checkName: 'omega', category: 'Plausibility' }),
    ];
    const shown = visibleRows(rows, {
      query: 'a',
      filters: { ...emptyFilters(), category: ['Plausibility'] },
      sortBy: [{ key: 'checkName', order: 'asc' }],
      visibleKeys: ['checkName'],
    });
    expect(shown.map((r) => r.key)).toEqual(['2', '4', '1']);
  });
});
