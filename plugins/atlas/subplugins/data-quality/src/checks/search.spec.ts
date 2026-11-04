import { describe, expect, it } from 'vitest';
import { matchesSearch } from './search';
import { row } from './fixtures';

const visible = ['category', 'checkName', 'cdmTableName', 'status'];

describe('matchesSearch', () => {
  it('matches everything for an empty or blank query', () => {
    expect(matchesSearch(row(), '', visible)).toBe(true);
    expect(matchesSearch(row(), '   ', visible)).toBe(true);
  });

  it('ignores case and surrounding space', () => {
    expect(matchesSearch(row(), '  MEASURE ', visible)).toBe(true);
  });

  it('only looks in visible columns', () => {
    expect(matchesSearch(row(), 'value_as_number', visible)).toBe(false);
    expect(matchesSearch(row(), 'value_as_number', [...visible, 'cdmFieldName'])).toBe(true);
  });

  it('matches the status by its label', () => {
    expect(matchesSearch(row({ failed: 1 }), 'failed', visible)).toBe(true);
    expect(matchesSearch(row({ failed: 0 }), 'failed', visible)).toBe(false);
  });

  it('matches the severity and % violated rows as they are displayed', () => {
    expect(matchesSearch(row({ severity: 'fatal' }), 'Fatal', [...visible, 'severity'])).toBe(true);
    expect(matchesSearch(row({ pctViolatedRows: 0.5003 }), '50.03%', [...visible, 'pctViolatedRows'])).toBe(true);
  });
});
