import { describe, expect, it } from 'vitest';
import { COLUMN_BY_KEY, DEFAULT_VISIBLE_KEYS } from './columns';
import { row } from './fixtures';

describe('COLUMNS', () => {
  it('shows Severity by default, between Level and Status', () => {
    expect(DEFAULT_VISIBLE_KEYS).toEqual([
      'category',
      'checkName',
      'cdmTableName',
      'cdmFieldName',
      'checkLevel',
      'severity',
      'status',
    ]);
  });

  it('reads the severity as its capitalised label', () => {
    expect(COLUMN_BY_KEY.severity.value(row({ severity: 'fatal' }))).toBe('Fatal');
    expect(COLUMN_BY_KEY.severity.value(row({ severity: undefined }))).toBe('');
  });

  it('keeps % violated rows numeric for sorting, and displays it as a percentage', () => {
    const column = COLUMN_BY_KEY.pctViolatedRows;
    expect(column.value(row({ pctViolatedRows: 0.5003 }))).toBe(0.5003);
    expect(column.display?.(row({ pctViolatedRows: 0.5003 }))).toBe('50.03%');
  });
});
