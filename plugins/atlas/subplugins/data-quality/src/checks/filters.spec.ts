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
});

describe('activeFilterCount', () => {
  it('counts every selected value', () => {
    expect(activeFilterCount(emptyFilters())).toBe(0);
    expect(activeFilterCount({ ...emptyFilters(), category: ['a', 'b'], status: ['failed'] })).toBe(3);
  });
});
