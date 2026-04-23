import { computeAttritionStats, mapAttritionApiResponseToStats } from '../computeAttritionStats'
import type { InclusionReportResponse, AttritionApiResponse } from '../../../types/InclusionReportTypes'

describe('Attrition Stats Computation', () => {
  const multipleRulesReport: InclusionReportResponse = {
    summary: {
      baseCount: 230,
      finalCount: 44,
      lostCount: 0,
      percentMatched: '19.13%',
    },
    inclusionRuleStats: [
      {
        id: 0,
        name: 'Gender female and gender diverse',
        percentExcluded: '19.13%',
        percentSatisfying: '54.35%',
        countSatisfying: 125,
        isExclude: false,
      },
      {
        id: 1,
        name: 'Age>30',
        percentExcluded: '0.87%',
        percentSatisfying: '98.70%',
        countSatisfying: 227,
        isExclude: false,
      },
      {
        id: 2,
        name: 'Age<70',
        percentExcluded: '34.35%',
        percentSatisfying: '39.57%',
        countSatisfying: 91,
        isExclude: true,
      },
    ],
    treemapData: {
      name: 'Everyone',
      children: [
        {
          name: 'Group 3',
          children: [
            {
              name: '111',
              size: 44,
            },
            {
              name: 'Group 2',
              children: [
                {
                  name: '110',
                  size: 79,
                },
                {
                  name: '101',
                  size: 2,
                },
                {
                  name: '011',
                  size: 44,
                },
                {
                  name: 'Group 1',
                  children: [
                    {
                      name: '001',
                      size: 1,
                    },
                    {
                      name: '010',
                      size: 60,
                    },
                  ],
                },
              ],
            },
          ],
        },
      ],
    },
  }

  describe('basic functionality', () => {
    it('should return empty array for null/undefined report', () => {
      expect(computeAttritionStats(null as any)).toEqual([])
      expect(computeAttritionStats(undefined as any)).toEqual([])
    })

    it('should compute stats for simple treemap with one rule', () => {
      const report: InclusionReportResponse = {
        summary: {
          baseCount: 100,
          finalCount: 80,
          lostCount: 20,
          percentMatched: '80.00%',
        },
        inclusionRuleStats: [
          {
            id: 0,
            name: 'Has Diabetes',
            percentExcluded: '20.00%',
            percentSatisfying: '80.00%',
            countSatisfying: 80,
            isExclude: false,
          },
        ],
        treemapData: {
          name: '',
          children: [
            { name: '0', size: 20 },
            { name: '1', size: 80 },
          ],
        },
      }

      const stats = computeAttritionStats(report)

      expect(stats).toHaveLength(1)
      expect(stats[0]).toEqual({
        id: 0,
        name: 'Has Diabetes',
        isExclude: false,
        countSatisfying: 80,
        percentSatisfying: '80.00%',
        pctDiff: '20.00%',
      })
    })

    it('should compute stats for multiple rules', () => {
      const stats = computeAttritionStats(multipleRulesReport)

      expect(stats).toHaveLength(3)

      expect(stats[0]).toEqual({
        id: 0,
        name: 'Gender female and gender diverse',
        isExclude: false,
        countSatisfying: 125,
        percentSatisfying: '54.35%',
        pctDiff: '45.65%',
      })

      expect(stats[1]).toEqual({
        id: 1,
        name: 'Age>30',
        isExclude: false,
        countSatisfying: 123,
        percentSatisfying: '53.48%',
        pctDiff: '0.87%',
      })

      expect(stats[2]).toEqual({
        id: 2,
        name: 'Age<70',
        isExclude: true,
        countSatisfying: 44,
        percentSatisfying: '19.13%',
        pctDiff: '34.35%',
      })
    })
  })

  describe('edge cases', () => {
    it('should handle zero baseCount', () => {
      const report: InclusionReportResponse = {
        summary: {
          baseCount: 0,
          finalCount: 0,
          lostCount: 0,
          percentMatched: '0.00%',
        },
        inclusionRuleStats: [
          {
            id: 0,
            name: 'Test Rule',
            percentExcluded: '0.00%',
            percentSatisfying: '0.00%',
            countSatisfying: 0,
            isExclude: false,
          },
        ],
        treemapData: {
          name: '',
          children: [],
        },
      }

      const stats = computeAttritionStats(report)

      expect(stats).toHaveLength(1)
      expect(stats[0].percentSatisfying).toBe('0.00%')
      expect(stats[0].pctDiff).toBe('100.00%')
    })

    it('should handle empty inclusionRuleStats', () => {
      const report: InclusionReportResponse = {
        summary: {
          baseCount: 100,
          finalCount: 100,
          lostCount: 0,
          percentMatched: '100.00%',
        },
        inclusionRuleStats: [],
        treemapData: {
          name: '',
          children: [],
        },
      }

      const stats = computeAttritionStats(report)

      expect(stats).toEqual([])
    })
  })

  describe('custom order', () => {
    it('should throw for an invalid rule ID in a custom order', () => {
      expect(() => computeAttritionStats(multipleRulesReport, [0, 99, 2])).toThrow('Invalid rule ID: 99')
    })

    it('should compute stats with custom rule order', () => {
      // Apply custom order: [2, 0, 1] instead of [0, 1, 2]
      const stats = computeAttritionStats(multipleRulesReport, [2, 0, 1])

      expect(stats).toHaveLength(3)

      // Rule 2 first (checking position [2])
      expect(stats[0]).toEqual({
        id: 2,
        name: 'Age<70',
        isExclude: true,
        countSatisfying: 91,
        percentSatisfying: '39.57%',
        pctDiff: '60.43%',
      })

      // Rule 0 second (checking positions [2, 0])
      expect(stats[1]).toEqual({
        id: 0,
        name: 'Gender female and gender diverse',
        isExclude: false,
        countSatisfying: 46,
        percentSatisfying: '20.00%',
        pctDiff: '19.57%',
      })

      // Rule 1 third (checking positions [2, 0, 1])
      expect(stats[2]).toEqual({
        id: 1,
        name: 'Age>30',
        isExclude: false,
        countSatisfying: 44,
        percentSatisfying: '19.13%',
        pctDiff: '0.87%',
      })
    })
  })
})

