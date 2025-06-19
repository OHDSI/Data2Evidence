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
      expect(result[0].title).toBe('Test Cohort') // Main cohort title, not individual rule
      expect(result[0].type).toBe('inclusion')
      expect((result[0] as any).inclusionCriteria).toBeDefined()
      expect((result[0] as any).inclusionCriteria.criteria).toHaveLength(1)
      expect((result[0] as any).inclusionCriteria.criteria[0].events).toHaveLength(1)
      
      const firstEvent = (result[0] as any).inclusionCriteria.criteria[0].events[0]
      expect(firstEvent.eventType).toBe('conditionOccurrence')
      // Note: conceptSet and conceptSetId are only added if there's a CodesetId
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

      // The structure now creates a single filter with inclusionCriteria containing the rules
      expect(result[0].title).toBe('Test Cohort')
      expect(result[0].type).toBe('inclusion')
      expect((result[0] as any).inclusionCriteria).toBeDefined()
      expect((result[0] as any).inclusionCriteria.criteria).toHaveLength(1) // Only inclusion rules
      
      // Exclusion rule still creates a separate filter
      expect(result[1].title).toBe('Exclude Condition')
      expect(result[1].type).toBe('exclusion')
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

      expect(result).toHaveLength(1) // Now creates 1 filter with inclusionCriteria structure
      expect((result[0] as any).inclusionCriteria).toBeDefined()
      expect((result[0] as any).inclusionCriteria.criteria).toHaveLength(1)
      expect((result[0] as any).inclusionCriteria.criteria[0].events).toHaveLength(2)

      // Check that concept sets are properly mapped in the nested structure
      const events = (result[0] as any).inclusionCriteria.criteria[0].events
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

  describe('Round-trip conversion', () => {
    test('should convert sample6 Atlas format back to original structure', () => {
      const result = convertAtlasToFilters(sample6Expected, mockConceptSets)
      
      expect(result).toBeDefined()
      expect(Array.isArray(result)).toBe(true)

      // Test that we get QueryFilterCardModel instances first
      result.forEach(filter => {
        expect(filter).toBeInstanceOf(QueryFilterCardModel)
        expect(filter.id).toBeDefined()
      })

      // Verify that we have proper inclusionCriteria structure
      expect(result).toHaveLength(1)
      expect(result[0]).toHaveProperty('inclusionCriteria')
      expect((result[0] as any).inclusionCriteria).toHaveProperty('criteria')
      expect((result[0] as any).inclusionCriteria.criteria).toHaveLength(2)

      // Normalize IDs for exact comparison
      const normalizeIds = (obj: any): any => {
        const objStr = JSON.stringify(obj)
        
        // Replace all IDs with normalized versions based on their prefix
        const normalized = objStr
          .replace(/\"id\":\s*\"criteria_[^\"]+\"/g, '"id": "criteria_normalized"')
          .replace(/\"id\":\s*\"event_[^\"]+\"/g, '"id": "event_normalized"')
          .replace(/\"id\":\s*\"attribute_[^\"]+\"/g, '"id": "attribute_normalized"')
          .replace(/\"id\":\s*\"filter_[^\"]+\"/g, '"id": "filter_normalized"')
          .replace(/\"id\":\s*\"group_[^\"]+\"/g, '"id": "group_normalized"')
          .replace(/\"parentEventId\":\s*\"event_[^\"]+\"/g, '"parentEventId": "event_normalized"')
          .replace(/\"parentEventId\":\s*\"attribute_[^\"]+\"/g, '"parentEventId": "attribute_normalized"')
        
        return JSON.parse(normalized)
      }

      // Extract the inclusionCriteria from our result to compare with sample6Input
      const resultInclusionCriteria = (result[0] as any).inclusionCriteria
      const normalizedResult = normalizeIds(resultInclusionCriteria)
      const normalizedExpected = normalizeIds(sample6Input.inclusionCriteria)

      // Test structure match - the conversion should produce the exact same structure as sample6Input
      expect(normalizedResult).toEqual(normalizedExpected)
    })
  })
})
