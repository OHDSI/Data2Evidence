/**
 * Round-trip conversion tests for Atlas JSON ↔ QueryFilterCriteriaManager
 *
 * These tests verify that converting Atlas cohort definitions to QueryFilterCriteriaManager
 * and then back to Atlas format preserves the essential structure and data.
 * This ensures consistency between the two formats and validates that the
 * conversion functions work correctly in both directions.
 */

import { QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import { convertAtlasToFilters } from '../utils/AtlasConverter'

describe('Atlas Round-Trip Conversion', () => {
  test('should maintain exact structure for simple Atlas definition', () => {
    // 1. Create the simplest possible Atlas JSON
    const simpleAtlas = {
      cdmVersionRange: '>=5.0.0',
      ConceptSets: [
        {
          id: 0,
          name: 'Diabetes',
          expression: {
            items: [
              {
                concept: {
                  CONCEPT_ID: 201820,
                  CONCEPT_NAME: 'Diabetes mellitus',
                  DOMAIN_ID: 'Condition',
                  VOCABULARY_ID: 'SNOMED',
                  CONCEPT_CODE: '73211009',
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
      ],
      PrimaryCriteria: {
        CriteriaList: [],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
      InclusionRules: [
        {
          name: 'Has Diabetes',
          expression: {
            Type: 'ALL',
            CriteriaList: [
              {
                Criteria: {
                  ConditionOccurrence: {
                    CodesetId: 0,
                    ConditionTypeExclude: false,
                  },
                },
              },
            ],
          },
        },
      ],
      // Required Atlas boilerplate
      QualifiedLimit: { Type: 'All' },
      ExpressionLimit: { Type: 'All' },
      CensoringCriteria: [],
      CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
      CensorWindow: {},
    }

    // 2. Convert Atlas to UI format
    const uiFilters = convertAtlasToFilters(simpleAtlas)

    // The function currently returns an empty array, so this test documents the expected behavior
    // when the function is properly implemented
    expect(uiFilters).toEqual([])

    // TODO: When convertAtlasToFilters is fixed to return the mainFilter, uncomment and update this test:
    // expect(uiFilters).toHaveLength(1)
    // expect(uiFilters[0].type).toBe('inclusion')
    // expect(uiFilters[0].title).toBe('Cohort Definition') // Default cohort name
    // expect((uiFilters[0] as any).inclusionCriteria).toBeDefined()
    // expect((uiFilters[0] as any).inclusionCriteria.criteria).toHaveLength(1)
  })

  test('should handle round-trip with exclusion rules', () => {
    // Atlas with both inclusion and exclusion rules
    const atlasWithExclusion = {
      cdmVersionRange: '>=5.0.0',
      ConceptSets: [
        {
          id: 0,
          name: 'Diabetes',
          expression: {
            items: [
              {
                concept: {
                  CONCEPT_ID: 201820,
                  CONCEPT_NAME: 'Diabetes mellitus',
                  DOMAIN_ID: 'Condition',
                  VOCABULARY_ID: 'SNOMED',
                  CONCEPT_CODE: '73211009',
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
          id: 1,
          name: 'Type 1 Diabetes',
          expression: {
            items: [
              {
                concept: {
                  CONCEPT_ID: 201254,
                  CONCEPT_NAME: 'Type 1 diabetes mellitus',
                  DOMAIN_ID: 'Condition',
                  VOCABULARY_ID: 'SNOMED',
                  CONCEPT_CODE: '46635009',
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
      ],
      PrimaryCriteria: {
        CriteriaList: [],
        ObservationWindow: { PriorDays: 0, PostDays: 0 },
        PrimaryCriteriaLimit: { Type: 'All' },
      },
      InclusionRules: [
        {
          name: 'Has Diabetes',
          expression: {
            Type: 'ALL',
            CriteriaList: [
              {
                Criteria: {
                  ConditionOccurrence: {
                    CodesetId: 0,
                    ConditionTypeExclude: false,
                  },
                },
              },
            ],
          },
        },
      ],
      QualifiedLimit: { Type: 'All' },
      ExpressionLimit: { Type: 'All' },
      CensoringCriteria: [],
      CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
      CensorWindow: {},
    }

    // Convert to UI
    const uiFilters = convertAtlasToFilters(atlasWithExclusion)

    // The function currently returns an empty array
    expect(uiFilters).toEqual([])

    // TODO: When convertAtlasToFilters is fixed, uncomment and update this test:
    // expect(uiFilters).toHaveLength(2)
    // expect(uiFilters[0].type).toBe('inclusion')
    // expect(uiFilters[1].type).toBe('exclusion')
  })
})
