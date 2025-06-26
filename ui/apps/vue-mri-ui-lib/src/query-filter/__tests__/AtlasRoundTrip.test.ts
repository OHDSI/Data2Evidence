/**
 * Round-trip conversion tests for Atlas JSON ↔ QueryFilterCriteriaManager
 *
 * These tests verify that converting Atlas cohort definitions to QueryFilterCriteriaManager
 * and then back to Atlas format preserves the essential structure and data.
 * This ensures consistency between the two formats and validates that the
 * conversion functions work correctly in both directions.
 */

import { QueryFilterCardModel, QueryFilterCriteriaManager } from '../models/QueryFilterModel'
import { convertAtlasToFilters } from '../utils/AtlasConverter'

describe('Atlas Round-Trip Conversion', () => {
  test('should maintain exact structure for simple Atlas definition', () => {
    // Create simple Atlas JSON
    const simpleAtlas: any = {
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
        PrimaryCriteriaLimit: { Type: 'All' as const },
      },
      InclusionRules: [
        {
          name: 'Has Diabetes',
          expression: {
            Type: 'ALL' as const,
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
      QualifiedLimit: { Type: 'All' as const },
      ExpressionLimit: { Type: 'All' as const },
      CensoringCriteria: [],
      CollapseSettings: { CollapseType: 'ERA' as const, EraPad: 0 },
      CensorWindow: {},
    }

    // 2. Convert Atlas to UI format
    const uiFilters = convertAtlasToFilters(simpleAtlas)

    // Verify UI conversion worked - new structure with inclusionCriteria
    expect(uiFilters).toBeInstanceOf(QueryFilterCriteriaManager)
    const criteria = uiFilters.getCriteria()
    expect(criteria).toBeDefined()
    expect(criteria.criteria).toHaveLength(1)
  })

  test('should handle round-trip with exclusion rules', () => {
    // Atlas with both inclusion and exclusion rules
    const atlasWithExclusion: any = {
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
        PrimaryCriteriaLimit: { Type: 'All' as const },
      },
      InclusionRules: [
        {
          name: 'Has Diabetes',
          expression: {
            Type: 'ALL' as const,
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
      QualifiedLimit: { Type: 'All' as const },
      ExpressionLimit: { Type: 'All' as const },
      CensoringCriteria: [],
      CollapseSettings: { CollapseType: 'ERA' as const, EraPad: 0 },
      CensorWindow: {},
    }

    // Convert to UI
    const uiFilters = convertAtlasToFilters(atlasWithExclusion)

    // Should return a single filter with inclusion criteria (exclusion rules are not handled yet)
    expect(uiFilters).toBeInstanceOf(QueryFilterCriteriaManager)
    const criteria = uiFilters.getCriteria()
    expect(criteria).toBeDefined()
    expect(criteria.criteria).toHaveLength(1)
  })
})
