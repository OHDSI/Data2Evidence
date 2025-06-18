import {
  QueryFilterCardModel,
  QueryFilterManager,
  QueryFilterCriteriaManager,
  QueryFilterEvent,
} from '../models/QueryFilterModel'
import sample1Input from './data/sample1-input'
import sample1Expected from './data/sample1-expected'
import sample2Input from './data/sample2-input'
import sample2Expected from './data/sample2-expected'
import sample3Input from './data/sample3-input'
import sample3Expected from './data/sample3-expected'
import sample4Input from './data/sample4-input'
import sample4Expected from './data/sample4-expected'
import sample5Input from './data/sample5-input'
import sample5Expected from './data/sample5-expected'
import sample6Input from './data/sample6-input'
import sample6Expected from './data/sample6-expected'

describe('QueryFilterCardModel', () => {
  describe('constructor', () => {
    it('should create with default values', () => {
      const model = new QueryFilterCardModel()

      expect(model.id).toBeDefined()
      expect(model.title).toBe('')
      expect(model.type).toBe('inclusion')
      expect(model.isExpanded).toBe(true)
      expect(model.events).toEqual([])
      expect(model.cardinality).toEqual({
        type: 'AT_LEAST',
        count: 1,
        using: 'ALL',
      })
    })

    it('should create with provided values', () => {
      const data = {
        id: 'test-id',
        title: 'Test Filter',
        type: 'exclusion' as const,
        isExpanded: false,
        events: [],
        cardinality: {
          type: 'exactly' as const,
          count: 2,
          using: 'ALL' as const,
        },
      }

      const model = new QueryFilterCardModel(data)

      expect(model.id).toBe('test-id')
      expect(model.title).toBe('Test Filter')
      expect(model.type).toBe('exclusion')
      expect(model.isExpanded).toBe(false)
      expect(model.cardinality).toEqual(data.cardinality)
    })

    it('should generate unique IDs', () => {
      const model1 = new QueryFilterCardModel()
      const model2 = new QueryFilterCardModel()

      expect(model1.id).not.toBe(model2.id)
    })
  })

  describe('event management', () => {
    let model: QueryFilterCardModel

    beforeEach(() => {
      model = new QueryFilterCardModel({ title: 'Test Filter' })
    })

    it('should add event with default values', () => {
      const event = model.addEvent()

      expect(model.events).toHaveLength(1)
      expect(event.id).toBeDefined()
      expect(event.conceptSet).toBe('')
      expect(event.conceptSetDetails).toEqual([])
      expect(event.isEditing).toBe(false)
      expect(event.criteriaType).toBeUndefined()
    })

    it('should add event with custom values', () => {
      const eventData = {
        conceptSet: 'Test Concept Set',
        criteriaType: 'conditionOccurrence',
        conceptSetDetails: [{ id: 1, name: 'Test' }],
      }

      const event = model.addEvent(eventData)

      expect(event.conceptSet).toBe('Test Concept Set')
      expect(event.criteriaType).toBe('conditionOccurrence')
      expect(event.conceptSetDetails).toEqual([{ id: 1, name: 'Test' }])
    })

    it('should remove event by ID', () => {
      const event = model.addEvent()
      expect(model.events).toHaveLength(1)

      const removed = model.removeEvent(event.id)

      expect(removed).toBe(true)
      expect(model.events).toHaveLength(0)
    })

    it('should return false when removing non-existent event', () => {
      const removed = model.removeEvent('non-existent')

      expect(removed).toBe(false)
    })

    it('should update event', () => {
      const event = model.addEvent()
      const updates = {
        conceptSet: 'Updated Concept Set',
        criteriaType: 'drugExposure',
      }

      const updated = model.updateEvent(event.id, updates)

      expect(updated).toBe(true)
      expect(event.conceptSet).toBe('Updated Concept Set')
      expect(event.criteriaType).toBe('drugExposure')
    })

    it('should return false when updating non-existent event', () => {
      const updated = model.updateEvent('non-existent', { conceptSet: 'Test' })

      expect(updated).toBe(false)
    })

    it('should get event by ID', () => {
      const addedEvent = model.addEvent({ conceptSet: 'Test' })
      const foundEvent = model.getEvent(addedEvent.id)

      expect(foundEvent).toBe(addedEvent)
      expect(foundEvent?.conceptSet).toBe('Test')
    })
  })

  describe('concept set management', () => {
    let model: QueryFilterCardModel

    beforeEach(() => {
      model = new QueryFilterCardModel({ title: 'Test Filter' })
    })

    it('should handle concept set details', () => {
      const event = model.addEvent()
      const conceptSetDetails = [
        { CONCEPT_ID: 1, CONCEPT_NAME: 'Diabetes', DOMAIN_ID: 'Condition' },
        { CONCEPT_ID: 2, CONCEPT_NAME: 'Hypertension', DOMAIN_ID: 'Condition' },
      ]

      model.updateEvent(event.id, { conceptSetDetails })

      expect(event.conceptSetDetails).toHaveLength(2)
      expect(event.conceptSetDetails).toEqual(conceptSetDetails)
    })

    it('should handle concept set loading state', () => {
      const event = model.addEvent()

      model.updateEvent(event.id, { conceptSetLoading: true })
      expect(event.conceptSetLoading).toBe(true)

      model.updateEvent(event.id, { conceptSetLoading: false })
      expect(event.conceptSetLoading).toBe(false)
    })

    it('should handle selected concept set', () => {
      const event = model.addEvent()
      const selectedConceptSet = {
        value: '1',
        text: 'Test Concept Set',
        display_value: 'Test Concept Set',
      }

      model.updateEvent(event.id, { selectedConceptSet })

      expect(event.selectedConceptSet).toEqual(selectedConceptSet)
    })
  })

  describe('utility methods', () => {
    let model: QueryFilterCardModel

    beforeEach(() => {
      model = new QueryFilterCardModel({ title: 'Test Filter' })
    })

    it('should toggle expansion state', () => {
      expect(model.isExpanded).toBe(true)

      model.toggle()
      expect(model.isExpanded).toBe(false)

      model.toggle()
      expect(model.isExpanded).toBe(true)
    })

    it('should check if has events', () => {
      expect(model.hasEvents()).toBe(false)

      model.addEvent()
      expect(model.hasEvents()).toBe(true)
    })
  })

  describe('nested events', () => {
    describe('adding nested events', () => {
      it('should add a nested event via addAttributeEvent with nested type', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        expect(nestedEvent.isNested).toBe(true)
        expect(nestedEvent.nestedEvents).toEqual([])
        expect(nestedEvent.nestedOperator).toBe('AND')
        expect(nestedEvent.parentEventId).toBe(parentEvent.id)
      })

      it('should insert nested event after parent and its existing attribute children', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        // Add an attribute event first
        const attributeEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'age',
            name: 'Age',
            description: 'Age criteria',
            type: 'age',
            category: 'criteria-specific',
          },
        })

        // Add a nested event
        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        // Should be: parent, attribute, nested
        expect(model.events[0]).toBe(parentEvent)
        expect(model.events[1]).toBe(attributeEvent)
        expect(model.events[2]).toBe(nestedEvent)
      })

      it('should add events to nested containers', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        const childEvent = model.addNestedEvent(nestedEvent.id, {
          conceptSet: 'Child Event',
          criteriaType: 'conditionOccurrence',
        })

        expect(nestedEvent.nestedEvents).toHaveLength(1)
        expect(nestedEvent.nestedEvents![0]).toBe(childEvent)
        expect(childEvent.parentEventId).toBe(nestedEvent.id)
      })

      it('should throw error when adding to non-existent nested event', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })

        expect(() => {
          model.addNestedEvent('non-existent', { conceptSet: 'Child Event' })
        }).toThrow('Nested event non-existent not found')
      })
    })

    describe('multi-level nesting', () => {
      it('should support multiple levels of nesting', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        // Level 1 nested event
        const level1NestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested1',
            name: 'Level 1 Nested',
            description: 'Level 1 nested group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        // Add child to level 1
        const level1Child = model.addNestedEvent(level1NestedEvent.id, {
          conceptSet: 'Level 1 Child',
        })

        // Level 2 nested event (nested within level 1 child)
        level1Child.isNested = true
        level1Child.nestedEvents = []

        const level2Child = model.addNestedEvent(level1Child.id, {
          conceptSet: 'Level 2 Child',
        })

        expect(level1NestedEvent.nestedEvents).toHaveLength(1)
        expect(level1Child.nestedEvents).toHaveLength(1)
        expect(level2Child.parentEventId).toBe(level1Child.id)
      })

      it('should find events at any nesting level', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        const childEvent = model.addNestedEvent(nestedEvent.id, {
          conceptSet: 'Child Event',
        })

        // Should be able to find the deeply nested child
        const foundChild = model.getEvent(childEvent.id)
        expect(foundChild).toBe(childEvent)
      })

      it('should add attribute events to deeply nested structures', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        const childEvent = model.addNestedEvent(nestedEvent.id, {
          conceptSet: 'Child Event',
        })

        // Add attribute to the nested child
        const attributeEvent = model.addAttributeEvent(childEvent.id, {
          attributeConfig: {
            id: 'age',
            name: 'Age',
            description: 'Age criteria',
            type: 'age',
            category: 'criteria-specific',
          },
        })

        expect(attributeEvent.parentEventId).toBe(childEvent.id)
        expect(attributeEvent.isAttributeBased).toBe(true)
      })
    })

    describe('nested event management', () => {
      it('should remove events from nested containers', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        const childEvent = model.addNestedEvent(nestedEvent.id, {
          conceptSet: 'Child Event',
        })

        expect(nestedEvent.nestedEvents).toHaveLength(1)

        const removed = model.removeNestedEvent(nestedEvent.id, childEvent.id)

        expect(removed).toBe(true)
        expect(nestedEvent.nestedEvents).toHaveLength(0)
      })

      it('should return false when removing from non-existent nested event', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })

        const removed = model.removeNestedEvent('non-existent', 'child-id')

        expect(removed).toBe(false)
      })

      it('should update nested operator', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        expect(nestedEvent.nestedOperator).toBe('AND')

        const updated = model.updateNestedOperator(nestedEvent.id, 'OR')

        expect(updated).toBe(true)
        expect(nestedEvent.nestedOperator).toBe('OR')
      })

      it('should manage concept sets in nested events', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        const childEvent = model.addNestedEvent(nestedEvent.id, {
          conceptSet: 'Child Event',
          conceptSetDetails: [{ CONCEPT_ID: 1, CONCEPT_NAME: 'Test Concept', DOMAIN_ID: 'Condition' }],
        })

        expect(childEvent.conceptSetDetails).toHaveLength(1)
        expect(childEvent.conceptSetDetails![0].CONCEPT_NAME).toBe('Test Concept')
      })
    })

    describe('event group operations', () => {
      it('should get event group including parent and attributes', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const attributeEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'age',
            name: 'Age',
            description: 'Age criteria',
            type: 'age',
            category: 'criteria-specific',
          },
        })

        const eventGroup = model.getEventGroup(parentEvent.id)

        expect(eventGroup).toHaveLength(2)
        expect(eventGroup[0]).toBe(parentEvent)
        expect(eventGroup[1]).toBe(attributeEvent)
      })

      it('should check if event can be deleted', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const attributeEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'age',
            name: 'Age',
            description: 'Age criteria',
            type: 'age',
            category: 'criteria-specific',
          },
        })

        // Parent with attributes cannot be deleted
        expect(model.canDeleteEvent(parentEvent.id)).toBe(false)

        // Attribute event can be deleted
        expect(model.canDeleteEvent(attributeEvent.id)).toBe(true)
      })
    })

    describe('recursive operations', () => {
      it('should handle complex nested structures in serialization', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        const childEvent = model.addNestedEvent(nestedEvent.id, {
          conceptSet: 'Child Event',
          conceptSetDetails: [{ CONCEPT_ID: 1, CONCEPT_NAME: 'Test' }],
        })

        const json = model.toJSON()

        expect(json.events).toHaveLength(2) // parent and nested in main events
        expect(json.events[1].nestedEvents).toHaveLength(1) // child in nested
        expect(json.events[1].nestedEvents![0].conceptSetDetails).toHaveLength(1)
      })

      it('should clone nested structures properly', () => {
        const model = new QueryFilterCardModel({ title: 'Test Filter' })
        const parentEvent = model.addEvent({ conceptSet: 'Parent Event' })

        const nestedEvent = model.addAttributeEvent(parentEvent.id, {
          attributeConfig: {
            id: 'nested',
            name: 'Nested Group',
            description: 'A nested criteria group',
            type: 'nested',
            category: 'criteria-specific',
          },
        })

        const childEvent = model.addNestedEvent(nestedEvent.id, {
          conceptSet: 'Child Event',
        })

        const clone = model.clone()

        expect(clone.events).toHaveLength(2)
        expect(clone.events[1].nestedEvents).toHaveLength(1)
        expect(clone.events[1].nestedEvents![0].conceptSet).toBe('Child Event')

        // Ensure deep copy
        expect(clone.events[1]).not.toBe(nestedEvent)
        expect(clone.events[1].nestedEvents![0]).not.toBe(childEvent)
      })
    })
  })

  describe('cloning and serialization', () => {
    it('should clone model with new ID', () => {
      const model = new QueryFilterCardModel({ title: 'Original' })
      const event = model.addEvent({ conceptSet: 'Test Concept Set' })

      // Add conceptSetDetails to the event
      model.updateEvent(event.id, {
        conceptSetDetails: [{ CONCEPT_ID: 1, CONCEPT_NAME: 'Test', DOMAIN_ID: 'Condition' }],
      })

      const clone = model.clone()

      expect(clone.id).not.toBe(model.id)
      expect(clone.title).toBe('Original')
      expect(clone.events).toHaveLength(1)
      expect(clone.events[0].conceptSetDetails).toHaveLength(1)

      // Ensure deep copy - events should be different objects
      expect(clone.events[0]).not.toBe(model.events[0])
      expect(clone.events[0].id).not.toBe(model.events[0].id)
      expect(clone.events[0].conceptSetDetails![0]).toEqual(model.events[0].conceptSetDetails![0])
    })

    it('should serialize to JSON', () => {
      const model = new QueryFilterCardModel({ title: 'Test Filter' })
      const event = model.addEvent({ conceptSet: 'Test Concept Set' })

      const json = model.toJSON()

      expect(json.title).toBe('Test Filter')
      expect(json.events).toHaveLength(1)
      expect(json.events[0].conceptSet).toBe('Test Concept Set')
    })
  })
})

