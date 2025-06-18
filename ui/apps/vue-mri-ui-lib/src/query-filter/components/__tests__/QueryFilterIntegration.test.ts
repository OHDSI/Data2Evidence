import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import QueryFilterCriteria from '../QueryFilterCriteria.vue'
import { QueryFilterCriteriaManager } from '../../models/QueryFilterModel'
import sample2Input from '../../__tests__/data/sample2-input'
import sample3Input from '../../__tests__/data/sample3-input'

// Mock child components to focus on integration logic
vi.mock('../QueryFilterCriteriaGroup.vue', () => ({
  default: {
    name: 'QueryFilterCriteriaGroup',
    props: ['group', 'groupIndex', 'conceptSets', 'conceptSetDomainValues', 'conceptSetTexts', 'readonly'],
    emits: ['update-group', 'remove-group'],
    template: `
      <div class="mock-criteria-group" :data-group-id="group.id">
        <div class="group-title">{{ group.title }}</div>
        <div class="group-type">{{ group.groupType }}</div>
        <div class="events-count">{{ group.groups?.[0]?.events?.length || 0 }} events</div>
        <button @click="$emit('update-group', { ...group, title: 'Updated' })">Update</button>
        <button @click="$emit('remove-group')">Remove</button>
      </div>
    `
  }
}))

