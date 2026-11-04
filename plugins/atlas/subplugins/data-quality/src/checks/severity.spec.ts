import { describe, expect, it } from 'vitest';
import { CHECK_SEVERITY } from './severity';

describe('CHECK_SEVERITY', () => {
  it('covers the 27 DQD checks', () => {
    expect(Object.keys(CHECK_SEVERITY)).toHaveLength(27);
  });

  it('uses only the three DQD severity levels', () => {
    expect(new Set(Object.values(CHECK_SEVERITY))).toEqual(new Set(['fatal', 'convention', 'characterization']));
  });
});