describe('QueryFilterManager', () => {
  describe('constructor', () => {
    it('should create with empty filters', () => {
      const manager = new QueryFilterManager()

      expect(manager.getAllFilters()).toEqual([])
    })

    it('should create with initial filters', () => {
      const filters = [new QueryFilterCardModel({ title: 'Test Filter' })]
      const manager = new QueryFilterManager(filters)

      expect(manager.getAllFilters()).toHaveLength(1)
      expect(manager.getAllFilters()[0].title).toBe('Test Filter')
    })
  })

  describe('filter management', () => {
    let manager: QueryFilterManager

    beforeEach(() => {
      manager = new QueryFilterManager()
    })

    it('should add filter with default values', () => {
      const filter = manager.addFilter()

      expect(manager.getAllFilters()).toHaveLength(1)
      expect(filter.title).toBe('')
      expect(filter.type).toBe('inclusion')
      expect(filter.isExpanded).toBe(true)
    })

    it('should add filter with custom values', () => {
      const filterData = {
        title: 'Custom Filter',
        type: 'exclusion' as const,
        isExpanded: false,
      }

      const filter = manager.addFilter(filterData)

      expect(filter.title).toBe('Custom Filter')
      expect(filter.type).toBe('exclusion')
      expect(filter.isExpanded).toBe(false)
    })

    it('should remove filter by ID', () => {
      const filter = manager.addFilter()
      expect(manager.getAllFilters()).toHaveLength(1)

      const removed = manager.removeFilter(filter.id)

      expect(removed).toBe(true)
      expect(manager.getAllFilters()).toHaveLength(0)
    })

    it('should return false when removing non-existent filter', () => {
      const removed = manager.removeFilter('non-existent')

      expect(removed).toBe(false)
    })

    it('should update filter', () => {
      const filter = manager.addFilter()
      const updates = { title: 'Updated Filter', type: 'exclusion' as const }

      const updated = manager.updateFilter(filter.id, updates)

      expect(updated).toBe(true)
      expect(filter.title).toBe('Updated Filter')
      expect(filter.type).toBe('exclusion')
    })

    it('should move filter to new position', () => {
      const filter1 = manager.addFilter({ title: 'Filter 1' })
      const filter2 = manager.addFilter({ title: 'Filter 2' })
      const filter3 = manager.addFilter({ title: 'Filter 3' })

      const moved = manager.moveFilter(filter1.id, 2)

      expect(moved).toBe(true)
      expect(manager.getAllFilters()[0].title).toBe('Filter 2')
      expect(manager.getAllFilters()[1].title).toBe('Filter 3')
      expect(manager.getAllFilters()[2].title).toBe('Filter 1')
    })

    it('should return false when moving filter to invalid position', () => {
      const filter = manager.addFilter()

      const moved = manager.moveFilter(filter.id, 5)

      expect(moved).toBe(false)
    })
  })

  describe('filter getters', () => {
    let manager: QueryFilterManager

    beforeEach(() => {
      manager = new QueryFilterManager()
    })

    it('should get filter by ID', () => {
      const addedFilter = manager.addFilter({ title: 'Test Filter' })
      const foundFilter = manager.getFilter(addedFilter.id)

      expect(foundFilter).toBe(addedFilter)
      expect(foundFilter?.title).toBe('Test Filter')
    })

    it('should get all filters', () => {
      manager.addFilter({ title: 'Filter 1' })
      manager.addFilter({ title: 'Filter 2' })

      const allFilters = manager.getAllFilters()

      expect(allFilters).toHaveLength(2)
      expect(allFilters[0].title).toBe('Filter 1')
      expect(allFilters[1].title).toBe('Filter 2')
    })

    it('should get inclusion filters', () => {
      manager.addFilter({ title: 'Inclusion 1', type: 'inclusion' })
      manager.addFilter({ title: 'Exclusion 1', type: 'exclusion' })
      manager.addFilter({ title: 'Inclusion 2', type: 'inclusion' })

      const inclusionFilters = manager.getInclusionFilters()

      expect(inclusionFilters).toHaveLength(2)
      expect(inclusionFilters[0].title).toBe('Inclusion 1')
      expect(inclusionFilters[1].title).toBe('Inclusion 2')
    })

    it('should get exclusion filters', () => {
      manager.addFilter({ title: 'Inclusion 1', type: 'inclusion' })
      manager.addFilter({ title: 'Exclusion 1', type: 'exclusion' })
      manager.addFilter({ title: 'Exclusion 2', type: 'exclusion' })

      const exclusionFilters = manager.getExclusionFilters()

      expect(exclusionFilters).toHaveLength(2)
      expect(exclusionFilters[0].title).toBe('Exclusion 1')
      expect(exclusionFilters[1].title).toBe('Exclusion 2')
    })

    it('should get filter count', () => {
      expect(manager.getFilterCount()).toBe(0)

      manager.addFilter()
      manager.addFilter()

      expect(manager.getFilterCount()).toBe(2)
    })
  })

  describe('event and concept set management', () => {
    let manager: QueryFilterManager

    beforeEach(() => {
      manager = new QueryFilterManager()
    })

    it('should add event to filter', () => {
      const filter = manager.addFilter()
      const eventData = { conceptSet: 'Test Concept Set' }

      const event = manager.addEventToFilter(filter.id, eventData)

      expect(event).not.toBeNull()
      expect(event?.conceptSet).toBe('Test Concept Set')
      expect(filter.events).toHaveLength(1)
    })

    it('should return null when adding event to non-existent filter', () => {
      const event = manager.addEventToFilter('non-existent', {})

      expect(event).toBeNull()
    })

    it('should remove event from filter', () => {
      const filter = manager.addFilter()
      const event = manager.addEventToFilter(filter.id, {})!

      const removed = manager.removeEventFromFilter(filter.id, event.id)

      expect(removed).toBe(true)
      expect(filter.events).toHaveLength(0)
    })

    it('should handle concept set details', () => {
      const filter = manager.addFilter()
      const event = manager.addEventToFilter(filter.id, {})!

      // Simulate updating event with concept set details
      filter.updateEvent(event.id, {
        conceptSetDetails: [{ CONCEPT_ID: 1, CONCEPT_NAME: 'Diabetes', DOMAIN_ID: 'Condition' }],
      })

      expect(event.conceptSetDetails).toHaveLength(1)
      expect(event.conceptSetDetails![0].CONCEPT_NAME).toBe('Diabetes')
    })
  })

  describe('bulk operations', () => {
    let manager: QueryFilterManager

    beforeEach(() => {
      manager = new QueryFilterManager()
    })

    it('should clear all filters', () => {
      manager.addFilter()
      manager.addFilter()

      expect(manager.getAllFilters()).toHaveLength(2)

      manager.clearAllFilters()

      expect(manager.getAllFilters()).toHaveLength(0)
    })

    it('should clear empty filters', () => {
      const filter1 = manager.addFilter()
      const filter2 = manager.addFilter()

      // Add event to filter1 only
      manager.addEventToFilter(filter1.id, { conceptSet: 'Test' })

      manager.clearEmptyFilters()

      expect(manager.getAllFilters()).toHaveLength(1)
      expect(manager.getAllFilters()[0]).toBe(filter1)
    })

    it('should clear empty events', () => {
      const filter = manager.addFilter()
      const event1 = manager.addEventToFilter(filter.id, {})!
      const event2 = manager.addEventToFilter(filter.id, {})!

      // Add conceptSetDetails to event1 only
      filter.updateEvent(event1.id, {
        conceptSetDetails: [{ CONCEPT_ID: 1, CONCEPT_NAME: 'Test' }],
      })

      expect(filter.events).toHaveLength(2)
      manager.clearEmptyEvents()
      expect(filter.events).toHaveLength(1) // Only event with conceptSetDetails remains
    })
  })

  describe('validation', () => {
    let manager: QueryFilterManager

    beforeEach(() => {
      manager = new QueryFilterManager()
    })

    it('should check if has filters', () => {
      expect(manager.hasFilters()).toBe(false)

      manager.addFilter()
      expect(manager.hasFilters()).toBe(true)
    })

    it('should check if has valid filters', () => {
      expect(manager.hasValidFilters()).toBe(false)

      const filter = manager.addFilter()
      manager.addEventToFilter(filter.id, { conceptSet: 'Test' })

      expect(manager.hasValidFilters()).toBe(true)
    })

    it('should validate filters and return errors', () => {
      const result = manager.validateFilters()

      expect(result.isValid).toBe(true) // No filters means valid
      expect(result.errors).toEqual([])
    })
  })

  describe('serialization and cloning', () => {
    let manager: QueryFilterManager

    beforeEach(() => {
      manager = new QueryFilterManager()
    })

    it('should serialize to JSON', () => {
      const filter = manager.addFilter({ title: 'Test Filter' })
      manager.addEventToFilter(filter.id, { conceptSet: 'Test Concept' })

      const json = manager.toJSON()
      const filters = manager.getAllFilters()

      expect(filters).toHaveLength(1)
      expect(filters[0].title).toBe('Test Filter')
      expect(filters[0].events).toHaveLength(1)
    })

    it('should create manager from JSON', () => {
      const filter = manager.addFilter({ title: 'Test Filter' })
      manager.addEventToFilter(filter.id, { conceptSet: 'Test Concept' })

      const json = manager.toJSON()
      const restored = QueryFilterManager.fromJSON(json)

      expect(restored.getAllFilters()).toHaveLength(1)
      expect(restored.getAllFilters()[0].title).toBe('Test Filter')
      expect(restored.getAllFilters()[0].events).toHaveLength(1)
    })

    it('should clone manager', () => {
      const filter = manager.addFilter({ title: 'Test Filter' })
      manager.addEventToFilter(filter.id, { conceptSet: 'Test Concept' })

      const clone = manager.clone()

      expect(clone.getAllFilters()).toHaveLength(1)
      expect(clone.getAllFilters()[0].title).toBe('Test Filter')
      expect(clone.getAllFilters()[0].events).toHaveLength(1)

      // Ensure deep copy
      expect(clone.getAllFilters()[0]).not.toBe(filter)
      expect(clone.getAllFilters()[0].id).not.toBe(filter.id)
    })

    it('should get summary statistics', () => {
      const inclusionFilter = manager.addFilter({ type: 'inclusion' })
      const exclusionFilter = manager.addFilter({ type: 'exclusion' })

      manager.addEventToFilter(inclusionFilter.id, { conceptSet: 'Test' })

      const summary = manager.getSummary()

      expect(summary.totalFilters).toBe(2)
      expect(summary.inclusionFilters).toBe(1)
      expect(summary.exclusionFilters).toBe(1)
      expect(summary.totalEvents).toBe(1)
    })
  })

  describe('convertToAtlasFormat', () => {
    it('should work for sample 1', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample1Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample1Expected)
    })

    it('should work for sample 2', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample2Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample2Expected)
    })

    it('should work for sample 3', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample3Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample3Expected)
    })

    it('should work for sample 4', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample4Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample4Expected)
    })

    it('should work for sample 5', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample5Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample5Expected)
    })

    it('should work for sample 6', () => {
      const manager = QueryFilterCriteriaManager.fromJSON(sample6Input)
      const atlasFormat = manager.convertToAtlasFormat()

      expect(atlasFormat).toEqual(sample6Expected)
    })
  })
})
