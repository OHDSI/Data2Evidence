import { QueryFilterCriteriaManager } from '../../models/QueryFilterModel'
import sample2Input from '../../__tests__/data/sample2-input'
import sample3Input from '../../__tests__/data/sample3-input'

describe('Atlas Integration Tests', () => {
  describe('Atlas Conversion System', () => {
    it('converts hierarchical criteria to Atlas format', () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)

      // Test the conversion
      const atlasFormat = manager.convertToAtlasFormat()

      // Validate Atlas structure
      expect(atlasFormat).toHaveProperty('ConceptSets')
      expect(atlasFormat).toHaveProperty('PrimaryCriteria')
      expect(atlasFormat).toHaveProperty('QualifiedLimit')
      expect(atlasFormat).toHaveProperty('InclusionRules')
      expect(atlasFormat).toHaveProperty('EndStrategy')

      // Validate qualifying events limit
      expect(atlasFormat.QualifiedLimit.Type).toBe('All')

      // Validate inclusion rules
      expect(atlasFormat.InclusionRules).toHaveLength(1)
      expect(atlasFormat.InclusionRules[0].name).toBe('Criteria 1')
      expect(atlasFormat.InclusionRules[0].description).toBe('Description 1')
      expect(atlasFormat.InclusionRules[0].expression.Type).toBe('ALL')
    })

    it('handles nested criteria in Atlas conversion', () => {
      const manager = new QueryFilterCriteriaManager(sample3Input)

      const atlasFormat = manager.convertToAtlasFormat()

      // Should still convert to Atlas format even with nested structures
      expect(atlasFormat.InclusionRules).toHaveLength(1)
      expect(atlasFormat.InclusionRules[0].expression.CriteriaList).toHaveLength(2)

      // Nested structures are flattened in basic conversion
      const criteriaList = atlasFormat.InclusionRules[0].expression.CriteriaList
      criteriaList.forEach(criteria => {
        expect(criteria).toHaveProperty('Criteria')
        expect(criteria.Criteria).toHaveProperty('ConditionOccurrence')
      })
    })

    it('preserves criteria types in Atlas conversion', () => {
      const manager = new QueryFilterCriteriaManager({
        inclusionCriteria: {
          qualifyingEventsLimit: 'EARLIEST',
          criteria: [
            {
              id: 'test_criteria',
              title: 'Test Criteria',
              description: 'Test Description',
              criteriaType: 'ANY',
              events: [
                {
                  id: 'test_event',
                  eventType: 'drugExposure',
                  cardinality: { type: 'AT_LEAST', count: 1, using: 'ALL' },
                },
              ],
            },
          ],
        },
      })

      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat.QualifiedLimit.Type).toBe('First')
      expect(atlasFormat.InclusionRules[0].expression.Type).toBe('ANY')
      expect(atlasFormat.InclusionRules[0].expression.CriteriaList[0].Criteria).toHaveProperty('DrugExposure')
    })
  })

  describe('Error Handling', () => {
    it('handles conversion errors gracefully', () => {
      const manager = new QueryFilterCriteriaManager({
        // Invalid structure
        inclusionCriteria: {
          qualifyingEventsLimit: 'INVALID_TYPE',
          criteria: null as any,
        },
      })

      // Should not throw during conversion
      expect(() => manager.convertToAtlasFormat()).not.toThrow()
    })
  })

  describe('Performance Validation', () => {
    it('converts complex hierarchical structures efficiently', () => {
      const complexHierarchy = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'ALL',
          criteria: Array.from({ length: 10 }, (_, i) => ({
            id: `criteria_${i}`,
            title: `Criteria ${i}`,
            description: `Description ${i}`,
            criteriaType: 'ALL',
            events: Array.from({ length: 5 }, (_, j) => ({
              id: `event_${i}_${j}`,
              eventType: 'conditionOccurrence',
              attributes:
                j === 0
                  ? [
                      {
                        id: `attr_${i}_${j}`,
                        attributeType: 'nested' as const,
                        nestedCriteria: {
                          id: `nested_${i}_${j}`,
                          criteriaType: 'ANY' as const,
                          events: Array.from({ length: 3 }, (_, k) => ({
                            id: `nested_event_${i}_${j}_${k}`,
                            eventType: 'drugExposure',
                          })),
                        },
                      },
                    ]
                  : [],
            })),
          })),
        },
      }

      const manager = new QueryFilterCriteriaManager(complexHierarchy)

      const startTime = performance.now()
      const atlasFormat = manager.convertToAtlasFormat()
      const endTime = performance.now()

      // Should convert quickly
      expect(endTime - startTime).toBeLessThan(100)
      expect(atlasFormat).toBeDefined()
      expect(atlasFormat.InclusionRules).toHaveLength(10)
    })
  })

  describe('Data Integrity', () => {
    it('maintains data structure through conversion', () => {
      const originalManager = new QueryFilterCriteriaManager(sample2Input)

      // Convert to Atlas format
      const atlasFormat = originalManager.convertToAtlasFormat()

      // Verify basic structure preservation
      const originalCriteria = originalManager.getCriteria()

      // Map criteriaType to Atlas format
      const expectedType = originalCriteria.criteriaType === 'ALL' ? 'All' : originalCriteria.criteriaType
      expect(atlasFormat.QualifiedLimit.Type).toBe(expectedType)
      expect(atlasFormat.InclusionRules.length).toBe(originalCriteria.criteria.length)
    })

    it('preserves nested structures through conversion', () => {
      const originalManager = new QueryFilterCriteriaManager(sample3Input)

      // Convert to Atlas format
      const atlasFormat = originalManager.convertToAtlasFormat()

      // Verify conversion completed without errors
      expect(atlasFormat).toBeDefined()
      expect(atlasFormat.InclusionRules).toBeDefined()
      expect(atlasFormat.InclusionRules.length).toBeGreaterThan(0)
    })
  })
})
