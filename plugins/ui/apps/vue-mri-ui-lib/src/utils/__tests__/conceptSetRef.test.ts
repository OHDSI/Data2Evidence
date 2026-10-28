import { describe, expect, it } from 'vitest'

import {
  CONCEPT_SET_BARE_NUMERIC_PATTERN,
  CONCEPT_SET_COMPOUND_PATTERN,
  CONCEPT_SET_LEGACY_OFFSET_BOUNDARY,
  ConceptSetRef,
  formatConceptSetRef,
  isConceptSetRefString,
  parseConceptSetRef,
} from '../conceptSetRef'

describe('CONCEPT_SET_LEGACY_OFFSET_BOUNDARY', () => {
  it('equals 1_000_000_000', () => {
    expect(CONCEPT_SET_LEGACY_OFFSET_BOUNDARY).toBe(1_000_000_000)
  })
})

describe('CONCEPT_SET_COMPOUND_PATTERN', () => {
  it('matches canonical compound source', () => {
    expect(CONCEPT_SET_COMPOUND_PATTERN.source).toBe('^(legacy|webapi):(0|[1-9]\\d*)$')
  })
})

describe('CONCEPT_SET_BARE_NUMERIC_PATTERN', () => {
  it('matches bare numeric source', () => {
    expect(CONCEPT_SET_BARE_NUMERIC_PATTERN.source).toBe('^\\d+$')
  })
})

describe('parseConceptSetRef', () => {
  it('parses canonical legacy compound form', () => {
    expect(parseConceptSetRef('legacy:869')).toEqual({
      source: 'legacy',
      externalId: 869,
    })
  })

  it('parses canonical webapi compound form', () => {
    expect(parseConceptSetRef('webapi:7')).toEqual({
      source: 'webapi',
      externalId: 7,
    })
  })

  it('parses bare numeric string below boundary as legacy (back-compat)', () => {
    expect(parseConceptSetRef('869')).toEqual({
      source: 'legacy',
      externalId: 869,
    })
  })

  it('parses bare number below boundary as legacy (back-compat)', () => {
    expect(parseConceptSetRef(869)).toEqual({
      source: 'legacy',
      externalId: 869,
    })
  })

  it('decodes offset-encoded numeric string as webapi (back-compat)', () => {
    expect(parseConceptSetRef('1000000007')).toEqual({
      source: 'webapi',
      externalId: 7,
    })
  })

  it('decodes offset-encoded number as webapi (back-compat)', () => {
    expect(parseConceptSetRef(1_000_000_007)).toEqual({
      source: 'webapi',
      externalId: 7,
    })
  })

  it('throws on unknown source prefix', () => {
    expect(() => parseConceptSetRef('foo:1')).toThrow(/foo:1/)
  })

  it('throws on negative externalId in compound form', () => {
    expect(() => parseConceptSetRef('legacy:-1')).toThrow(/legacy:-1/)
  })

  it('throws on non-integer externalId in compound form', () => {
    expect(() => parseConceptSetRef('webapi:1.5')).toThrow(/webapi:1\.5/)
  })

  it('throws on empty string', () => {
    expect(() => parseConceptSetRef('')).toThrow(Error)
  })

  it('throws on negative number', () => {
    expect(() => parseConceptSetRef(-1)).toThrow(/-1/)
  })

  it('throws on whitespace-padded input', () => {
    expect(() => parseConceptSetRef('  legacy:1  ')).toThrow(Error)
  })

  it('throws on NaN', () => {
    expect(() => parseConceptSetRef(NaN)).toThrow(Error)
  })

  it('throws on Infinity', () => {
    expect(() => parseConceptSetRef(Infinity)).toThrow(Error)
  })

  it('accepts bare numeric string with leading zeros (back-compat)', () => {
    expect(parseConceptSetRef('007')).toEqual({
      source: 'legacy',
      externalId: 7,
    })
  })

  it('returns a fresh object on each call (immutability)', () => {
    const a = parseConceptSetRef('legacy:1')
    const b = parseConceptSetRef('legacy:1')
    expect(a).toEqual(b)
    expect(a).not.toBe(b)
  })
})

describe('formatConceptSetRef', () => {
  it('formats legacy refs', () => {
    expect(formatConceptSetRef({ source: 'legacy', externalId: 869 })).toBe('legacy:869')
  })

  it('formats webapi refs', () => {
    expect(formatConceptSetRef({ source: 'webapi', externalId: 7 })).toBe('webapi:7')
  })

  it('round-trip preserves legacy compound form', () => {
    expect(formatConceptSetRef(parseConceptSetRef('legacy:1'))).toBe('legacy:1')
  })

  it('round-trip preserves webapi compound form', () => {
    expect(formatConceptSetRef(parseConceptSetRef('webapi:42'))).toBe('webapi:42')
  })
})

describe('isConceptSetRefString', () => {
  it('accepts canonical legacy form', () => {
    expect(isConceptSetRefString('legacy:1')).toBe(true)
  })

  it('accepts canonical webapi form', () => {
    expect(isConceptSetRefString('webapi:1')).toBe(true)
  })

  it('rejects bare numeric strings (not canonical)', () => {
    expect(isConceptSetRefString('869')).toBe(false)
  })

  it('rejects arbitrary strings', () => {
    expect(isConceptSetRefString('foo')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(isConceptSetRefString('')).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isConceptSetRefString(869)).toBe(false)
  })

  it('rejects non-integer compound form', () => {
    expect(isConceptSetRefString('legacy:1.5')).toBe(false)
  })

  it('rejects negative compound form', () => {
    expect(isConceptSetRefString('legacy:-1')).toBe(false)
  })

  it('rejects compound form with leading zeros (non-canonical)', () => {
    expect(isConceptSetRefString('legacy:007')).toBe(false)
  })
})

describe('ConceptSetRef type', () => {
  it('is exported and usable', () => {
    const ref: ConceptSetRef = { source: 'webapi', externalId: 1 }
    expect(ref.source).toBe('webapi')
  })
})
