import { AtlasCohortAdapter, SimplifiedCohortDefinition } from '../models/AtlasCohortAdapter'
import { AtlasCohortDefinition } from '../models/AtlasCohortDefinition'
import { QueryFilterCardModel } from '../models/QueryFilterModel'

// Mock Atlas cohort definition for testing
const createMockAtlasCohortDefinition = (): AtlasCohortDefinition => ({
  cdmVersionRange: '>=5.0.0',
  PrimaryCriteria: {
    CriteriaList: [
      {
        ConditionOccurrence: {
          CodesetId: 1,
          ConditionTypeExclude: false,
          First: true,
        },
      },
      {
        DrugExposure: {
          CodesetId: 2,
          DrugTypeExclude: false,
          First: false,
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
          {
            concept: {
              CONCEPT_ID: 201821,
              CONCEPT_NAME: 'Type 1 diabetes',
              CONCEPT_CODE: 'E10',
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
            isExcluded: true, // This one is excluded
            includeDescendants: false,
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
  InclusionRules: [
    {
      name: 'Has HbA1c measurement',
      expression: {
        Type: 'ALL',
        Count: 1,
        CriteriaList: [
          {
            Criteria: {
              Measurement: {
                CodesetId: 3,
                MeasurementTypeExclude: false,
              },
            },
            StartWindow: {
              Start: { Days: 0, Coeff: -1 },
              End: { Days: 0, Coeff: 1 },
              UseIndexEnd: false,
              UseEventEnd: false,
            },
            EndWindow: {
              Start: { Days: 0, Coeff: -1 },
              End: { Days: 365, Coeff: 1 },
              UseIndexEnd: false,
              UseEventEnd: false,
            },
            Occurrence: {
              Type: 2,
              Count: 1,
              IsDistinct: false,
            },
            RestrictVisit: false,
          },
        ],
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

describe('AtlasCohortAdapter', () => {
  let mockAtlasDef: AtlasCohortDefinition

  beforeEach(() => {
    mockAtlasDef = createMockAtlasCohortDefinition()
  })

  describe('toSimplified', () => {
    it('should convert Atlas definition to simplified format', () => {
      const simplified = AtlasCohortAdapter.toSimplified(mockAtlasDef)

      expect(simplified.conceptSets).toHaveLength(2)
      expect(simplified.conceptSets[0].id).toBe(1)
      expect(simplified.conceptSets[0].name).toBe('Diabetes Conditions')
      expect(simplified.conceptSets[0].concepts).toHaveLength(2)
    })

    it('should extract concept sets correctly', () => {
      const simplified = AtlasCohortAdapter.toSimplified(mockAtlasDef)
      const diabetesCS = simplified.conceptSets[0]

      expect(diabetesCS.concepts[0].id).toBe(201820)
      expect(diabetesCS.concepts[0].name).toBe('Diabetes mellitus')
      expect(diabetesCS.concepts[0].code).toBe('E10-E14')
      expect(diabetesCS.concepts[0].vocabularyId).toBe('ICD10CM')
      expect(diabetesCS.concepts[0].domainId).toBe('Condition')
      expect(diabetesCS.concepts[0].isExcluded).toBe(false)
      expect(diabetesCS.concepts[0].includeDescendants).toBe(true)

      expect(diabetesCS.concepts[1].isExcluded).toBe(true)
    })

    it('should extract primary criteria correctly', () => {
      const simplified = AtlasCohortAdapter.toSimplified(mockAtlasDef)

      expect(simplified.primaryCriteria.criteriaList).toHaveLength(2)
      expect(simplified.primaryCriteria.criteriaList[0].type).toBe('ConditionOccurrence')
      expect(simplified.primaryCriteria.criteriaList[0].conceptSetId).toBe(1)
      expect(simplified.primaryCriteria.criteriaList[0].isTypeExcluded).toBe(false)

      expect(simplified.primaryCriteria.criteriaList[1].type).toBe('DrugExposure')
      expect(simplified.primaryCriteria.criteriaList[1].conceptSetId).toBe(2)

      expect(simplified.primaryCriteria.observationWindow.priorDays).toBe(365)
      expect(simplified.primaryCriteria.observationWindow.postDays).toBe(0)
    })

    it('should extract inclusion rules correctly', () => {
      const simplified = AtlasCohortAdapter.toSimplified(mockAtlasDef)

      expect(simplified.inclusionRules).toHaveLength(1)
      expect(simplified.inclusionRules[0].name).toBe('Has HbA1c measurement')
      expect(simplified.inclusionRules[0].type).toBe('ALL')
      expect(simplified.inclusionRules[0].count).toBe(1)
    })

    it('should handle missing concept set names', () => {
      const simplified = AtlasCohortAdapter.toSimplified(mockAtlasDef)
      const criteria = simplified.primaryCriteria.criteriaList[0]

      expect(criteria.conceptSetName).toBe('Diabetes Conditions')
    })
  })

  describe('toQueryFilterModel', () => {
    let simplified: SimplifiedCohortDefinition

    beforeEach(() => {
      simplified = AtlasCohortAdapter.toSimplified(mockAtlasDef)
    })

    it('should convert simplified format to query filter models', () => {
      const filters = AtlasCohortAdapter.toQueryFilterModel(simplified)

      expect(filters).toHaveLength(2) // Primary + 1 inclusion rule
      expect(filters[0]).toBeInstanceOf(QueryFilterCardModel)
    })

    it('should create primary criteria filter', () => {
      const filters = AtlasCohortAdapter.toQueryFilterModel(simplified)
      const primaryFilter = filters[0]

      expect(primaryFilter.title).toBe('Primary Events')
      expect(primaryFilter.type).toBe('inclusion')
      expect(primaryFilter.events).toHaveLength(2)
    })

    it('should create inclusion rule filters', () => {
      const filters = AtlasCohortAdapter.toQueryFilterModel(simplified)
      const inclusionFilter = filters[1]

      expect(inclusionFilter.title).toBe('Has HbA1c measurement')
      expect(inclusionFilter.type).toBe('inclusion')
    })

    it('should create chips from non-excluded concepts', () => {
      const filters = AtlasCohortAdapter.toQueryFilterModel(simplified)
      const primaryFilter = filters[0]
      const diabetesEvent = primaryFilter.events[0]

      // Should only have 1 chip (the non-excluded concept)
      expect(diabetesEvent.chips).toHaveLength(1)
      expect(diabetesEvent.chips[0].label).toBe('Diabetes mellitus')
      expect(diabetesEvent.chips[0].value).toBe('E10-E14')
    })

    it('should set correct concept set information', () => {
      const filters = AtlasCohortAdapter.toQueryFilterModel(simplified)
      const primaryFilter = filters[0]
      const diabetesEvent = primaryFilter.events[0]

      expect(diabetesEvent.conceptSet).toBe('Diabetes Conditions')
      expect(diabetesEvent.conceptSetId).toBe('1')
    })

    it('should handle empty primary criteria', () => {
      const emptySimplified: SimplifiedCohortDefinition = {
        primaryCriteria: {
          criteriaList: [],
          observationWindow: { priorDays: 0, postDays: 0 },
        },
        conceptSets: [],
        inclusionRules: [],
      }

      const filters = AtlasCohortAdapter.toQueryFilterModel(emptySimplified)
      expect(filters).toHaveLength(0)
    })

    it('should handle exclusion rules if present', () => {
      const simplifiedWithExclusion: SimplifiedCohortDefinition = {
        ...simplified,
        exclusionRules: [
          {
            name: 'Exclude pregnancy',
            criteriaList: [
              {
                type: 'ConditionOccurrence',
                conceptSetId: 4,
                isTypeExcluded: false,
              },
            ],
          },
        ],
      }

      const filters = AtlasCohortAdapter.toQueryFilterModel(simplifiedWithExclusion)
      expect(filters).toHaveLength(3) // Primary + inclusion + exclusion
      expect(filters[2].type).toBe('exclusion')
      expect(filters[2].title).toBe('Exclude pregnancy')
    })
  })

  describe('atlasToQueryFilters', () => {
    it('should convert directly from Atlas to Query Filter Models', () => {
      const filters = AtlasCohortAdapter.atlasToQueryFilters(mockAtlasDef)

      expect(filters).toHaveLength(2)
      expect(filters[0]).toBeInstanceOf(QueryFilterCardModel)
      expect(filters[0].title).toBe('Primary Events')
      expect(filters[1].title).toBe('Has HbA1c measurement')
    })
  })

  describe('domain color mapping', () => {
    it('should assign correct colors for different domains', () => {
      // Create test data with different domains
      const testAtlas: AtlasCohortDefinition = {
        ...mockAtlasDef,
        ConceptSets: [
          {
            id: 1,
            name: 'Mixed Domains',
            expression: {
              items: [
                {
                  concept: {
                    ...mockAtlasDef.ConceptSets[0].expression.items[0].concept,
                    DOMAIN_ID: 'Condition',
                  },
                  isExcluded: false,
                  includeDescendants: true,
                  includeMapped: false,
                },
                {
                  concept: {
                    ...mockAtlasDef.ConceptSets[0].expression.items[0].concept,
                    CONCEPT_ID: 123,
                    DOMAIN_ID: 'Drug',
                  },
                  isExcluded: false,
                  includeDescendants: true,
                  includeMapped: false,
                },
                {
                  concept: {
                    ...mockAtlasDef.ConceptSets[0].expression.items[0].concept,
                    CONCEPT_ID: 456,
                    DOMAIN_ID: 'UnknownDomain',
                  },
                  isExcluded: false,
                  includeDescendants: true,
                  includeMapped: false,
                },
              ],
            },
          },
        ],
      }

      const filters = AtlasCohortAdapter.atlasToQueryFilters(testAtlas)
      const event = filters[0].events[0]

      expect(event.chips).toHaveLength(3)
      expect(event.chips[0].color).toBe('#e74c3c') // Condition - Red
      expect(event.chips[1].color).toBe('#3498db') // Drug - Blue
      expect(event.chips[2].color).toBe('#7f8c8d') // Unknown - Default Gray
    })
  })

  describe('edge cases', () => {
    it('should handle Atlas definition with missing concept sets', () => {
      const atlasWithMissingCS: AtlasCohortDefinition = {
        ...mockAtlasDef,
        ConceptSets: [],
      }

      const simplified = AtlasCohortAdapter.toSimplified(atlasWithMissingCS)
      expect(simplified.conceptSets).toHaveLength(0)

      const filters = AtlasCohortAdapter.toQueryFilterModel(simplified)
      expect(filters[0].events[0].conceptSet).toBe('Concept Set 1')
      expect(filters[0].events[0].chips).toHaveLength(0)
    })

    it('should handle criteria with missing CodesetId', () => {
      const atlasWithMissingCodeset: AtlasCohortDefinition = {
        ...mockAtlasDef,
        PrimaryCriteria: {
          ...mockAtlasDef.PrimaryCriteria,
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 0, // Missing/invalid codeset
                ConditionTypeExclude: false,
              },
            },
          ],
        },
      }

      const simplified = AtlasCohortAdapter.toSimplified(atlasWithMissingCodeset)
      expect(simplified.primaryCriteria.criteriaList[0].conceptSetId).toBe(0)
    })

    it('should handle empty inclusion rules', () => {
      const atlasWithoutInclusion: AtlasCohortDefinition = {
        ...mockAtlasDef,
        InclusionRules: [],
      }

      const filters = AtlasCohortAdapter.atlasToQueryFilters(atlasWithoutInclusion)
      expect(filters).toHaveLength(1) // Only primary criteria
    })
  })

  describe('additional criteria extraction', () => {
    it('should extract age and gender criteria', () => {
      const atlasWithAdditional: AtlasCohortDefinition = {
        ...mockAtlasDef,
        PrimaryCriteria: {
          ...mockAtlasDef.PrimaryCriteria,
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 1,
                ConditionTypeExclude: false,
                Age: {
                  Value: 18,
                  Extent: 65,
                  Op: 'bt',
                },
                Gender: [
                  {
                    id: 8507,
                    name: 'MALE',
                    expression: { items: [] },
                  },
                ],
              },
            },
          ],
        },
      }

      const simplified = AtlasCohortAdapter.toSimplified(atlasWithAdditional)
      const additionalCriteria = simplified.primaryCriteria.criteriaList[0].additionalCriteria

      expect(additionalCriteria?.age).toBeDefined()
      expect(additionalCriteria?.gender).toBeDefined()
    })
  })
})