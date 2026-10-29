import { describe, expect, it } from 'vitest';
import { sortRows } from './sort';
import { row } from './fixtures';

const rows = [
  row({ key: 'a', checkName: 'b2', pctViolatedRows: 10 }),
  row({ key: 'b', checkName: 'a10', pctViolatedRows: 2 }),
  row({ key: 'c', checkName: 'a9', pctViolatedRows: undefined }),
];

describe('sortRows', () => {
  it('keeps the input order for an empty sort', () => {
    expect(sortRows(rows, []).map((r) => r.key)).toEqual(['a', 'b', 'c']);
  });

  it('sorts strings naturally, both ways', () => {
    expect(sortRows(rows, [{ key: 'checkName', order: 'asc' }]).map((r) => r.key)).toEqual(['c', 'b', 'a']);
    expect(sortRows(rows, [{ key: 'checkName', order: 'desc' }]).map((r) => r.key)).toEqual(['a', 'b', 'c']);
  });

  it('sorts numbers as numbers, with missing values first ascending', () => {
    expect(sortRows(rows, [{ key: 'pctViolatedRows', order: 'asc' }]).map((r) => r.key)).toEqual([
      'c',
      'b',
      'a',
    ]);
  });

  it('returns a new array and leaves the input alone', () => {
    const before = rows.map((r) => r.key);
    const sorted = sortRows(rows, [{ key: 'checkName', order: 'asc' }]);
    expect(sorted).not.toBe(rows);
    expect(rows.map((r) => r.key)).toEqual(before);
  });

  it('ignores an unknown column', () => {
    expect(sortRows(rows, [{ key: 'nope', order: 'asc' }]).map((r) => r.key)).toEqual(['a', 'b', 'c']);
  });
});
