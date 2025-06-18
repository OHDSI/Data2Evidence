import { QueryFilterCardModel, QueryFilterManager, QueryFilterEvent } from '../models/QueryFilterModel'
import { convertAtlasToFilters, ConceptSetItem } from '../utils/AtlasConverter'
import sample1Expected from './data/sample1-expected'
import sample2Expected from './data/sample2-expected'
import sample3Expected from './data/sample3-expected'

// Mock realistic Atlas cohort definition with concept sets
const createRealisticAtlasDefinition = () => ({
  name: 'Diabetes with Metformin',
  cdmVersionRange: '>=5.0.0',
  ConceptSets: [
    {
      id: 1,
      name: 'Diabetes Conditions',
      expression: {
        items: [
          {
            concept: {
              CONCEPT_ID: 201820,
              CONCEPT_NAME: 'Diabetes mellitus',
              CONCEPT_CODE: 'E10-E14',
              VOCABULARY_ID: 'ICD10CM',
              DOMAIN_ID: 'Condition',
              STANDARD_CONCEPT: 'S',
              STANDARD_CONCEPT_CAPTION: 'Standard',
              INVALID_REASON: '',
              INVALID_REASON_CAPTION: '',
              CONCEPT_CLASS_ID: 'Clinical Finding',
              VALID_START_DATE: '2020-01-01',
              VALID_END_DATE: '2099-12-31',
            },
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false,
          },
        ],
      },
    },
    {
      id: 2,
      name: 'Metformin',
      expression: {
        items: [
          {
            concept: {
              CONCEPT_ID: 1503297,
              CONCEPT_NAME: 'Metformin',
              CONCEPT_CODE: '6809',
              VOCABULARY_ID: 'RxNorm',
              DOMAIN_ID: 'Drug',
              STANDARD_CONCEPT: 'S',
              STANDARD_CONCEPT_CAPTION: 'Standard',
              INVALID_REASON: '',
              INVALID_REASON_CAPTION: '',
              CONCEPT_CLASS_ID: 'Ingredient',
              VALID_START_DATE: '2020-01-01',
              VALID_END_DATE: '2099-12-31',
            },
            isExcluded: false,
            includeDescendants: true,
            includeMapped: false,
          },
        ],
      },
    },
  ],
  PrimaryCriteria: {
    CriteriaList: [
      {
        ConditionOccurrence: {
          CodesetId: 1,
          ConditionTypeExclude: false,
          First: true,
        },
      },
    ],
    ObservationWindow: {
      PriorDays: 365,
      PostDays: 0,
    },
    PrimaryCriteriaLimit: {
      Type: 'First',
    },
  },
  InclusionRules: [
    {
      name: 'Must have Metformin',
      expression: {
        Type: 'ALL',
        Count: 1,
        CriteriaList: [
          {
            Criteria: {
              DrugExposure: {
                CodesetId: 2,
                DrugTypeExclude: false,
              },
            },
            StartWindow: {
              Start: { Days: 0, Coeff: -1 },
              End: { Days: 30, Coeff: 1 },
              UseEventEnd: false,
            },
            Occurrence: {
              Type: 2,
              Count: 1,
            },
          },
        ],
        DemographicCriteriaList: [],
        Groups: [],
      },
    },
  ],
  QualifiedLimit: { Type: 'First' },
  ExpressionLimit: { Type: 'All' },
  CensoringCriteria: [],
  CollapseSettings: {
    CollapseType: 'ERA',
    EraPad: 0,
  },
  CensorWindow: {},
})

// Mock concept sets that would be loaded in the component
const mockConceptSets: ConceptSetItem[] = [
  { value: '1', text: 'Diabetes Conditions', display_value: 'Diabetes Conditions' },
  { value: '2', text: 'Metformin', display_value: 'Metformin' },
]

