import { describe, it, expect } from 'vitest'
import { dataQualityCohortId, canOpenDataQuality } from '../explorationDataQuality'

describe('dataQualityCohortId', () => {
  it('returns the cohort definition id as a string when the record is materialised', () => {
    expect(dataQualityCohortId({ cohortDefinition: { id: 'abc-123' } })).toBe('abc-123')
  })

  it('normalises a numeric id, because it becomes a URL path segment', () => {
    expect(dataQualityCohortId({ cohortDefinition: { id: 42 } })).toBe('42')
  })

  it('returns null for a never-materialised exploration', () => {
    expect(dataQualityCohortId({ cohortDefinition: null })).toBeNull()
    expect(dataQualityCohortId({})).toBeNull()
  })

  it('ignores a bookmark id and an Atlas id, which key different tables', () => {
    const card = { bookmark: { id: 'bmk-1' }, atlasCohortDefinition: { id: 7 } }
    expect(dataQualityCohortId(card as never)).toBeNull()
  })

  it('rejects an empty string rather than building a URL with a blank segment', () => {
    expect(dataQualityCohortId({ cohortDefinition: { id: '' } })).toBeNull()
  })

  it('rejects a non-finite number', () => {
    expect(dataQualityCohortId({ cohortDefinition: { id: Number.NaN } })).toBeNull()
  })

  it('is safe on null and undefined', () => {
    expect(dataQualityCohortId(null)).toBeNull()
    expect(dataQualityCohortId(undefined)).toBeNull()
  })
})

describe('canOpenDataQuality', () => {
  it('is true only when a cohort definition id resolves', () => {
    expect(canOpenDataQuality({ cohortDefinition: { id: 'abc' } })).toBe(true)
    expect(canOpenDataQuality({ cohortDefinition: { id: 0 } })).toBe(true)
    expect(canOpenDataQuality({})).toBe(false)
    expect(canOpenDataQuality(null)).toBe(false)
  })
})
