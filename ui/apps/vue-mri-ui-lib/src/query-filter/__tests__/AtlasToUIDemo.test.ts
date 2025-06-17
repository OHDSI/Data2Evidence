/**
 * Demo test to verify Atlas JSON to UI conversion works end-to-end
 * This test demonstrates the complete flow from Atlas JSON to UI representation
 */

import { QueryFilterCardModel, QueryFilterManager } from '../models/QueryFilterModel'
import { convertAtlasToFilters, ConceptSetItem } from '../utils/AtlasConverter'

// Real-world example Atlas cohort definition from OHDSI Atlas
const realWorldAtlasExample = {
  name: 'Type 2 Diabetes Cohort',
  description: 'Patients with Type 2 Diabetes who received Metformin',
  cdmVersionRange: '>=5.0.0',
  ConceptSets: [
    {
      id: 1,
      name: 'Type 2 Diabetes Mellitus',
      expression: {
        items: [
          {
            concept: {
              CONCEPT_ID: 201826,
              CONCEPT_NAME: 'Type 2 diabetes mellitus',
              CONCEPT_CODE: 'E11',
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
          {
            concept: {
              CONCEPT_ID: 444406,
              CONCEPT_NAME: 'Diabetes mellitus type 2 without complication',
              CONCEPT_CODE: 'E11.9',
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
          {
            concept: {
              CONCEPT_ID: 1503796,
              CONCEPT_NAME: 'Metformin hydrochloride',
              CONCEPT_CODE: '6809-4',
              VOCABULARY_ID: 'RxNorm',
              DOMAIN_ID: 'Drug',
              STANDARD_CONCEPT: 'S',
              STANDARD_CONCEPT_CAPTION: 'Standard',
              INVALID_REASON: '',
              INVALID_REASON_CAPTION: '',
              CONCEPT_CLASS_ID: 'Precise Ingredient',
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
      id: 3,
      name: 'HbA1c Laboratory Test',
      expression: {
        items: [
          {
            concept: {
              CONCEPT_ID: 3004410,
              CONCEPT_NAME: 'Hemoglobin A1c/Hemoglobin.total in Blood',
              CONCEPT_CODE: '4548-4',
              VOCABULARY_ID: 'LOINC',
              DOMAIN_ID: 'Measurement',
              STANDARD_CONCEPT: 'S',
              STANDARD_CONCEPT_CAPTION: 'Standard',
              INVALID_REASON: '',
              INVALID_REASON_CAPTION: '',
              CONCEPT_CLASS_ID: 'Lab Test',
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
          Age: {
            Value: 18,
            Op: 'gte',
          },
          Gender: [8507], // Female
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
      name: 'Has Metformin prescription within 30 days',
      expression: {
        Type: 'ALL',
        Count: 1,
        CriteriaList: [
          {
            Criteria: {
              DrugExposure: {
                CodesetId: 2,
                DrugTypeExclude: false,
                EffectiveDrugDose: {
                  Value: 500,
                  Op: 'gte',
                },
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
    {
      name: 'Has HbA1c measurement in past year',
      expression: {
        Type: 'ALL',
        Count: 1,
        CriteriaList: [
          {
            Criteria: {
              Measurement: {
                CodesetId: 3,
                MeasurementTypeExclude: false,
                ValueAsNumber: {
                  Value: 7.0,
                  Op: 'gte',
                },
              },
            },
            StartWindow: {
              Start: { Days: 365, Coeff: -1 },
              End: { Days: 0, Coeff: 1 },
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
  ExclusionRules: [
    {
      name: 'Exclude Type 1 Diabetes',
      expression: {
        Type: 'ANY',
        CriteriaList: [
          {
            Criteria: {
              ConditionOccurrence: {
                CodesetId: 4, // Type 1 Diabetes concept set (not defined here for brevity)
                ConditionTypeExclude: false,
              },
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
}

// Mock concept sets that would be loaded in the component for demo purposes
const mockConceptSets: ConceptSetItem[] = [
  { value: '1', text: 'Type 2 Diabetes Mellitus', display_value: 'Type 2 Diabetes Mellitus' },
  { value: '2', text: 'Metformin', display_value: 'Metformin' },
  { value: '3', text: 'HbA1c Laboratory Test', display_value: 'HbA1c Laboratory Test' },
  { value: '4', text: 'Type 1 Diabetes Mellitus', display_value: 'Type 1 Diabetes Mellitus' },
]

describe('Atlas to UI Conversion Demo', () => {
  test('should demonstrate complete Atlas JSON to UI conversion workflow', () => {
    // Step 1: Input - Real-world Atlas cohort definition
    const atlasInput = realWorldAtlasExample

    // Step 2: Conversion - Atlas JSON to UI Filters
    const uiFilters = convertAtlasToFilters(atlasInput, mockConceptSets)

    // Step 3: Verification - Check converted structure

    // Should have inclusion and exclusion rules (PrimaryCriteria is skipped)
    expect(uiFilters).toHaveLength(3) // 2 inclusion + 1 exclusion

    // Should have inclusion rules
    const metforminFilter = uiFilters[0]
    expect(metforminFilter.title).toBe('Has Metformin prescription within 30 days')
    expect(metforminFilter.type).toBe('inclusion')
    expect(metforminFilter.events[0].criteriaType).toBe('drugExposure')
    expect(metforminFilter.events[0].conceptSet).toBe('Metformin')

    const hba1cFilter = uiFilters[1]
    expect(hba1cFilter.title).toBe('Has HbA1c measurement in past year')
    expect(hba1cFilter.type).toBe('inclusion')
    expect(hba1cFilter.events[0].criteriaType).toBe('measurement')
    expect(hba1cFilter.events[0].conceptSet).toBe('HbA1c Laboratory Test')

    // Should have exclusion rule
    const exclusionFilter = uiFilters[2]
    expect(exclusionFilter.title).toBe('Exclude Type 1 Diabetes')
    expect(exclusionFilter.type).toBe('exclusion')
    expect(exclusionFilter.events[0].criteriaType).toBe('conditionOccurrence')

    // Step 4: Roundtrip test - Convert back to Atlas format
    const filterManager = new QueryFilterManager(uiFilters)
    const convertedBackAtlas = filterManager.convertToAtlasFormat('all')

    // Verify roundtrip conversion maintains structure
    expect(convertedBackAtlas.InclusionRules).toHaveLength(2) // 2 inclusion rules (no primary)
    expect(Array.isArray(convertedBackAtlas.ConceptSets)).toBe(true)
  })

  test('should demonstrate concept set detail loading flow', () => {
    const uiFilters = convertAtlasToFilters(realWorldAtlasExample, mockConceptSets)
    const primaryEvent = uiFilters[0].events[0]

    // Verify concept set is selected and ready for detail loading
    expect(primaryEvent.selectedConceptSet).toBeDefined()
    expect(primaryEvent.conceptSetId).toBe('2') // Metformin concept set
    expect(primaryEvent.selectedConceptSet?.text).toBe('Metformin')

    // In real usage, this would trigger handleEventConceptSetSelected
    // which would call the API and populate conceptSetDetails
  })
})
