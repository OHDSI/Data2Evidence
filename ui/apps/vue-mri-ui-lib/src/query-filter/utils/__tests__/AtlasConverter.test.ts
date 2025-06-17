import { convertAtlasToFilters, getConceptSetMappings, ConceptSetItem } from '../AtlasConverter'
import { QueryFilterCardModel } from '../../models/QueryFilterModel'

describe('AtlasConverter', () => {
  const mockConceptSets: ConceptSetItem[] = [
    { value: '1', text: 'Test Condition', display_value: 'Test Condition' },
    { value: '2', text: 'Test Drug', display_value: 'Test Drug' },
  ]

  describe('convertAtlasToFilters', () => {
    test('should handle null input', () => {
      const result = convertAtlasToFilters(null, mockConceptSets)
      expect(result).toEqual([])
    })

    test('should handle empty Atlas definition', () => {
      const result = convertAtlasToFilters({}, mockConceptSets)
      expect(result).toEqual([])
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

      expect(result).toHaveLength(1)
      expect(result[0]).toBeInstanceOf(QueryFilterCardModel)
      expect(result[0].title).toBe('Test Rule')
      expect(result[0].type).toBe('inclusion')
      expect(result[0].events).toHaveLength(1)
      expect(result[0].events[0].criteriaType).toBe('conditionOccurrence')
      expect(result[0].events[0].conceptSet).toBe('Test Condition') // From mockConceptSets lookup
      expect(result[0].events[0].conceptSetId).toBe('1')
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
        ExclusionRules: [
          {
            name: 'Exclude Condition',
            expression: {
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

      expect(result).toHaveLength(2)

      // Inclusion rule
      expect(result[0].title).toBe('Include Drug')
      expect(result[0].type).toBe('inclusion')
      expect(result[0].events[0].criteriaType).toBe('drugExposure')

      // Exclusion rule
      expect(result[1].title).toBe('Exclude Condition')
      expect(result[1].type).toBe('exclusion')
      expect(result[1].events[0].criteriaType).toBe('conditionOccurrence')
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

      expect(result).toHaveLength(1)
      expect(result[0].events).toHaveLength(2)

      // First event should find concept set
      expect(result[0].events[0].conceptSet).toBe('Test Condition')
      expect(result[0].events[0].selectedConceptSet).toBeDefined()

      // Second event should fallback to Atlas concept set name
      expect(result[0].events[1].conceptSet).toBe('Missing Drug Set') // From Atlas ConceptSets
      expect(result[0].events[1].selectedConceptSet).toBeDefined() // Should have fallback concept set item
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
        ExclusionRules: [
          {
            name: 'Exclusion Rule',
            expression: {
              Type: 'ALL',
              CriteriaList: [
                { Criteria: { ConditionOccurrence: { CodesetId: 1 } } }, // Duplicate
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
})
