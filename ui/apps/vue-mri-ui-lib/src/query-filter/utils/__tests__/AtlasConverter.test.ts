import { convertAtlasToFilters, getConceptSetMappings } from '../AtlasConverter'
import { QueryFilterCriteriaManager } from '../../models/QueryFilterModel'
import sample6Expected from '../../__tests__/data/sample6-expected'
import { ConceptSetItem } from '@/query-filter/types/ConceptSetTypes'

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
      const emptyAtlas: any = {
        ConceptSets: [],
        InclusionRules: [],
        PrimaryCriteria: {
          CriteriaList: [],
          ObservationWindow: { PriorDays: 0, PostDays: 0 },
          PrimaryCriteriaLimit: { Type: 'All' as const },
        },
        QualifiedLimit: { Type: 'All' as const },
        ExpressionLimit: { Type: 'All' as const },
        CensoringCriteria: [],
        CollapseSettings: { CollapseType: 'ERA' as const, EraPad: 0 },
        CensorWindow: {},
        cdmVersionRange: '>=5.0.0',
      }
      const result = convertAtlasToFilters(emptyAtlas, mockConceptSets)
      expect(result).toBeInstanceOf(QueryFilterCriteriaManager)
      expect(result.getCriteria()).toBeDefined()
    })

    test('should convert simple Atlas definition', () => {
      const atlasJson: any = {
        name: 'Test Cohort',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [
          {
            id: 1,
            name: 'Test Condition Set',
            expression: { items: [] },
          },
        ],
        PrimaryCriteria: {
          CriteriaList: [],
          ObservationWindow: { PriorDays: 0, PostDays: 0 },
          PrimaryCriteriaLimit: { Type: 'All' as const },
        },
        QualifiedLimit: { Type: 'All' as const },
        ExpressionLimit: { Type: 'All' as const },
        CensoringCriteria: [],
        CollapseSettings: { CollapseType: 'ERA' as const, EraPad: 0 },
        CensorWindow: {},
        InclusionRules: [
          {
            name: 'Test Rule',
            expression: {
              Type: 'ALL' as const,
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

      expect(result).toBeInstanceOf(QueryFilterCriteriaManager)
      const criteria = result.getCriteria()
      expect(criteria).toBeDefined()
      expect(criteria.criteria).toHaveLength(1)
      expect(criteria.criteria[0].events).toHaveLength(1)

      const firstEvent = criteria.criteria[0].events[0]
      expect(firstEvent.eventType).toBe('conditionOccurrence')
    })

    test('should handle inclusion and exclusion rules', () => {
      const atlasJson: any = {
        name: 'Test Cohort',
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [],
        PrimaryCriteria: {
          CriteriaList: [],
          ObservationWindow: { PriorDays: 0, PostDays: 0 },
          PrimaryCriteriaLimit: { Type: 'All' as const },
        },
        QualifiedLimit: { Type: 'All' as const },
        ExpressionLimit: { Type: 'All' as const },
        CensoringCriteria: [],
        CollapseSettings: { CollapseType: 'ERA' as const, EraPad: 0 },
        CensorWindow: {},
        InclusionRules: [
          {
            name: 'Include Drug',
            expression: {
              Type: 'ALL' as const,
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

      expect(result).toBeInstanceOf(QueryFilterCriteriaManager)
      const criteria = result.getCriteria()
      expect(criteria).toBeDefined()
      expect(criteria.criteria).toHaveLength(1)
    })

    test('should map concept sets correctly', () => {
      const atlasJson: any = {
        cdmVersionRange: '>=5.0.0',
        ConceptSets: [
          {
            id: 1,
            name: 'Test Condition Set',
            expression: { items: [] },
          },
          {
            id: 999,
            name: 'Missing Drug Set',
            expression: { items: [] },
          },
        ],
        PrimaryCriteria: {
          CriteriaList: [],
          ObservationWindow: { PriorDays: 0, PostDays: 0 },
          PrimaryCriteriaLimit: { Type: 'All' as const },
        },
        QualifiedLimit: { Type: 'All' as const },
        ExpressionLimit: { Type: 'All' as const },
        CensoringCriteria: [],
        CollapseSettings: { CollapseType: 'ERA' as const, EraPad: 0 },
        CensorWindow: {},
        InclusionRules: [
          {
            name: 'Test Mapping',
            expression: {
              Type: 'ALL' as const,
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

      expect(result).toBeInstanceOf(QueryFilterCriteriaManager)
      const criteria = result.getCriteria()
      expect(criteria).toBeDefined()
      expect(criteria.criteria).toHaveLength(1)
      expect(criteria.criteria[0].events).toHaveLength(2)

      // Check that concept sets are properly mapped in the nested structure
      const events = criteria.criteria[0].events
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
      // Add required properties for AtlasCohortDefinition type
      const sample6WithCdm = { ...sample6Expected, cdmVersionRange: '>=5.0.0' }
      const result = convertAtlasToFilters(sample6WithCdm as any, mockConceptSets)

      expect(result).toBeDefined()
      expect(result).toBeInstanceOf(QueryFilterCriteriaManager)
      const criteria = result.getCriteria()
      expect(criteria).toBeDefined()
      expect(criteria.criteria).toHaveLength(2)
    })
  })
})
