import { describe, expect, it } from 'vitest';
import { activeFilterCount, applyFilters, emptyFilters, filterOptions } from './filters';
import { row } from './fixtures';

const rows = [
  row({ key: '1', category: 'Plausibility', cdmTableName: 'PERSON', failed: 1 }),
  row({ key: '2', category: 'Conformance', cdmTableName: 'PERSON', failed: 0 }),
  row({ key: '3', category: 'Plausibility', cdmTableName: 'VISIT', failed: 0 }),
];

describe('applyFilters', () => {
  it('keeps every row with no filter set', () => {
    expect(applyFilters(rows, emptyFilters())).toHaveLength(3);
  });

  it('ORs values inside a field and ANDs across fields', () => {
    const either = { ...emptyFilters(), category: ['Plausibility', 'Conformance'] };
    expect(applyFilters(rows, either)).toHaveLength(3);
    const both = { ...emptyFilters(), category: ['Plausibility'], cdmTableName: ['PERSON'] };
    expect(applyFilters(rows, both).map((r) => r.key)).toEqual(['1']);
  });

  it('filters on the derived status', () => {
    expect(applyFilters(rows, { ...emptyFilters(), status: ['passed'] }).map((r) => r.key)).toEqual([
      '2',
      '3',
    ]);
  });

  it('keeps only passed checks for the Passed status, and only failed ones for Failed', () => {
    expect(applyFilters(rows, { ...emptyFilters(), status: ['passed'] }).every((r) => r.failed === 0)).toBe(true);
    expect(applyFilters(rows, { ...emptyFilters(), status: ['failed'] }).map((r) => r.key)).toEqual(['1']);
  });

  it('filters on the severity', () => {
    const graded = [row({ key: 'a', severity: 'fatal' }), row({ key: 'b', severity: 'convention' })];
    expect(applyFilters(graded, { ...emptyFilters(), severity: ['fatal'] }).map((r) => r.key)).toEqual(['a']);
  });
});

describe('filterOptions', () => {
  it('lists unique, sorted, non-empty values per field', () => {
    const options = filterOptions([...rows, row({ key: '4', cdmTableName: '' })]);
    expect(options.category).toEqual(['Conformance', 'Plausibility']);
    expect(options.cdmTableName).toEqual(['PERSON', 'VISIT']);
  });

  it('lists the statuses present, in chip order', () => {
    expect(filterOptions(rows).status).toEqual(['failed', 'passed']);
  });

  it('lists the severities present', () => {
    const graded = [row({ severity: 'fatal' }), row({ severity: 'convention' }), row({ severity: undefined })];
    expect(filterOptions(graded).severity).toEqual(['convention', 'fatal']);
  });
});

describe('activeFilterCount', () => {
  it('counts every selected value', () => {
    expect(activeFilterCount(emptyFilters())).toBe(0);
    expect(activeFilterCount({ ...emptyFilters(), category: ['a', 'b'], status: ['failed'] })).toBe(3);
  });
});
