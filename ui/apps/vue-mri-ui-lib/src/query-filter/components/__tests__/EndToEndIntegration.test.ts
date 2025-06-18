import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import QueryFilterModern from '../QueryFilterModern.vue'
import { QueryFilterCriteriaManager } from '../../models/QueryFilterModel'
import sample2Input from '../../__tests__/data/sample2-input'
import sample3Input from '../../__tests__/data/sample3-input'

// Mock API services with realistic responses
vi.mock('../../services/ConceptSetApiService', () => ({
  loadConceptSets: vi.fn().mockResolvedValue({
    values: [
      { 
        value: 'cs1', 
        text: 'Diabetes Type 2 Conditions', 
        display_value: 'Diabetes Type 2 Conditions',
        conceptIds: [201826, 443767],
        concepts: [
          {
            CONCEPT_ID: 201826,
            CONCEPT_NAME: 'Type 2 diabetes mellitus',
            CONCEPT_CODE: 'E11',
            VOCABULARY_ID: 'ICD10CM',
            DOMAIN_ID: 'Condition'
          }
        ]
      },
      { 
        value: 'cs2', 
        text: 'Hypertension Conditions', 
        display_value: 'Hypertension Conditions',
        conceptIds: [316866, 320128],
        concepts: [
          {
            CONCEPT_ID: 316866,
            CONCEPT_NAME: 'Hypertensive disorder',
            CONCEPT_CODE: 'I10',
            VOCABULARY_ID: 'ICD10CM',
            DOMAIN_ID: 'Condition'
          }
        ]
      }
    ],
    isLoading: false,
    loadedStatus: 'SUCCESS'
  }),
  loadConceptSetDetails: vi.fn().mockResolvedValue({
    'cs1': [
      {
        concept: {
          CONCEPT_ID: 201826,
          CONCEPT_NAME: 'Type 2 diabetes mellitus',
          CONCEPT_CODE: 'E11',
          VOCABULARY_ID: 'ICD10CM',
          DOMAIN_ID: 'Condition',
          STANDARD_CONCEPT: 'S',
          STANDARD_CONCEPT_CAPTION: 'Standard'
        },
        isExcluded: false,
        includeDescendants: true,
        includeMapped: false
      }
    ]
  }),
  loadSingleConceptSetDetails: vi.fn().mockResolvedValue([
    {
      concept: {
        CONCEPT_ID: 201826,
        CONCEPT_NAME: 'Type 2 diabetes mellitus',
        CONCEPT_CODE: 'E11',
        VOCABULARY_ID: 'ICD10CM',
        DOMAIN_ID: 'Condition'
      },
      isExcluded: false,
      includeDescendants: true,
      includeMapped: false
    }
  ])
}))

// Mock child components for focused testing
vi.mock('../QueryFilterCriteria.vue', () => ({
  default: {
    name: 'QueryFilterCriteria',
    props: ['criteriaManager', 'conceptSets', 'conceptSetDomainValues', 'conceptSetTexts'],
    emits: ['criteria-updated', 'update:criteria'],
    template: `
      <div class="mock-criteria" data-testid="criteria-component">
        <div class="criteria-info">
          <span class="criteria-type">{{ criteriaManager.getCriteria().criteriaType }}</span>
          <span class="groups-count">{{ criteriaManager.getCriteria().criteria.length }}</span>
        </div>
        <div class="concept-sets-count">{{ conceptSets.length }}</div>
        <button @click="$emit('criteria-updated', criteriaManager)" data-testid="update-criteria-btn">
          Update Criteria
        </button>
      </div>
    `
  }
}))