describe('mapAttritionApiResponseToStats', () => {
  const baseApiResponse: AttritionApiResponse = {
    summary: { baseCount: 100, finalCount: 60, lostCount: 40, percentMatched: '60.00%' },
    attritionStats: [
      { id: 0, name: 'Rule A', isExclude: false, cumulativeCountSatisfying: 90 },
      { id: 1, name: 'Rule B', isExclude: false, cumulativeCountSatisfying: 80 },
    ],
  }

  it('returns empty array for empty attritionStats', () => {
    const result = mapAttritionApiResponseToStats({ ...baseApiResponse, attritionStats: [] })
    expect(result).toEqual([])
  })

  it('maps id, name, isExclude, and cumulativeCountSatisfying → countSatisfying', () => {
    const result = mapAttritionApiResponseToStats(baseApiResponse)
    expect(result[0]).toMatchObject({ id: 0, name: 'Rule A', isExclude: false, countSatisfying: 90 })
    expect(result[1]).toMatchObject({ id: 1, name: 'Rule B', isExclude: false, countSatisfying: 80 })
  })

  it('computes percentSatisfying as (cumulativeCountSatisfying / baseCount) formatted to 2 dp', () => {
    const result = mapAttritionApiResponseToStats(baseApiResponse)
    expect(result[0].percentSatisfying).toBe('90.00%')
    expect(result[1].percentSatisfying).toBe('80.00%')
  })

  it('computes pctDiff starting from a 100% baseline for the first row', () => {
    const result = mapAttritionApiResponseToStats(baseApiResponse)
    // First row: 1.0 - 0.9 = 0.1 → '10.00%'
    expect(result[0].pctDiff).toBe('10.00%')
  })

  it('computes pctDiff as the delta from the previous row for subsequent rows', () => {
    const result = mapAttritionApiResponseToStats(baseApiResponse)
    // Second row: 0.9 - 0.8 = 0.1 → '10.00%'
    expect(result[1].pctDiff).toBe('10.00%')
  })

  it('computes percentExcluded as (1 - pctSat) formatted to 2 dp', () => {
    const result = mapAttritionApiResponseToStats(baseApiResponse)
    expect(result[0].percentExcluded).toBe('10.00%') // 1.0 - 0.9 = 0.1
    expect(result[1].percentExcluded).toBe('20.00%') // 1.0 - 0.8 = 0.2
  })

  it('handles zero baseCount without divide-by-zero: percentSatisfying is 0.00% while pctDiff and percentExcluded fall back to 100.00%', () => {
    const response: AttritionApiResponse = {
      summary: { baseCount: 0, finalCount: 0, lostCount: 0, percentMatched: '0.00%' },
      attritionStats: [{ id: 0, name: 'Rule A', isExclude: false, cumulativeCountSatisfying: 0 }],
    }
    const result = mapAttritionApiResponseToStats(response)
    expect(result[0].percentSatisfying).toBe('0.00%')
    expect(result[0].pctDiff).toBe('100.00%') // 1.0 - 0.0 = 1.0
    expect(result[0].percentExcluded).toBe('100.00%')
  })

  it('correctly tracks cumulative pctDiff across three rows', () => {
    const response: AttritionApiResponse = {
      summary: { baseCount: 100, finalCount: 60, lostCount: 40, percentMatched: '60.00%' },
      attritionStats: [
        { id: 0, name: 'Rule A', isExclude: false, cumulativeCountSatisfying: 90 }, // 90%
        { id: 1, name: 'Rule B', isExclude: false, cumulativeCountSatisfying: 70 }, // 70%
        { id: 2, name: 'Rule C', isExclude: false, cumulativeCountSatisfying: 60 }, // 60%
      ],
    }
    const result = mapAttritionApiResponseToStats(response)
    expect(result[0].pctDiff).toBe('10.00%') // 100% → 90%
    expect(result[1].pctDiff).toBe('20.00%') // 90%  → 70%
    expect(result[2].pctDiff).toBe('10.00%') // 70%  → 60%
  })

  it('preserves isExclude: true on exclusion rules', () => {
    const response: AttritionApiResponse = {
      ...baseApiResponse,
      attritionStats: [{ id: 0, name: 'No Prior Cancer', isExclude: true, cumulativeCountSatisfying: 50 }],
    }
    const [stat] = mapAttritionApiResponseToStats(response)
    expect(stat.isExclude).toBe(true)
  })

  it('returns 100.00% percentSatisfying and 0.00% pctDiff when all patients satisfy', () => {
    const response: AttritionApiResponse = {
      summary: { baseCount: 100, finalCount: 100, lostCount: 0, percentMatched: '100.00%' },
      attritionStats: [{ id: 0, name: 'Trivial Rule', isExclude: false, cumulativeCountSatisfying: 100 }],
    }
    const [stat] = mapAttritionApiResponseToStats(response)
    expect(stat.percentSatisfying).toBe('100.00%')
    expect(stat.pctDiff).toBe('0.00%')
    expect(stat.percentExcluded).toBe('0.00%')
  })
})
