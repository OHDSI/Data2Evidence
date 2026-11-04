import { describe, expect, it } from 'vitest';
import { detailRows } from './detail';
import { row } from './fixtures';

const t = (_key: string, fallback?: string) => fallback ?? _key;

describe('detailRows', () => {
  it('lists the portal detail fields in order, with Check name labelled as such', () => {
    const labels = detailRows(row(), t).map((d) => d.label);
    expect(labels).toEqual([
      'Check name',
      'Description',
      'Notes',
      'Level',
      'Table',
      'Field',
      'Concept ID',
      'Unit concept ID',
      'Not applicable',
      'Check ID',
      'Violated rows',
      '% violated rows',
      'Denominator rows',
      'Execution time',
      'Is error',
      'Error',
      'Query',
    ]);
  });

  it('shows a dash for empty values and Yes/No for the flags', () => {
    const detail = Object.fromEntries(
      detailRows(row({ notesValue: undefined, notApplicable: 0, isError: 1 }), t).map((d) => [d.label, d.value]),
    );
    expect(detail.Notes).toBe('-');
    expect(detail['Not applicable']).toBe('No');
    expect(detail['Is error']).toBe('Yes');
    expect(detail['Check name']).toBe('plausibleValueLow');
  });

  it('shows % violated rows as a percentage, and a dash when it is missing', () => {
    const value = (pctViolatedRows?: number) =>
      detailRows(row({ pctViolatedRows }), t).find((d) => d.label === '% violated rows')?.value;
    expect(value(0.5003)).toBe('50.03%');
    expect(value(undefined)).toBe('-');
  });

  it('translates labels through the host', () => {
    const [first] = detailRows(row(), (key) => `T:${key}`);
    expect(first.label).toBe('T:plugins.dataQuality.checks.detail.checkName');
  });
});
