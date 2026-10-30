import { describe, expect, it } from 'vitest'
import { withEmptyCohorts } from '../cohortCompareBarData'

const MEASURE = 'patient.attributes.pcount'
const GENDER = 'patient.attributes.gender'

const response = (data: Record<string, unknown>[], categoryIds: string[] = ['cohortId']) => ({
  categories: categoryIds.map(id => ({ id })),
  measures: [{ id: MEASURE }],
  data,
  noDataReason: null,
})

describe('withEmptyCohorts', () => {
  it('adds a zero row for a cohort with no data', () => {
    const result = withEmptyCohorts(response([{ cohortId: 'a', [MEASURE]: 12 }]), ['a', 'b'])
    expect(result.data).toEqual([
      { cohortId: 'a', [MEASURE]: 12 },
      { cohortId: 'b', [MEASURE]: 0 },
    ])
  })

  it('adds a zero row for every cohort when no cohort has data', () => {
    const result = withEmptyCohorts(response([]), ['a', 'b'])
    expect(result.data).toEqual([
      { cohortId: 'a', [MEASURE]: 0 },
      { cohortId: 'b', [MEASURE]: 0 },
    ])
  })

  it('sets the other x-axis attributes of a zero row to NoValue', () => {
    const result = withEmptyCohorts(
      response([{ cohortId: 'a', [GENDER]: 'FEMALE', [MEASURE]: 7 }], ['cohortId', GENDER]),
      ['a', 'b']
    )
    expect(result.data[1]).toEqual({ cohortId: 'b', [GENDER]: 'NoValue', [MEASURE]: 0 })
  })

  it('returns the same response when every cohort has data', () => {
    const original = response([
      { cohortId: 'a', [MEASURE]: 1 },
      { cohortId: 'b', [MEASURE]: 2 },
    ])
    expect(withEmptyCohorts(original, ['a', 'b'])).toBe(original)
  })

  it('does not change the original response', () => {
    const original = response([{ cohortId: 'a', [MEASURE]: 1 }])
    withEmptyCohorts(original, ['a', 'b'])
    expect(original.data).toEqual([{ cohortId: 'a', [MEASURE]: 1 }])
  })

  it('returns the response unchanged when it has no measure', () => {
    const original = { ...response([]), measures: [] }
    expect(withEmptyCohorts(original, ['a'])).toBe(original)
  })
})
