import { describe, expect, it } from 'vitest';
import { formatSeverity, formatViolatedPercent } from './format';

describe('formatViolatedPercent', () => {
  it('shows a fraction as a percentage with two decimals', () => {
    expect(formatViolatedPercent(0.5003)).toBe('50.03%');
    expect(formatViolatedPercent(0.003)).toBe('0.30%');
    expect(formatViolatedPercent(0.0375)).toBe('3.75%');
    expect(formatViolatedPercent(0.66957)).toBe('66.96%');
  });

  it('drops the decimals for a whole percentage', () => {
    expect(formatViolatedPercent(0)).toBe('0%');
    expect(formatViolatedPercent(0.25)).toBe('25%');
    expect(formatViolatedPercent(1)).toBe('100%');
    expect(formatViolatedPercent(0.999999)).toBe('100%');
  });

  it('returns an empty string when there is no number', () => {
    expect(formatViolatedPercent(undefined)).toBe('');
    expect(formatViolatedPercent(Number.NaN)).toBe('');
  });
});

describe('formatSeverity', () => {
  it('capitalises the DQD severity', () => {
    expect(formatSeverity('fatal')).toBe('Fatal');
    expect(formatSeverity('convention')).toBe('Convention');
    expect(formatSeverity('characterization')).toBe('Characterization');
  });

  it('returns an empty string when there is no severity', () => {
    expect(formatSeverity(undefined)).toBe('');
    expect(formatSeverity('')).toBe('');
  });
});
