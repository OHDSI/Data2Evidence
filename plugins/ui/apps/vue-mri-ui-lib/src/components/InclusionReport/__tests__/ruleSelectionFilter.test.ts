import { checkRulesAll, checkRulesAny, shouldIncludeRect, calculateFilteredSummary } from '../ruleSelectionFilter'

describe('ruleSelectionFilter', () => {
  describe('checkRulesAll', () => {
    it('should return false for empty selectedRules', () => {
      expect(checkRulesAll('101', [], false)).toBe(false)
      expect(checkRulesAll('101', [], true)).toBe(false)
    })

    it('should return true when all selected rules passed', () => {
      const rectId = '111' // All rules passed
      const selectedRules = [0, 1, 2]
      expect(checkRulesAll(rectId, selectedRules, false)).toBe(true)
    })

    it('should return false when some selected rules failed', () => {
      const rectId = '101' // Rule 1 failed
      const selectedRules = [0, 1, 2]
      expect(checkRulesAll(rectId, selectedRules, false)).toBe(false)
    })

    it('should return true when all selected rules failed', () => {
      const rectId = '000' // All rules failed
      const selectedRules = [0, 1, 2]
      expect(checkRulesAll(rectId, selectedRules, true)).toBe(true)
    })

    it('should return false when some selected rules passed', () => {
      const rectId = '101' // Rules 0 and 2 passed
      const selectedRules = [0, 1, 2]
      expect(checkRulesAll(rectId, selectedRules, true)).toBe(false)
    })

    it('should handle subset of rules', () => {
      const rectId = '110' // Rules 0 and 1 passed, rule 2 failed
      const selectedRules = [0, 1] // Only checking first two rules
      expect(checkRulesAll(rectId, selectedRules, false)).toBe(true)
    })

    it('should skip rules beyond rectId length', () => {
      const rectId = '11' // Only 2 rules
      const selectedRules = [0, 1, 2, 3] // Checking 4 rules
      expect(checkRulesAll(rectId, selectedRules, false)).toBe(true) // Rules 0,1 passed; 2,3 skipped
    })
  })

  describe('checkRulesAny', () => {
    it('should return false for empty selectedRules', () => {
      expect(checkRulesAny('101', [], false)).toBe(false)
      expect(checkRulesAny('101', [], true)).toBe(false)
    })

    it('should return true when any selected rule passed', () => {
      const rectId = '100' // Only rule 0 passed
      const selectedRules = [0, 1, 2]
      expect(checkRulesAny(rectId, selectedRules, false)).toBe(true)
    })

    it('should return false when no selected rules passed', () => {
      const rectId = '000' // All rules failed
      const selectedRules = [0, 1, 2]
      expect(checkRulesAny(rectId, selectedRules, false)).toBe(false)
    })

    it('should return true when any selected rule failed', () => {
      const rectId = '011' // Rule 0 failed
      const selectedRules = [0, 1, 2]
      expect(checkRulesAny(rectId, selectedRules, true)).toBe(true)
    })

    it('should return false when no selected rules failed', () => {
      const rectId = '111' // All rules passed
      const selectedRules = [0, 1, 2]
      expect(checkRulesAny(rectId, selectedRules, true)).toBe(false)
    })

    it('should handle subset of rules', () => {
      const rectId = '001' // Only rule 2 passed
      const selectedRules = [2] // Only checking rule 2
      expect(checkRulesAny(rectId, selectedRules, false)).toBe(true)
    })

    it('should skip rules beyond rectId length', () => {
      const rectId = '00' // Only 2 rules, both failed
      const selectedRules = [0, 1, 2, 3] // Checking 4 rules
      expect(checkRulesAny(rectId, selectedRules, false)).toBe(false) // Rules 0,1 failed; 2,3 skipped
    })
  })

  describe('shouldIncludeRect', () => {
    it('should return false for empty selectedRules', () => {
      expect(shouldIncludeRect('111', [], 'ALL', 'PASSED')).toBe(false)
      expect(shouldIncludeRect('111', [], 'ANY', 'PASSED')).toBe(false)
    })

    it('should use ALL logic when allAnyOption is ALL', () => {
      const rectId = '110' // Rules 0,1 passed, rule 2 failed
      const selectedRules = [0, 1]

      // ALL + PASSED: should include (all selected rules passed)
      expect(shouldIncludeRect(rectId, selectedRules, 'ALL', 'PASSED')).toBe(true)

      // ALL + FAILED: should not include (not all selected rules failed)
      expect(shouldIncludeRect(rectId, selectedRules, 'ALL', 'FAILED')).toBe(false)
    })

    it('should use ANY logic when allAnyOption is ANY', () => {
      const rectId = '100' // Only rule 0 passed
      const selectedRules = [0, 1, 2]

      // ANY + PASSED: should include (at least one selected rule passed)
      expect(shouldIncludeRect(rectId, selectedRules, 'ANY', 'PASSED')).toBe(true)

      // ANY + FAILED: should include (at least one selected rule failed)
      expect(shouldIncludeRect(rectId, selectedRules, 'ANY', 'FAILED')).toBe(true)
    })

    it('should handle PASSED filter correctly', () => {
      const rectId = '101' // Rules 0,2 passed, rule 1 failed

      // ALL + PASSED with rules 0,2 selected: should include
      expect(shouldIncludeRect(rectId, [0, 2], 'ALL', 'PASSED')).toBe(true)

      // ALL + PASSED with rules 0,1 selected: should not include (rule 1 failed)
      expect(shouldIncludeRect(rectId, [0, 1], 'ALL', 'PASSED')).toBe(false)
    })

    it('should handle FAILED filter correctly', () => {
      const rectId = '010' // Only rule 1 passed, rules 0,2 failed

      // ALL + FAILED with rules 0,2 selected: should include
      expect(shouldIncludeRect(rectId, [0, 2], 'ALL', 'FAILED')).toBe(true)

      // ALL + FAILED with rules 0,1 selected: should not include (rule 1 passed)
      expect(shouldIncludeRect(rectId, [0, 1], 'ALL', 'FAILED')).toBe(false)
    })
  })

  describe('calculateFilteredSummary', () => {
    const mockTreemapData = {
      name: 'root',
      value: 1000,
      children: [
        { name: '000', value: 100 },
        { name: '001', value: 50 },
        { name: '010', value: 75 },
        { name: '011', value: 125 },
        { name: '100', value: 150 },
        { name: '101', value: 200 },
        { name: '110', value: 100 },
        { name: '111', value: 200 },
      ],
    }

    it('should calculate summary for ALL + PASSED filter', () => {
      const selectedRules = [0, 1, 2]
      const result = calculateFilteredSummary(mockTreemapData, selectedRules, 'ALL', 'PASSED')

      // Only '111' matches (all rules passed)
      expect(result.value).toBe(200)
      expect(result.count).toBe(1)
    })

    it('should calculate summary for ANY + PASSED filter', () => {
      const selectedRules = [0]
      const result = calculateFilteredSummary(mockTreemapData, selectedRules, 'ANY', 'PASSED')

      // '100', '101', '110', '111' match (rule 0 passed)
      expect(result.value).toBe(650) // 150 + 200 + 100 + 200
      expect(result.count).toBe(4)
    })

    it('should calculate summary for ALL + FAILED filter', () => {
      const selectedRules = [0, 1, 2]
      const result = calculateFilteredSummary(mockTreemapData, selectedRules, 'ALL', 'FAILED')

      // Only '000' matches (all rules failed)
      expect(result.value).toBe(100)
      expect(result.count).toBe(1)
    })

    it('should calculate summary for ANY + FAILED filter', () => {
      const selectedRules = [2]
      const result = calculateFilteredSummary(mockTreemapData, selectedRules, 'ANY', 'FAILED')

      // '000', '010', '100', '110' match (rule 2 failed)
      expect(result.value).toBe(425) // 100 + 75 + 150 + 100
      expect(result.count).toBe(4)
    })

    it('should return zero for empty selectedRules', () => {
      const result = calculateFilteredSummary(mockTreemapData, [], 'ALL', 'PASSED')

      expect(result.value).toBe(0)
      expect(result.count).toBe(0)
    })
  })
})

