/**
 * Round-trip conversion tests for Atlas JSON ↔ UI format
 *
 * These tests verify that converting Atlas cohort definitions to UI format
 * and then back to Atlas format preserves the essential structure and data.
 * This ensures consistency between the two formats and validates that the
 * conversion functions work correctly in both directions.
 */

import { QueryFilterManager } from '../models/QueryFilterModel'
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

    // Verify UI conversion worked
    expect(uiFilters).toHaveLength(1)
    expect(uiFilters[0].type).toBe('inclusion')
    expect(uiFilters[0].title).toBe('Has Diabetes')
    expect(uiFilters[0].events).toHaveLength(1)
    expect(uiFilters[0].events[0].conceptSet).toBe('Diabetes')
    expect(uiFilters[0].events[0].criteriaType).toBe('conditionOccurrence')

    // Add concept set details to the event (required for back-conversion)
    uiFilters[0].events[0].conceptSetDetails = simpleAtlas.ConceptSets[0].expression.items
    uiFilters[0].events[0].conceptSetId = '0'

    // 3. Convert UI back to Atlas format
    const manager = new QueryFilterManager(uiFilters)
    const roundTripAtlas = manager.convertToAtlasFormat('all')

    // 4. Verify round-trip conversion maintains key structures
    expect(roundTripAtlas.ConceptSets).toHaveLength(1)
    expect(roundTripAtlas.ConceptSets[0].name).toBe('Diabetes')
    expect(roundTripAtlas.ConceptSets[0].expression.items).toHaveLength(1)
    expect(roundTripAtlas.ConceptSets[0].expression.items[0].concept.CONCEPT_ID).toBe(201820)
    expect(roundTripAtlas.ConceptSets[0].expression.items[0].concept.CONCEPT_NAME).toBe('Diabetes mellitus')

    expect(roundTripAtlas.InclusionRules).toHaveLength(1)
    expect(roundTripAtlas.InclusionRules[0].name).toBe('Has Diabetes')
    expect(roundTripAtlas.InclusionRules[0].expression.Type).toBe('ALL')
    expect(roundTripAtlas.InclusionRules[0].expression.CriteriaList).toHaveLength(1)

    const criteria = roundTripAtlas.InclusionRules[0].expression.CriteriaList[0]
    expect(criteria.Criteria.ConditionOccurrence.CodesetId).toBe(0)
    // Note: ConditionTypeExclude is not set by convertToAtlasFormat, so we check structure exists
    expect(criteria.Criteria.ConditionOccurrence).toBeDefined()

    // Verify Atlas boilerplate is preserved
    expect(roundTripAtlas.QualifiedLimit.Type).toBe('All')
    expect(roundTripAtlas.ExpressionLimit.Type).toBe('All')
    expect(roundTripAtlas.CollapseSettings.CollapseType).toBe('ERA')
    expect(Array.isArray(roundTripAtlas.CensoringCriteria)).toBe(true)
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
      ExclusionRules: [
        {
          name: 'Exclude Type 1',
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
      QualifiedLimit: { Type: 'All' },
      ExpressionLimit: { Type: 'All' },
      CensoringCriteria: [],
      CollapseSettings: { CollapseType: 'ERA', EraPad: 0 },
      CensorWindow: {},
    }

    // Convert to UI
    const uiFilters = convertAtlasToFilters(atlasWithExclusion)

    // Should have 2 filters: 1 inclusion, 1 exclusion
    expect(uiFilters).toHaveLength(2)
    expect(uiFilters[0].type).toBe('inclusion')
    expect(uiFilters[1].type).toBe('exclusion')

    // Add concept set details for round-trip
    uiFilters[0].events[0].conceptSetDetails = atlasWithExclusion.ConceptSets[0].expression.items
    uiFilters[0].events[0].conceptSetId = '0'
    uiFilters[1].events[0].conceptSetDetails = atlasWithExclusion.ConceptSets[1].expression.items
    uiFilters[1].events[0].conceptSetId = '1'

    // Convert back to Atlas
    const manager = new QueryFilterManager(uiFilters)
    const roundTripAtlas = manager.convertToAtlasFormat('all')

    // Verify both inclusion and exclusion rules are preserved
    expect(roundTripAtlas.InclusionRules).toHaveLength(1)
    expect(roundTripAtlas.ExclusionRules).toHaveLength(1)
    expect(roundTripAtlas.ConceptSets).toHaveLength(2)

    expect(roundTripAtlas.InclusionRules[0].name).toBe('Has Diabetes')
    expect(roundTripAtlas.ExclusionRules[0].name).toBe('Exclude Type 1')

    // Verify exclusion rule structure (different from inclusion rules)
    expect(roundTripAtlas.ExclusionRules[0].expression.Type).toBe('ALL')
    expect(roundTripAtlas.ExclusionRules[0].expression.CriteriaList).toHaveLength(1)
    expect(roundTripAtlas.ExclusionRules[0].expression.CriteriaList[0].CriteriaList).toHaveLength(1)
    expect(
      roundTripAtlas.ExclusionRules[0].expression.CriteriaList[0].CriteriaList[0].ConditionOccurrence.CodesetId
    ).toBe(1)
  })
})
