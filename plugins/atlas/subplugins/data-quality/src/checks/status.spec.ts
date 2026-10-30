import { describe, expect, it } from 'vitest';
import { deriveStatus, STATUS_CHIP, STATUS_ORDER } from './status';
import { row } from './fixtures';

describe('deriveStatus', () => {
  it('reads an errored check as error, before anything else', () => {
    expect(deriveStatus(row({ isError: 1, notApplicable: 1, failed: 1 }))).toBe('error');
  });

  it('reads a not-applicable check as not-applicable before failed', () => {
    expect(deriveStatus(row({ notApplicable: 1, failed: 1 }))).toBe('not-applicable');
  });

  it('reads failed and passed', () => {
    expect(deriveStatus(row({ failed: 1 }))).toBe('failed');
    expect(deriveStatus(row({ failed: 0 }))).toBe('passed');
  });

  it('maps every status to a chip', () => {
    expect(STATUS_ORDER.map((status) => STATUS_CHIP[status].variant)).toEqual([
      'warning',
      'neutral',
      'negative',
      'positive',
    ]);
    expect(STATUS_CHIP.failed.fallback).toBe('Failed');
  });
});
