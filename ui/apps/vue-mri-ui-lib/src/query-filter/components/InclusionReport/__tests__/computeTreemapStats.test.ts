import { convertTreemapData, formatTreemapTooltip } from '../computeTreemapStats'
import type { InclusionReportResponse } from '../../../types/InclusionReportTypes'

describe('Treemap Stats Computation', () => {
  describe('convert treemap data to ECharts Format', () => {
    const mockReport: InclusionReportResponse = {
      summary: {
        baseCount: 1000,
        finalCount: 400,
        lostCount: 600,
        percentMatched: '40.00%',
      },
      inclusionRuleStats: [
        {
          id: 0,
          name: 'Age >= 18',
          percentExcluded: '10.00%',
          percentSatisfying: '90.00%',
          countSatisfying: 900,
        },
        {
          id: 1,
          name: 'Has Condition',
          percentExcluded: '30.00%',
          percentSatisfying: '60.00%',
          countSatisfying: 600,
        },
      ],
      treemapData: '{}',
    }

    it('should return null for null/undefined data', () => {
      expect(convertTreemapData(null, mockReport)).toBeNull()
      expect(convertTreemapData(undefined, mockReport)).toBeNull()
    })

    it('should convert simple leaf node', () => {
      const data = {
        name: '11',
        size: 600,
      }

      const result = convertTreemapData(data, mockReport)

      expect(result).toBeDefined()
      expect(result?.name).toBe('11')
      expect(result?.value).toBe(600)
      expect(result?.tooltip).toBeDefined()
      expect(result?.tooltip.count).toBe('600 people (60.00%)')
      expect(result?.tooltip.summary).toBe('2 criteria passed, 0 criteria failed')
      expect(result?.tooltip.passed).toHaveLength(2)
      expect(result?.tooltip.failed).toHaveLength(0)
      expect(result?.itemStyle?.color).toBe('#53bead') // All passed
    })

    it('should convert node with children', () => {
      const data = {
        name: 'root',
        children: [
          { name: '10', size: 400 },
          { name: '11', size: 600 },
        ],
      }

      const result = convertTreemapData(data, mockReport)

      expect(result).toBeDefined()
      expect(result?.children).toHaveLength(2)
      expect(result?.value).toBe(1000) // Sum of children
      expect(result?.children?.[0].name).toBe('10')
      expect(result?.children?.[0].value).toBe(400)
      expect(result?.children?.[1].name).toBe('11')
      expect(result?.children?.[1].value).toBe(600)
    })

    it('should assign correct colors based on failure count', () => {
      const testCases = [
        { name: '11', failCount: 0, expectedColor: '#53bead' }, // All passed
        { name: '01', failCount: 1, expectedColor: '#cdd99e' }, // One failed
        { name: '00', failCount: 2, expectedColor: '#dedcab' }, // Two failed
      ]

      testCases.forEach(({ name, expectedColor }) => {
        const data = { name, size: 100 }
        const result = convertTreemapData(data, mockReport)
        expect(result?.itemStyle?.color).toBe(expectedColor)
      })
    })

    it('should handle nodes without size (parent nodes)', () => {
      const data = {
        name: 'root',
        children: [
          { name: '0', size: 300 },
          { name: '1', size: 700 },
        ],
      }

      const result = convertTreemapData(data, mockReport)

      expect(result?.value).toBe(1000) // Sum of children
    })

    it('should compute tooltip data correctly', () => {
      const data = {
        name: '10',
        size: 400,
      }

      const result = convertTreemapData(data, mockReport)

      expect(result?.tooltip).toBeDefined()
      expect(result?.tooltip.count).toBe('400 people (40.00%)')
      expect(result?.tooltip.summary).toBe('1 criteria passed, 1 criteria failed')
      expect(result?.tooltip.passed).toEqual(['1. Age >= 18'])
      expect(result?.tooltip.failed).toEqual(['2. Has Condition'])
    })
  })

  describe('format treemap tooltip html', () => {
    it('should return empty string for null/undefined', () => {
      expect(formatTreemapTooltip(null)).toBe('')
      expect(formatTreemapTooltip(undefined)).toBe('')
    })

    it('should format tooltip with passed and failed criteria', () => {
      const tooltipData = {
        count: '400 people (40.00%)',
        summary: '1 criteria passed, 1 criteria failed',
        passed: ['1. Age >= 18'],
        failed: ['2. Has Condition'],
      }

      const html = formatTreemapTooltip(tooltipData)

      expect(html).toContain('400 people (40.00%)')
      expect(html).toContain('1 criteria passed, 1 criteria failed')
      expect(html).toContain('Passed:')
      expect(html).toContain('1. Age >= 18')
      expect(html).toContain('Failed:')
      expect(html).toContain('2. Has Condition')
    })

    it('should format tooltip with only passed criteria', () => {
      const tooltipData = {
        count: '600 people (60.00%)',
        summary: '2 criteria passed, 0 criteria failed',
        passed: ['1. Age >= 18', '2. Has Condition'],
        failed: [],
      }

      const html = formatTreemapTooltip(tooltipData)

      expect(html).toContain('600 people (60.00%)')
      expect(html).toContain('Passed:')
      expect(html).toContain('1. Age >= 18')
      expect(html).toContain('2. Has Condition')
      expect(html).not.toContain('Failed:')
    })

    it('should format tooltip with only failed criteria', () => {
      const tooltipData = {
        count: '100 people (10.00%)',
        summary: '0 criteria passed, 2 criteria failed',
        passed: [],
        failed: ['1. Age >= 18', '2. Has Condition'],
      }

      const html = formatTreemapTooltip(tooltipData)

      expect(html).toContain('100 people (10.00%)')
      expect(html).toContain('Failed:')
      expect(html).toContain('1. Age >= 18')
      expect(html).toContain('2. Has Condition')
      expect(html).not.toContain('Passed:')
    })

    it('should handle single person count', () => {
      const tooltipData = {
        count: '1 person (0.10%)',
        summary: '1 criteria passed, 0 criteria failed',
        passed: ['1. Test Rule'],
        failed: [],
      }

      const html = formatTreemapTooltip(tooltipData)

      expect(html).toContain('1 person (0.10%)')
    })
  })
})

