import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import QueryFilterModern from '../QueryFilterModern.vue'
import { QueryFilterCriteriaManager } from '../../models/QueryFilterModel'
import sample2Input from '../../__tests__/data/sample2-input'
import sample3Input from '../../__tests__/data/sample3-input'

// Mock the API services
vi.mock('../../services/ConceptSetApiService', () => ({
  loadConceptSets: vi.fn().mockResolvedValue({
    values: [
      { value: 'cs1', text: 'Diabetes Conditions', display_value: 'Diabetes Conditions' },
      { value: 'cs2', text: 'Hypertension Conditions', display_value: 'Hypertension Conditions' }
    ],
    isLoading: false,
    loadedStatus: 'SUCCESS'
  }),
  loadConceptSetDetails: vi.fn().mockResolvedValue({}),
  loadSingleConceptSetDetails: vi.fn().mockResolvedValue([])
}))

// Mock child components to focus on integration
vi.mock('../QueryFilterCriteria.vue', () => ({
  default: {
    name: 'QueryFilterCriteria',
    props: ['criteriaManager', 'conceptSets', 'conceptSetDomainValues', 'conceptSetTexts'],
    emits: ['criteria-updated', 'update:criteria'],
    template: `
      <div class="mock-criteria">
        <div class="criteria-count">{{ criteriaManager.getCriteria().criteria.length }} groups</div>
        <div class="criteria-type">{{ criteriaManager.getCriteria().criteriaType }}</div>
        <button @click="$emit('criteria-updated', criteriaManager)">Update</button>
      </div>
    `
  }
}))

