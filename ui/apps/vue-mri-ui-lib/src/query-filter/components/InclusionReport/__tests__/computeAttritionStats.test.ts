import { computeAttritionStats } from '../computeAttritionStats'
import type { InclusionReportResponse } from '../../../types/InclusionReportTypes'

describe('Attrition Stats Computation', () => {
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
          },
        ],
        treemapData: JSON.stringify({
          name: '',
          children: [
            { name: '0', size: 20 },
            { name: '1', size: 80 },
          ],
        }),
      }

      const stats = computeAttritionStats(report)

      expect(stats).toHaveLength(1)
      expect(stats[0]).toEqual({
        id: 0,
        name: 'Has Diabetes',
        countSatisfying: 80,
        percentSatisfying: '80.00%',
        pctDiff: '20.00%',
      })
    })

    it('should compute stats for multiple rules', () => {
      const report: InclusionReportResponse = {
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
          },
          {
            id: 1,
            name: 'Age>30',
            percentExcluded: '0.87%',
            percentSatisfying: '98.70%',
            countSatisfying: 227,
          },
          {
            id: 2,
            name: 'Age<70',
            percentExcluded: '34.35%',
            percentSatisfying: '39.57%',
            countSatisfying: 91,
          },
        ],
        treemapData: JSON.stringify({
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
        }),
      }

      const stats = computeAttritionStats(report)

      expect(stats).toHaveLength(3)

      expect(stats[0]).toEqual({
        id: 0,
        name: 'Gender female and gender diverse',
        countSatisfying: 125,
        percentSatisfying: '54.35%',
        pctDiff: '45.65%',
      })

      expect(stats[1]).toEqual({
        id: 1,
        name: 'Age>30',
        countSatisfying: 123,
        percentSatisfying: '53.48%',
        pctDiff: '0.87%',
      })

      expect(stats[2]).toEqual({
        id: 2,
        name: 'Age<70',
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
          },
        ],
        treemapData: JSON.stringify({
          name: '',
          children: [],
        }),
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
        treemapData: JSON.stringify({
          name: '',
          children: [],
        }),
      }

      const stats = computeAttritionStats(report)

      expect(stats).toEqual([])
    })
  })
})

