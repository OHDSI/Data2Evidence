import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseCheckResults } from './parse';

afterEach(() => vi.restoreAllMocks());

describe('parseCheckResults', () => {
  it('returns [] for anything that is not an array', () => {
    expect(parseCheckResults(null)).toEqual([]);
    expect(parseCheckResults({ checkName: 'x' })).toEqual([]);
  });

  it('keeps valid rows and gives each a unique key', () => {
    const rows = parseCheckResults([
      { checkId: 'a', checkName: 'n1', category: 'Plausibility', failed: 1 },
      { checkId: 'a', checkName: 'n2', category: 'Conformance', failed: 0 },
      { checkName: 'n3', category: 'Completeness', failed: 0 },
    ]);
    expect(rows.map((r) => r.key)).toEqual(['a#0', 'a#1', '#2']);
    expect(rows[0].checkName).toBe('n1');
  });

  it('drops a row without a string checkName or category, and says so once', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const rows = parseCheckResults([
      { checkName: 'ok', category: 'Plausibility', failed: 0 },
      { category: 'Plausibility', failed: 0 },
      { checkName: 'no category', failed: 0 },
      'not a row',
    ]);
    expect(rows).toHaveLength(1);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith('[data-quality] dropped 3 malformed check rows');
  });

  it('reads a missing failed flag as 0', () => {
    const [parsed] = parseCheckResults([{ checkName: 'n', category: 'c' }]);
    expect(parsed.failed).toBe(0);
  });
});
