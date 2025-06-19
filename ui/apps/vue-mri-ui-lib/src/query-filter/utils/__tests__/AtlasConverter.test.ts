import { convertAtlasToFilters, getConceptSetMappings, ConceptSetItem } from '../AtlasConverter'
import { QueryFilterCardModel } from '../../models/QueryFilterModel'
import sample6Expected from '../../__tests__/data/sample6-expected'
import sample6Input from '../../__tests__/data/sample6-input'

describe('AtlasConverter', () => {
  const mockConceptSets: ConceptSetItem[] = [
    { value: '1', text: 'Test Condition', display_value: 'Test Condition' },
    { value: '2', text: 'Test Drug', display_value: 'Test Drug' },
  ]

  describe('convertAtlasToFilters', () => {
    test('should handle null input', () => {
      expect(() => convertAtlasToFilters(null, mockConceptSets)).toThrow('Invalid Atlas JSON input')
    })

    test('should handle empty Atlas definition', () => {
      const result = convertAtlasToFilters({}, mockConceptSets)
      expect(result).toBeInstanceOf(QueryFilterCardModel)
      expect(result.title).toBe('Cohort Definition')
      expect(result.type).toBe('inclusion')
      expect((result as any).inclusionCriteria).toBeDefined()
    })

    test('should convert simple Atlas definition', () => {
      const atlasJson = {
        name: 'Test Cohort',
        ConceptSets: [
          {
            id: 1,
            name: 'Test Condition Set',
          },
        ],
        InclusionRules: [
          {
            name: 'Test Rule',
            expression: {
              Type: 'ALL',
              CriteriaList: [
                {
                  Criteria: {
                    ConditionOccurrence: {
                      CodesetId: 1,
                      ConditionTypeExclude: false,
                    },
                  },
                },
              ],
            },
          },
        ],
      }

      const result = convertAtlasToFilters(atlasJson, mockConceptSets)

      expect(result).toBeInstanceOf(QueryFilterCardModel)
      expect(result.title).toBe('Test Cohort')
      expect(result.type).toBe('inclusion')
      expect((result as any).inclusionCriteria).toBeDefined()
      expect((result as any).inclusionCriteria.criteria).toHaveLength(1)
      expect((result as any).inclusionCriteria.criteria[0].events).toHaveLength(1)
      
      const firstEvent = (result as any).inclusionCriteria.criteria[0].events[0]
      expect(firstEvent.eventType).toBe('conditionOccurrence')
    })

    test('should handle inclusion and exclusion rules', () => {
      const atlasJson = {
        name: 'Test Cohort',
        InclusionRules: [
          {
            name: 'Include Drug',
            expression: {
              CriteriaList: [
                {
                  Criteria: {
                    DrugExposure: {
                      CodesetId: 2,
                      DrugTypeExclude: false,
                    },
                  },
                },
              ],
            },
          },
        ],
      }

      const result = convertAtlasToFilters(atlasJson, mockConceptSets)

      expect(result).toBeInstanceOf(QueryFilterCardModel)
      expect(result.title).toBe('Test Cohort')
      expect(result.type).toBe('inclusion')
      expect((result as any).inclusionCriteria).toBeDefined()
      expect((result as any).inclusionCriteria.criteria).toHaveLength(1)
    })

    test('should map concept sets correctly', () => {
      const atlasJson = {
        ConceptSets: [
          {
            id: 1,
            name: 'Test Condition Set',
          },
          {
            id: 999,
            name: 'Missing Drug Set',
          },
        ],
        InclusionRules: [
          {
            name: 'Test Mapping',
            expression: {
              Type: 'ALL',
              CriteriaList: [
                {
                  Criteria: {
                    ConditionOccurrence: {
                      CodesetId: 1, // Exists in mockConceptSets
                    },
                  },
                },
                {
                  Criteria: {
                    DrugExposure: {
                      CodesetId: 999, // Does not exist in mockConceptSets
                    },
                  },
                },
              ],
            },
          },
        ],
      }

      const result = convertAtlasToFilters(atlasJson, mockConceptSets)

      expect(result).toBeInstanceOf(QueryFilterCardModel)
      expect((result as any).inclusionCriteria).toBeDefined()
      expect((result as any).inclusionCriteria.criteria).toHaveLength(1)
      expect((result as any).inclusionCriteria.criteria[0].events).toHaveLength(2)

      // Check that concept sets are properly mapped in the nested structure
      const events = (result as any).inclusionCriteria.criteria[0].events
      expect(events[0].eventType).toBe('conditionOccurrence')
      expect(events[1].eventType).toBe('drugExposure')
    })
  })

  describe('getConceptSetMappings', () => {
    test('should extract concept set mappings', () => {
      const atlasJson = {
        ConceptSets: [
          {
            id: 1,
            name: 'Test Condition Set',
          },
          {
            id: 2,
            name: 'Test Drug Set',
          },
        ],
        InclusionRules: [
          {
            name: 'Test Rule',
            expression: {
              Type: 'ALL',
              CriteriaList: [
                { Criteria: { ConditionOccurrence: { CodesetId: 1 } } },
                { Criteria: { DrugExposure: { CodesetId: 2 } } },
              ],
            },
          },
        ],
      }

      const result = getConceptSetMappings(atlasJson, mockConceptSets)

      // Should deduplicate concept set IDs
      expect(result).toHaveLength(2)
      expect(result[0].id).toBe('1')
      expect(result[0].name).toBe('Test Condition') // From mockConceptSets lookup
      expect(result[1].id).toBe('2')
      expect(result[1].name).toBe('Test Drug') // From mockConceptSets lookup
    })

    test('should handle null input', () => {
      const result = getConceptSetMappings(null, mockConceptSets)
      expect(result).toEqual([])
    })
  })

  describe('Round-trip conversion', () => {
    test('should convert sample6 Atlas format back to original structure', () => {
      const result = convertAtlasToFilters(sample6Expected, mockConceptSets)

      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(QueryFilterCardModel)
      expect((result as any).inclusionCriteria).toBeDefined()
      expect((result as any).inclusionCriteria.criteria).toHaveLength(2)
    })
  })
})