describe('QueryFilter Integration Tests', () => {
  describe('Sample 2 Data Integration (Basic Hierarchy)', () => {
    let criteriaManager: QueryFilterCriteriaManager
    
    beforeEach(() => {
      criteriaManager = new QueryFilterCriteriaManager(sample2Input)
    })

    it('correctly loads sample2 data structure', () => {
      const wrapper = mount(QueryFilterCriteria, {
        props: {
          criteriaManager,
          conceptSets: [],
          readonly: false
        }
      })

      expect(wrapper.exists()).toBe(true)
      
      // Should show qualifying events limit as 'ALL'
      const activeButton = wrapper.find('.qualifying-events-btn--active')
      expect(activeButton.text()).toBe('ALL')
      
      // Should have one criteria group
      const groups = wrapper.findAll('.mock-criteria-group')
      expect(groups).toHaveLength(1)
      
      // Check group details
      const firstGroup = groups[0]
      expect(firstGroup.find('.group-title').text()).toBe('Criteria 1')
      expect(firstGroup.find('.group-type').text()).toBe('ALL')
      expect(firstGroup.find('.events-count').text()).toBe('2 events')
    })

    it('handles qualifying events limit changes with sample2 data', async () => {
      const wrapper = mount(QueryFilterCriteria, {
        props: {
          criteriaManager,
          conceptSets: [],
          readonly: false
        }
      })

      const earliestButton = wrapper.findAll('.qualifying-events-btn')[1]
      await earliestButton.trigger('click')

      expect(wrapper.emitted('criteria-updated')).toBeTruthy()
      expect(criteriaManager.getCriteria().criteriaType).toBe('EARLIEST')
    })

    it('handles adding new groups to sample2 data', async () => {
      const wrapper = mount(QueryFilterCriteria, {
        props: {
          criteriaManager,
          conceptSets: [],
          readonly: false
        }
      })

      const initialGroupCount = criteriaManager.getCriteria().criteria.length
      expect(initialGroupCount).toBe(1)

      const addButton = wrapper.find('.btn-add-group')
      await addButton.trigger('click')

      expect(criteriaManager.getCriteria().criteria.length).toBe(2)
      expect(wrapper.emitted('criteria-updated')).toBeTruthy()
    })

    it('handles group updates with sample2 data', async () => {
      const wrapper = mount(QueryFilterCriteria, {
        props: {
          criteriaManager,
          conceptSets: [],
          readonly: false
        }
      })

      const updateButton = wrapper.find('.mock-criteria-group button')
      await updateButton.trigger('click')

      expect(wrapper.emitted('criteria-updated')).toBeTruthy()
    })
  })

  describe('Sample 3 Data Integration (Nested Structures)', () => {
    let criteriaManager: QueryFilterCriteriaManager
    
    beforeEach(() => {
      criteriaManager = new QueryFilterCriteriaManager(sample3Input)
    })

    it('correctly loads sample3 data structure with nested attributes', () => {
      const wrapper = mount(QueryFilterCriteria, {
        props: {
          criteriaManager,
          conceptSets: [],
          readonly: false
        }
      })

      expect(wrapper.exists()).toBe(true)
      
      // Should have one criteria group
      const groups = wrapper.findAll('.mock-criteria-group')
      expect(groups).toHaveLength(1)
      
      // Check that the group has 2 events (one with nested attributes)
      const firstGroup = groups[0]
      expect(firstGroup.find('.events-count').text()).toBe('2 events')
    })

    it('preserves nested criteria structure', () => {
      const criteria = criteriaManager.getCriteria()
      
      // Check the original structure is preserved
      expect(criteria.criteria).toHaveLength(1)
      expect(criteria.criteria[0].groups[0].events).toHaveLength(2)
      
      // Check that first event has nested attributes
      const firstEvent = criteria.criteria[0].groups[0].events[0]
      expect(firstEvent.attributes).toBeDefined()
      expect(firstEvent.attributes).toHaveLength(1)
      expect(firstEvent.attributes[0].attributeType).toBe('nested')
      expect(firstEvent.attributes[0].nestedCriteria).toBeDefined()
    })

    it('handles complex nested structure navigation', () => {
      const criteria = criteriaManager.getCriteria()
      const nestedCriteria = criteria.criteria[0].groups[0].events[0].attributes[0].nestedCriteria
      
      // Verify nested criteria structure
      expect(nestedCriteria.id).toBe('criteria_1749626300528')
      expect(nestedCriteria.criteriaType).toBe('ALL')
      expect(nestedCriteria.events).toHaveLength(1)
      
      // Verify nested event
      const nestedEvent = nestedCriteria.events[0]
      expect(nestedEvent.id).toBe('event_1749626300529')
      expect(nestedEvent.eventType).toBe('conditionOccurrence')
      expect(nestedEvent.cardinality.type).toBe('AT_LEAST')
      expect(nestedEvent.cardinality.count).toBe(1)
    })
  })

  describe('Data Model Validation', () => {
    it('validates sample2 data structure integrity', () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)
      const criteria = manager.getCriteria()
      
      // Root level validation
      expect(criteria.id).toBeDefined()
      expect(criteria.criteriaType).toBe('ALL')
      expect(criteria.criteria).toBeInstanceOf(Array)
      expect(criteria.criteria).toHaveLength(1)
      
      // Group level validation
      const group = criteria.criteria[0]
      expect(group.id).toBe('criteria_1749626300526')
      expect(group.title).toBe('Criteria 1')
      expect(group.description).toBe('Description 1')
      expect(group.groupType).toBe('ALL')
      expect(group.groups).toHaveLength(1)
      
      // Events validation
      const events = group.groups[0].events
      expect(events).toHaveLength(2)
      events.forEach(event => {
        expect(event.id).toBeDefined()
        expect(event.eventType).toBe('conditionOccurrence')
        expect(event.cardinality).toBeDefined()
        expect(event.cardinality.type).toBe('AT_LEAST')
        expect(event.cardinality.count).toBe(1)
      })
    })

    it('validates sample3 nested data structure integrity', () => {
      const manager = new QueryFilterCriteriaManager(sample3Input)
      const criteria = manager.getCriteria()
      
      // Find the event with nested attributes
      const eventWithNested = criteria.criteria[0].groups[0].events[0]
      expect(eventWithNested.attributes).toHaveLength(1)
      
      const nestedAttribute = eventWithNested.attributes[0]
      expect(nestedAttribute.id).toBe('attribute_1749626300526')
      expect(nestedAttribute.attributeType).toBe('nested')
      expect(nestedAttribute.nestedCriteria).toBeDefined()
      
      // Validate nested criteria
      const nestedCriteria = nestedAttribute.nestedCriteria
      expect(nestedCriteria.id).toBe('criteria_1749626300528')
      expect(nestedCriteria.criteriaType).toBe('ALL')
      expect(nestedCriteria.events).toHaveLength(1)
      
      // Validate nested event
      const nestedEvent = nestedCriteria.events[0]
      expect(nestedEvent.id).toBe('event_1749626300529')
      expect(nestedEvent.eventType).toBe('conditionOccurrence')
      expect(nestedEvent.attributes).toHaveLength(0)
    })

    it('validates round-trip data conversion', () => {
      // Test sample2
      const manager2 = new QueryFilterCriteriaManager(sample2Input)
      const exported2 = manager2.toJSON()
      const manager2Copy = QueryFilterCriteriaManager.fromJSON(exported2)
      
      expect(manager2Copy.getCriteria()).toEqual(manager2.getCriteria())
      
      // Test sample3
      const manager3 = new QueryFilterCriteriaManager(sample3Input)
      const exported3 = manager3.toJSON()
      const manager3Copy = QueryFilterCriteriaManager.fromJSON(exported3)
      
      expect(manager3Copy.getCriteria()).toEqual(manager3.getCriteria())
    })
  })

  describe('Component Props Integration', () => {
    it('passes concept sets correctly through component hierarchy', () => {
      const conceptSets = [
        { value: 'cs1', text: 'Condition Set 1' },
        { value: 'cs2', text: 'Condition Set 2' }
      ]
      
      const manager = new QueryFilterCriteriaManager(sample2Input)
      const wrapper = mount(QueryFilterCriteria, {
        props: {
          criteriaManager: manager,
          conceptSets,
          readonly: false
        }
      })

      const criteriaGroup = wrapper.findComponent({ name: 'QueryFilterCriteriaGroup' })
      expect(criteriaGroup.props('conceptSets')).toEqual(conceptSets)
    })

    it('handles readonly mode correctly', () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)
      const wrapper = mount(QueryFilterCriteria, {
        props: {
          criteriaManager: manager,
          conceptSets: [],
          readonly: true
        }
      })

      const buttons = wrapper.findAll('.qualifying-events-btn')
      buttons.forEach(button => {
        expect(button.attributes('disabled')).toBeDefined()
      })

      expect(wrapper.find('.btn-add-group').exists()).toBe(false)
    })

    it('emits events correctly during user interactions', async () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)
      const wrapper = mount(QueryFilterCriteria, {
        props: {
          criteriaManager: manager,
          conceptSets: [],
          readonly: false
        }
      })

      // Test qualifying events limit change
      const latestButton = wrapper.findAll('.qualifying-events-btn')[2]
      await latestButton.trigger('click')

      expect(wrapper.emitted('criteria-updated')).toBeTruthy()
      expect(wrapper.emitted('criteria-updated')[0][0]).toBeInstanceOf(QueryFilterCriteriaManager)
    })
  })

  describe('Error Handling', () => {
    it('handles invalid data gracefully', () => {
      const invalidData = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'INVALID',
          criteria: null
        }
      }

      expect(() => {
        new QueryFilterCriteriaManager(invalidData)
      }).not.toThrow()
    })

    it('handles missing nested criteria gracefully', () => {
      const incompleteData = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'ALL',
          criteria: [
            {
              id: 'test',
              title: 'Test',
              description: '',
              criteriaType: 'ALL',
              events: [
                {
                  id: 'event1',
                  eventType: 'conditionOccurrence',
                  attributes: [
                    {
                      id: 'attr1',
                      attributeType: 'nested',
                      // Missing nestedCriteria
                    }
                  ]
                }
              ]
            }
          ]
        }
      }

      expect(() => {
        new QueryFilterCriteriaManager(incompleteData)
      }).not.toThrow()
    })
  })
})