describe('Atlas Integration Tests', () => {
  let wrapper: any

  beforeEach(() => {
    wrapper = mount(QueryFilterModern, {
      props: {
        debug: false,
        useNewHierarchy: true
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Atlas Conversion System', () => {
    it('converts hierarchical criteria to Atlas format', async () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)
      
      // Test the conversion
      const atlasFormat = manager.convertToAtlasFormat()
      
      // Validate Atlas structure
      expect(atlasFormat).toHaveProperty('ConceptSets')
      expect(atlasFormat).toHaveProperty('PrimaryCriteria')
      expect(atlasFormat).toHaveProperty('QualifiedLimit')
      expect(atlasFormat).toHaveProperty('InclusionRules')
      expect(atlasFormat).toHaveProperty('EndStrategy')
      
      // Validate qualifying events limit
      expect(atlasFormat.QualifiedLimit.Type).toBe('ALL')
      
      // Validate inclusion rules
      expect(atlasFormat.InclusionRules).toHaveLength(1)
      expect(atlasFormat.InclusionRules[0].name).toBe('Criteria 1')
      expect(atlasFormat.InclusionRules[0].description).toBe('Description 1')
      expect(atlasFormat.InclusionRules[0].expression.Type).toBe('ALL')
    })

    it('handles nested criteria in Atlas conversion', async () => {
      const manager = new QueryFilterCriteriaManager(sample3Input)
      
      const atlasFormat = manager.convertToAtlasFormat()
      
      // Should still convert to Atlas format even with nested structures
      expect(atlasFormat.InclusionRules).toHaveLength(1)
      expect(atlasFormat.InclusionRules[0].expression.CriteriaList).toHaveLength(2)
      
      // Nested structures are flattened in basic conversion
      const criteriaList = atlasFormat.InclusionRules[0].expression.CriteriaList
      criteriaList.forEach(criteria => {
        expect(criteria).toHaveProperty('Criteria')
        expect(criteria.Criteria).toHaveProperty('conditionOccurrence')
      })
    })

    it('preserves criteria types in Atlas conversion', async () => {
      const manager = new QueryFilterCriteriaManager({
        inclusionCriteria: {
          qualifyingEventsLimit: 'EARLIEST',
          criteria: [
            {
              id: 'test_criteria',
              title: 'Test Criteria',
              description: 'Test Description',
              criteriaType: 'ANY',
              events: [
                {
                  id: 'test_event',
                  eventType: 'drugExposure',
                  cardinality: { type: 'AT_LEAST', count: 1, using: 'ALL' }
                }
              ]
            }
          ]
        }
      })
      
      const atlasFormat = manager.convertToAtlasFormat()
      
      expect(atlasFormat.QualifiedLimit.Type).toBe('EARLIEST')
      expect(atlasFormat.InclusionRules[0].expression.Type).toBe('ANY')
      expect(atlasFormat.InclusionRules[0].expression.CriteriaList[0].Criteria).toHaveProperty('drugExposure')
    })
  })

  describe('Atlas Loading Integration', () => {
    it('loads Atlas cohort definition correctly', async () => {
      const mockAtlasJson = {
        name: 'Test Cohort',
        ConceptSets: [
          {
            id: 1,
            name: 'Diabetes Conditions',
            expression: {
              items: [
                {
                  concept: {
                    CONCEPT_ID: 201826,
                    CONCEPT_NAME: 'Type 2 diabetes mellitus',
                    CONCEPT_CODE: 'E11',
                    VOCABULARY_ID: 'ICD10CM'
                  },
                  includeDescendants: true,
                  includeMapped: false,
                  isExcluded: false
                }
              ]
            }
          }
        ],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 1,
                ConditionTypeExclude: false
              }
            }
          ],
          ObservationWindow: {
            PriorDays: 0,
            PostDays: 0
          },
          PrimaryCriteriaLimit: {
            Type: 'All'
          }
        },
        QualifiedLimit: {
          Type: 'First'
        },
        InclusionRules: [],
        EndStrategy: {
          Type: 'FixedDuration',
          FixedDuration: {
            Duration: 365,
            DurationUnit: 'Days'
          }
        }
      }

      const component = wrapper.vm as any
      
      // Test Atlas loading
      await component.loadAtlasCohortDefinition(mockAtlasJson)
      
      // Verify the criteria manager was updated
      const criteria = component.criteriaManager.getCriteria()
      expect(criteria.criteria.length).toBeGreaterThan(0)
    })

    it('handles concept set mapping during Atlas loading', async () => {
      const mockAtlasWithConceptSets = {
        name: 'Test Cohort with Concept Sets',
        ConceptSets: [
          {
            id: 1,
            name: 'Test Concept Set',
            expression: {
              items: [
                {
                  concept: {
                    CONCEPT_ID: 123,
                    CONCEPT_NAME: 'Test Concept',
                    CONCEPT_CODE: 'TEST123'
                  }
                }
              ]
            }
          }
        ],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 1
              }
            }
          ]
        }
      }

      const component = wrapper.vm as any
      
      // Should not throw error even with missing concept sets
      await expect(component.loadAtlasCohortDefinition(mockAtlasWithConceptSets)).resolves.not.toThrow()
    })
  })

  describe('Round-trip Conversion', () => {
    it('maintains data integrity through round-trip conversion', async () => {
      const originalManager = new QueryFilterCriteriaManager(sample2Input)
      
      // Convert to Atlas format
      const atlasFormat = originalManager.convertToAtlasFormat()
      
      // Load Atlas format back
      const component = wrapper.vm as any
      await component.loadAtlasCohortDefinition(atlasFormat)
      
      // Compare structures (basic validation)
      const resultCriteria = component.criteriaManager.getCriteria()
      const originalCriteria = originalManager.getCriteria()
      
      expect(resultCriteria.criteriaType).toBe(originalCriteria.criteriaType)
      expect(resultCriteria.criteria.length).toBeGreaterThan(0)
    })

    it('preserves nested structures through conversion', async () => {
      const originalManager = new QueryFilterCriteriaManager(sample3Input)
      
      // Convert to Atlas and back
      const atlasFormat = originalManager.convertToAtlasFormat()
      
      const component = wrapper.vm as any
      await component.loadAtlasCohortDefinition(atlasFormat)
      
      // Verify conversion completed without errors
      const resultCriteria = component.criteriaManager.getCriteria()
      expect(resultCriteria).toBeDefined()
      expect(resultCriteria.criteria).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('handles invalid Atlas JSON gracefully', async () => {
      const invalidAtlasJson = {
        // Missing required fields
        name: 'Invalid Cohort'
      }

      const component = wrapper.vm as any
      
      // Should handle gracefully without throwing
      await expect(component.loadAtlasCohortDefinition(invalidAtlasJson)).resolves.not.toThrow()
    })

    it('handles missing concept sets in Atlas JSON', async () => {
      const atlasWithMissingConceptSets = {
        name: 'Test Cohort',
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 999 // Non-existent concept set
              }
            }
          ]
        }
      }

      const component = wrapper.vm as any
      
      await expect(component.loadAtlasCohortDefinition(atlasWithMissingConceptSets)).resolves.not.toThrow()
    })

    it('handles conversion errors gracefully', async () => {
      const manager = new QueryFilterCriteriaManager({
        // Invalid structure
        inclusionCriteria: {
          qualifyingEventsLimit: 'INVALID_TYPE',
          criteria: null
        }
      })
      
      // Should not throw during conversion
      expect(() => manager.convertToAtlasFormat()).not.toThrow()
    })
  })

  describe('Component Integration', () => {
    it('updates UI when Atlas cohort is loaded', async () => {
      const mockAtlas = {
        name: 'Simple Cohort',
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 1
              }
            }
          ]
        }
      }

      const component = wrapper.vm as any
      await component.loadAtlasCohortDefinition(mockAtlas)

      // Verify the mock criteria component shows updated count
      await wrapper.vm.$nextTick()
      
      const mockCriteria = wrapper.find('.mock-criteria')
      expect(mockCriteria.exists()).toBe(true)
    })

    it('exposes Atlas conversion methods to parent components', () => {
      const component = wrapper.vm as any
      
      // Verify exposed methods
      expect(typeof component.convertToAtlasFormat).toBe('function')
      expect(typeof component.loadAtlasCohortDefinition).toBe('function')
    })

    it('handles concept set updates from Atlas loading', async () => {
      const atlasWithConceptSets = {
        name: 'Cohort with Concept Sets',
        ConceptSets: [
          {
            id: 1,
            name: 'Test Concept Set',
            expression: { items: [] }
          }
        ],
        PrimaryCriteria: {
          CriteriaList: [
            {
              ConditionOccurrence: {
                CodesetId: 1
              }
            }
          ]
        }
      }

      const component = wrapper.vm as any
      
      // Monitor concept set updates
      const initialConceptSets = component.selectedConceptSets.length
      
      await component.loadAtlasCohortDefinition(atlasWithConceptSets)
      
      // Should handle concept set mapping
      expect(component.criteriaManager).toBeDefined()
    })
  })

  describe('Performance Validation', () => {
    it('loads large Atlas definitions efficiently', async () => {
      const largeAtlasJson = {
        name: 'Large Cohort',
        ConceptSets: Array.from({ length: 10 }, (_, i) => ({
          id: i + 1,
          name: `Concept Set ${i + 1}`,
          expression: { items: [] }
        })),
        PrimaryCriteria: {
          CriteriaList: Array.from({ length: 20 }, (_, i) => ({
            ConditionOccurrence: {
              CodesetId: (i % 10) + 1
            }
          }))
        },
        InclusionRules: Array.from({ length: 5 }, (_, i) => ({
          name: `Rule ${i + 1}`,
          expression: {
            Type: 'ALL',
            CriteriaList: Array.from({ length: 5 }, (_, j) => ({
              ConditionOccurrence: {
                CodesetId: j + 1
              }
            }))
          }
        }))
      }

      const component = wrapper.vm as any
      
      const startTime = performance.now()
      await component.loadAtlasCohortDefinition(largeAtlasJson)
      const endTime = performance.now()
      
      // Should complete within reasonable time (< 1 second)
      expect(endTime - startTime).toBeLessThan(1000)
    })

    it('converts complex hierarchical structures efficiently', () => {
      const complexHierarchy = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'ALL',
          criteria: Array.from({ length: 10 }, (_, i) => ({
            id: `criteria_${i}`,
            title: `Criteria ${i}`,
            description: `Description ${i}`,
            criteriaType: 'ALL',
            events: Array.from({ length: 5 }, (_, j) => ({
              id: `event_${i}_${j}`,
              eventType: 'conditionOccurrence',
              attributes: j === 0 ? [
                {
                  id: `attr_${i}_${j}`,
                  attributeType: 'nested',
                  nestedCriteria: {
                    id: `nested_${i}_${j}`,
                    criteriaType: 'ANY',
                    events: Array.from({ length: 3 }, (_, k) => ({
                      id: `nested_event_${i}_${j}_${k}`,
                      eventType: 'drugExposure'
                    }))
                  }
                }
              ] : []
            }))
          }))
        }
      }

      const manager = new QueryFilterCriteriaManager(complexHierarchy)
      
      const startTime = performance.now()
      const atlasFormat = manager.convertToAtlasFormat()
      const endTime = performance.now()
      
      // Should convert quickly
      expect(endTime - startTime).toBeLessThan(100)
      expect(atlasFormat).toBeDefined()
      expect(atlasFormat.InclusionRules).toHaveLength(10)
    })
  })
})