describe('Atlas JSON to UI Conversion', () => {
  describe('Basic Atlas Structure Parsing', () => {
    test('should handle empty Atlas definition (sample1)', () => {
      const atlasInput = sample1Expected
      const uiFilters = convertAtlasToFilters(atlasInput, mockConceptSets)

      // Sample1 has empty criteria lists, should result in no filters
      expect(uiFilters).toHaveLength(0)
    })

    test('should convert simple inclusion rules (sample2)', () => {
      const atlasInput = sample2Expected
      const uiFilters = convertAtlasToFilters(atlasInput, mockConceptSets)

      // Sample2 has 1 inclusion rule with 2 criteria items (creates 2 filters)
      expect(uiFilters).toHaveLength(2)
      expect(uiFilters[0].title).toBe('Group 1')
      expect(uiFilters[0].type).toBe('inclusion')
      expect(uiFilters[0].events).toHaveLength(1)
      expect(uiFilters[0].events[0].criteriaType).toBe('conditionOccurrence')

      expect(uiFilters[1].title).toBe('Group 1')
      expect(uiFilters[1].type).toBe('inclusion')
    })

    test('should convert nested criteria structure (sample3)', () => {
      const atlasInput = sample3Expected
      const uiFilters = convertAtlasToFilters(atlasInput, mockConceptSets)

      // Sample3 has 1 inclusion rule with 2 criteria items (creates 2 filters)
      expect(uiFilters).toHaveLength(2)
      expect(uiFilters[0].title).toBe('Group 1')
      expect(uiFilters[0].events).toHaveLength(1)

      // The nested criteria would be handled differently in a full implementation
      // For now, just verify basic structure
      expect(uiFilters[1].title).toBe('Group 1')
    })
  })

  describe('Realistic Atlas Definition Conversion', () => {
    test('should convert realistic Atlas definition with concept sets', () => {
      const atlasInput = createRealisticAtlasDefinition()
      const uiFilters = convertAtlasToFilters(atlasInput, mockConceptSets)

      // Should only have inclusion rule (PrimaryCriteria is skipped)
      expect(uiFilters).toHaveLength(1)

      // Check inclusion rule filter
      const inclusionFilter = uiFilters[0]
      expect(inclusionFilter.title).toBe('Must have Metformin')
      expect(inclusionFilter.type).toBe('inclusion')
      expect(inclusionFilter.events).toHaveLength(1)
      expect(inclusionFilter.events[0].criteriaType).toBe('drugExposure')
      expect(inclusionFilter.events[0].conceptSet).toBe('Metformin')
      expect(inclusionFilter.events[0].conceptSetId).toBe('2')
    })

    test('should handle Atlas definition with exclusion rules', () => {
      const atlasInput = {
        ...createRealisticAtlasDefinition(),
        ExclusionRules: [
          {
            name: 'Exclude Type 1 Diabetes',
            expression: {
              Type: 'ANY',
              CriteriaList: [
                {
                  Criteria: {
                    ConditionOccurrence: {
                      CodesetId: 3,
                      ConditionTypeExclude: false,
                    },
                  },
                },
              ],
            },
          },
        ],
      }

      const uiFilters = convertAtlasToFilters(atlasInput, mockConceptSets)

      // Should have inclusion rule and exclusion rule (PrimaryCriteria is skipped)
      expect(uiFilters).toHaveLength(2)

      const exclusionFilter = uiFilters[1]
      expect(exclusionFilter.title).toBe('Exclude Type 1 Diabetes')
      expect(exclusionFilter.type).toBe('exclusion')
      expect(exclusionFilter.events).toHaveLength(1)
      expect(exclusionFilter.events[0].criteriaType).toBe('conditionOccurrence')
    })
  })

  describe('Concept Set Mapping', () => {
    test('should map concept set IDs to loaded concept sets', () => {
      const atlasInput = createRealisticAtlasDefinition()
      const uiFilters = convertAtlasToFilters(atlasInput, mockConceptSets)

      // Only inclusion rule is available (PrimaryCriteria is skipped)
      const inclusionEvent = uiFilters[0].events[0]
      expect(inclusionEvent.selectedConceptSet).toBeDefined()
      expect(inclusionEvent.selectedConceptSet.value).toBe('2')
      expect(inclusionEvent.selectedConceptSet.text).toBe('Metformin')
    })

    test('should fallback to Atlas concept set name when local concept set not found', () => {
      const atlasInput = {
        name: 'Test Fallback',
        ConceptSets: [],
        InclusionRules: [
          {
            name: 'Test Rule',
            expression: {
              Type: 'ALL',
              CriteriaList: [
                {
                  Criteria: {
                    ConditionOccurrence: {
                      CodesetId: 999, // Non-existent concept set ID
                      ConditionTypeExclude: false,
                    },
                  },
                },
              ],
            },
          },
        ],
      }

      const uiFilters = convertAtlasToFilters(atlasInput, mockConceptSets)

      expect(uiFilters).toHaveLength(1)
      const inclusionEvent = uiFilters[0].events[0]
      expect(inclusionEvent.conceptSet).toBe('Concept Set 999') // Fallback name
      expect(inclusionEvent.conceptSetId).toBe('999')
      expect(inclusionEvent.selectedConceptSet).toBeUndefined()
    })
  })

  describe('Criteria Type Detection', () => {
    test('should detect different criteria types correctly', () => {
      const atlasInput = {
        name: 'Multi-criteria Test',
        ConceptSets: [],
        InclusionRules: [
          {
            name: 'Multi-criteria Rule',
            expression: {
              Type: 'ALL',
              CriteriaList: [
                { Criteria: { ConditionOccurrence: { CodesetId: 1 } } },
                { Criteria: { DrugExposure: { CodesetId: 2 } } },
                { Criteria: { ProcedureOccurrence: { CodesetId: 3 } } },
                { Criteria: { Observation: { CodesetId: 4 } } },
                { Criteria: { Measurement: { CodesetId: 5 } } },
              ],
            },
          },
        ],
      }

      const uiFilters = convertAtlasToFilters(atlasInput, mockConceptSets)

      expect(uiFilters).toHaveLength(5)
      
      expect(uiFilters[0].events).toHaveLength(1)
      expect(uiFilters[1].events).toHaveLength(1)
      expect(uiFilters[2].events).toHaveLength(1)
      expect(uiFilters[3].events).toHaveLength(1)
      expect(uiFilters[4].events).toHaveLength(1)

      expect(uiFilters[0].events[0].criteriaType).toBe('conditionOccurrence')
      expect(uiFilters[1].events[0].criteriaType).toBe('drugExposure')
      expect(uiFilters[2].events[0].criteriaType).toBe('procedureOccurrence')
      expect(uiFilters[3].events[0].criteriaType).toBe('observation')
      expect(uiFilters[4].events[0].criteriaType).toBe('measurement')
    })
  })

  describe('Roundtrip Conversion Consistency', () => {
    test('should maintain basic structure consistency in roundtrip', () => {
      const originalAtlas = createRealisticAtlasDefinition()
      const uiFilters = convertAtlasToFilters(originalAtlas)

      // Create a filter manager and convert back to Atlas format
      const filterManager = new QueryFilterManager(uiFilters)
      const convertedBackAtlas = filterManager.convertToAtlasFormat('all')

      // Key properties should be preserved (only inclusion rule, no primary)
      expect(convertedBackAtlas.InclusionRules).toHaveLength(1) // Only 1 inclusion rule

      // Concept sets structure should be maintained
      // Note: The converted back version might have different structure
      // but should represent the same logical meaning
      expect(Array.isArray(convertedBackAtlas.ConceptSets)).toBe(true)
    })
  })

  describe('Error Handling', () => {
    test('should handle malformed Atlas JSON gracefully', () => {
      const malformedAtlas = {
        // Missing required properties
        PrimaryCriteria: null,
        InclusionRules: 'not-an-array',
      }

      expect(() => {
        convertAtlasToFilters(malformedAtlas, mockConceptSets)
      }).not.toThrow()

      const uiFilters = convertAtlasToFilters(malformedAtlas)
      expect(uiFilters).toHaveLength(0)
    })

    test('should handle empty or null input', () => {
      expect(() => {
        convertAtlasToFilters(null, mockConceptSets)
      }).not.toThrow()

      expect(() => {
        convertAtlasToFilters({}, mockConceptSets)
      }).not.toThrow()

      const uiFilters = convertAtlasToFilters({}, mockConceptSets)
      expect(uiFilters).toHaveLength(0)
    })
  })
})