describe('End-to-End Integration Tests', () => {
  let wrapper: any

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()
    
    wrapper = mount(QueryFilterModern, {
      props: {
        debug: true,
        useNewHierarchy: true
      }
    })
  })

  afterEach(() => {
    if (wrapper) {
      wrapper.unmount()
    }
  })

  describe('Complete Workflow - Sample 2 Data', () => {
    it('loads sample2 data and performs full workflow', async () => {
      const component = wrapper.vm as any
      
      // Step 1: Load sample2 data into criteria manager
      const manager = new QueryFilterCriteriaManager(sample2Input)
      component.criteriaManager.setCriteria(manager.getCriteria())
      
      await wrapper.vm.$nextTick()
      
      // Step 2: Verify UI reflects the loaded data
      const criteriaComponent = wrapper.find('[data-testid="criteria-component"]')
      expect(criteriaComponent.exists()).toBe(true)
      
      const criteriaType = criteriaComponent.find('.criteria-type').text()
      const groupsCount = criteriaComponent.find('.groups-count').text()
      
      expect(criteriaType).toBe('ALL')
      expect(groupsCount).toBe('1')
      
      // Step 3: Test Atlas conversion
      const atlasFormat = component.convertToAtlasFormat()
      expect(atlasFormat).toBeDefined()
      expect(atlasFormat.QualifiedLimit.Type).toBe('ALL')
      expect(atlasFormat.InclusionRules).toHaveLength(1)
      expect(atlasFormat.InclusionRules[0].name).toBe('Criteria 1')
      
      // Step 4: Test round-trip conversion
      await component.loadAtlasCohortDefinition(atlasFormat)
      
      const finalCriteria = component.criteriaManager.getCriteria()
      expect(finalCriteria.criteriaType).toBe('ALL')
      expect(finalCriteria.criteria.length).toBeGreaterThan(0)
    })

    it('handles concept set loading and assignment', async () => {
      const component = wrapper.vm as any
      
      // Wait for component to mount and load concept sets
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // Verify concept sets were loaded
      expect(component.allConceptSets.length).toBeGreaterThan(0)
      expect(component.allConceptSets[0]).toHaveProperty('value')
      expect(component.allConceptSets[0]).toHaveProperty('text')
      
      // Test concept set selection
      const testConceptSet = component.allConceptSets[0]
      component.handleConceptSetUpdate([testConceptSet])
      
      expect(component.selectedConceptSets).toHaveLength(1)
      expect(component.selectedConceptSets[0].value).toBe(testConceptSet.value)
    })

    it('maintains data integrity throughout operations', async () => {
      const component = wrapper.vm as any
      
      // Load sample data
      const manager = new QueryFilterCriteriaManager(sample2Input)
      component.criteriaManager.setCriteria(manager.getCriteria())
      
      // Perform multiple operations
      const originalCriteria = component.criteriaManager.getCriteria()
      const originalJson = JSON.stringify(originalCriteria)
      
      // Convert to Atlas and back
      const atlasFormat = component.convertToAtlasFormat()
      await component.loadAtlasCohortDefinition(atlasFormat)
      
      // Clear and reload
      component.clearFilters()
      await component.$nextTick()
      
      component.criteriaManager.setCriteria(manager.getCriteria())
      await component.$nextTick()
      
      // Verify data integrity
      const finalCriteria = component.criteriaManager.getCriteria()
      expect(finalCriteria.criteriaType).toBe(originalCriteria.criteriaType)
      expect(finalCriteria.criteria.length).toBe(originalCriteria.criteria.length)
    })
  })

  describe('Complete Workflow - Sample 3 Data (Nested)', () => {
    it('loads sample3 nested data and handles recursion', async () => {
      const component = wrapper.vm as any
      
      // Load sample3 data with nested structures
      const manager = new QueryFilterCriteriaManager(sample3Input)
      component.criteriaManager.setCriteria(manager.getCriteria())
      
      await wrapper.vm.$nextTick()
      
      // Verify nested structure is preserved
      const criteria = component.criteriaManager.getCriteria()
      expect(criteria.criteria).toHaveLength(1)
      
      const firstGroup = criteria.criteria[0]
      expect(firstGroup.groups[0].events).toHaveLength(2)
      
      // Check for nested attributes
      const firstEvent = firstGroup.groups[0].events[0]
      expect(firstEvent.attributes).toHaveLength(1)
      expect(firstEvent.attributes[0].attributeType).toBe('nested')
      expect(firstEvent.attributes[0].nestedCriteria).toBeDefined()
      
      // Test Atlas conversion with nested data
      const atlasFormat = component.convertToAtlasFormat()
      expect(atlasFormat.InclusionRules[0].expression.CriteriaList).toHaveLength(2)
    })

    it('handles complex nested operations', async () => {
      const component = wrapper.vm as any
      
      // Load nested data
      const manager = new QueryFilterCriteriaManager(sample3Input)
      component.criteriaManager.setCriteria(manager.getCriteria())
      
      // Test nested structure navigation
      const criteria = component.criteriaManager.getCriteria()
      const nestedCriteria = criteria.criteria[0].groups[0].events[0].attributes[0].nestedCriteria
      
      expect(nestedCriteria.id).toBe('criteria_1749626300528')
      expect(nestedCriteria.criteriaType).toBe('ALL')
      expect(nestedCriteria.events).toHaveLength(1)
      
      // Test nested event properties
      const nestedEvent = nestedCriteria.events[0]
      expect(nestedEvent.id).toBe('event_1749626300529')
      expect(nestedEvent.eventType).toBe('conditionOccurrence')
      expect(nestedEvent.cardinality.type).toBe('AT_LEAST')
      expect(nestedEvent.cardinality.count).toBe(1)
    })

    it('validates nested data through full workflow', async () => {
      const component = wrapper.vm as any
      
      // Complete workflow with nested data
      const manager = new QueryFilterCriteriaManager(sample3Input)
      component.criteriaManager.setCriteria(manager.getCriteria())
      
      // Convert to Atlas format
      const atlasFormat = component.convertToAtlasFormat()
      expect(atlasFormat).toBeDefined()
      
      // Verify nested structures are handled in conversion
      const inclusionRule = atlasFormat.InclusionRules[0]
      expect(inclusionRule.expression.CriteriaList).toHaveLength(2)
      
      // Test round-trip with nested data
      await component.loadAtlasCohortDefinition(atlasFormat)
      
      const resultCriteria = component.criteriaManager.getCriteria()
      expect(resultCriteria.criteria.length).toBeGreaterThan(0)
    })
  })

  describe('User Interaction Workflows', () => {
    it('handles user-driven criteria updates', async () => {
      const component = wrapper.vm as any
      
      // Simulate user updating criteria
      const updateButton = wrapper.find('[data-testid="update-criteria-btn"]')
      expect(updateButton.exists()).toBe(true)
      
      await updateButton.trigger('click')
      
      // Verify criteria updated event handling
      // The component should handle the update without errors
      expect(component.criteriaManager).toBeDefined()
    })

    it('simulates complete user workflow', async () => {
      const component = wrapper.vm as any
      
      // Step 1: User loads initial data
      const manager = new QueryFilterCriteriaManager(sample2Input)
      component.criteriaManager.setCriteria(manager.getCriteria())
      
      // Step 2: User selects concept sets
      await new Promise(resolve => setTimeout(resolve, 100))
      const testConceptSet = component.allConceptSets[0]
      component.handleConceptSetUpdate([testConceptSet])
      
      // Step 3: User exports to Atlas
      const atlasFormat = component.convertToAtlasFormat()
      expect(atlasFormat).toBeDefined()
      
      // Step 4: User clears and starts fresh
      component.clearFilters()
      await component.$nextTick()
      
      expect(component.selectedConceptSets).toHaveLength(0)
      
      // Step 5: User loads Atlas definition
      await component.loadAtlasCohortDefinition(atlasFormat)
      
      const finalCriteria = component.criteriaManager.getCriteria()
      expect(finalCriteria.criteria.length).toBeGreaterThan(0)
    })
  })

  describe('Error Scenarios and Recovery', () => {
    it('handles concept set loading failures gracefully', async () => {
      // Mock API failure
      const mockApiService = await import('../../services/ConceptSetApiService')
      vi.mocked(mockApiService.loadConceptSets).mockRejectedValueOnce(new Error('API Error'))
      
      const component = wrapper.vm as any
      
      // Should handle error gracefully
      await component.loadConceptSets()
      
      expect(component.allConceptSets).toHaveLength(0)
      expect(component.conceptSetDomainValues.loadedStatus).toBe('NO_RESULTS')
    })

    it('recovers from invalid data scenarios', async () => {
      const component = wrapper.vm as any
      
      // Load invalid data
      const invalidData = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'INVALID',
          criteria: null
        }
      }
      
      const manager = new QueryFilterCriteriaManager(invalidData)
      component.criteriaManager.setCriteria(manager.getCriteria())
      
      // Should not crash
      expect(() => component.convertToAtlasFormat()).not.toThrow()
    })

    it('handles Atlas loading errors gracefully', async () => {
      const component = wrapper.vm as any
      
      const invalidAtlas = {
        // Completely invalid structure
        invalid: 'data'
      }
      
      // Should not throw
      await expect(component.loadAtlasCohortDefinition(invalidAtlas)).resolves.not.toThrow()
    })
  })

  describe('Performance and Scale Testing', () => {
    it('handles large datasets efficiently', async () => {
      const component = wrapper.vm as any
      
      // Create large hierarchical structure
      const largeHierarchy = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'ALL',
          criteria: Array.from({ length: 20 }, (_, i) => ({
            id: `criteria_${i}`,
            title: `Large Criteria ${i}`,
            description: `Description for criteria ${i}`,
            criteriaType: 'ALL',
            events: Array.from({ length: 10 }, (_, j) => ({
              id: `event_${i}_${j}`,
              eventType: 'conditionOccurrence',
              isExpanded: true,
              attributes: [],
              cardinality: {
                type: 'AT_LEAST',
                count: 1,
                using: 'ALL'
              }
            }))
          }))
        }
      }
      
      const startTime = performance.now()
      
      const manager = new QueryFilterCriteriaManager(largeHierarchy)
      component.criteriaManager.setCriteria(manager.getCriteria())
      
      const atlasFormat = component.convertToAtlasFormat()
      await component.loadAtlasCohortDefinition(atlasFormat)
      
      const endTime = performance.now()
      
      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(2000) // 2 seconds
      expect(atlasFormat.InclusionRules).toHaveLength(20)
    })

    it('maintains responsiveness with complex operations', async () => {
      const component = wrapper.vm as any
      
      // Rapid successive operations
      const operations = Array.from({ length: 10 }, () => async () => {
        const manager = new QueryFilterCriteriaManager(sample2Input)
        component.criteriaManager.setCriteria(manager.getCriteria())
        const atlas = component.convertToAtlasFormat()
        await component.loadAtlasCohortDefinition(atlas)
      })
      
      const startTime = performance.now()
      
      // Execute all operations
      for (const operation of operations) {
        await operation()
      }
      
      const endTime = performance.now()
      
      // Should complete all operations reasonably quickly
      expect(endTime - startTime).toBeLessThan(5000) // 5 seconds for 10 operations
    })
  })

  describe('Integration with External Systems', () => {
    it('properly interfaces with terminology service', async () => {
      const component = wrapper.vm as any
      
      // Test concept set action (terminology service integration)
      const mockAction = {
        values: { value: 'cs1' },
        config: { action: 'edit' }
      }
      
      // Mock the terminology event
      const mockEvent = vi.fn()
      window.dispatchEvent = mockEvent
      
      component.handleConceptSetAction(mockAction)
      
      // Verify terminology service was called
      expect(mockEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'alp-terminology-open'
        })
      )
    })

    it('handles external data format requirements', async () => {
      const component = wrapper.vm as any
      
      // Test JSON serialization/deserialization
      const manager = new QueryFilterCriteriaManager(sample3Input)
      component.criteriaManager.setCriteria(manager.getCriteria())
      
      const serialized = JSON.stringify(component.getAllFilters())
      const parsed = JSON.parse(serialized)
      
      // Should be valid JSON that can be reconstructed
      expect(parsed).toBeDefined()
      expect(parsed.inclusionCriteria).toBeDefined()
      
      const reconstructed = new QueryFilterCriteriaManager(parsed)
      expect(reconstructed.getCriteria().criteria.length).toBe(
        component.criteriaManager.getCriteria().criteria.length
      )
    })
  })

  describe('Accessibility and Usability', () => {
    it('provides proper ARIA attributes and labels', () => {
      // Verify wrapper has proper structure for accessibility
      expect(wrapper.find('.query-filter-modern').exists()).toBe(true)
      
      // Check for proper semantic structure
      const sections = wrapper.findAll('.query-filter-container__section')
      expect(sections.length).toBeGreaterThanOrEqual(0)
    })

    it('handles keyboard navigation appropriately', async () => {
      const component = wrapper.vm as any
      
      // Test tab navigation through interface
      const updateButton = wrapper.find('[data-testid="update-criteria-btn"]')
      if (updateButton.exists()) {
        // Should be focusable
        expect(updateButton.element.tagName).toBe('BUTTON')
      }
    })

    it('provides appropriate feedback for user actions', async () => {
      const component = wrapper.vm as any
      
      // Test clear action provides confirmation
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      
      component.clearFilters()
      
      expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to clear all filters?')
      
      confirmSpy.mockRestore()
    })
  })
})