import { QueryFilterCardModel, QueryFilterCriteriaManager } from '../models/QueryFilterModel'
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

        const eventGroup = model.getEventWithParent(parentEvent.id)

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

describe('QueryFilterCriteriaManager', () => {
  describe('constructor', () => {
    it('should create with default values', () => {
      const manager = new QueryFilterCriteriaManager()

      expect(manager.getCriteria()).toBeDefined()
      expect(manager.getCriteria().criteriaType).toBe('ALL')
      expect(manager.getCriteria().criteria).toEqual([])
    })

    it('should create with inclusionCriteria structure', () => {
      const data = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'EARLIEST',
          criteria: [
            {
              id: 'test-criteria',
              title: 'Test Criteria',
              description: 'Test Description',
              criteriaType: 'ALL',
              events: [],
            },
          ],
        },
      }
      const manager = new QueryFilterCriteriaManager(data)

      expect(manager.getCriteria().criteriaType).toBe('EARLIEST')
      expect(manager.getCriteria().criteria).toHaveLength(1)
      expect(manager.getCriteria().criteria[0].title).toBe('Test Criteria')
    })
  })

  describe('criteria management', () => {
    let manager: QueryFilterCriteriaManager

    beforeEach(() => {
      manager = new QueryFilterCriteriaManager()
    })

    it('should add criteria group', () => {
      const group = {
        title: 'Test Group',
        description: 'Test Description',
        groupType: 'ALL' as const,
      }

      manager.addCriteria(group)

      expect(manager.getCriteria().criteria).toHaveLength(1)
      expect(manager.getCriteria().criteria[0].title).toBe('Test Group')
    })

    it('should remove criteria group', () => {
      const criteria = manager.addCriteria({ title: 'Test Group' })
      expect(manager.getCriteria().criteria).toHaveLength(1)

      const removed = manager.removeGroup(criteria.id)

      expect(removed).toBe(true)
      expect(manager.getCriteria().criteria).toHaveLength(0)
    })

    it('should update criteria group', () => {
      const criteria = manager.addCriteria({ title: 'Original Title' })
      const updates = { title: 'Updated Title', description: 'Updated Description' }

      const updated = manager.updateGroup(criteria.id, updates)

      expect(updated).toBe(true)
      expect(criteria.title).toBe('Updated Title')
      expect(criteria.description).toBe('Updated Description')
    })

    it('should set criteria type', () => {
      expect(manager.getCriteria().criteriaType).toBe('ALL')

      manager.setCriteriaType('EARLIEST')

      expect(manager.getCriteria().criteriaType).toBe('EARLIEST')
    })
  })

  describe('filter management within groups', () => {
    let manager: QueryFilterCriteriaManager

    beforeEach(() => {
      manager = new QueryFilterCriteriaManager()
    })

    it('should add event to criteria', () => {
      const criteria = manager.addCriteria({ title: 'Test Group' })
      const filterData = { title: 'Test Filter', type: 'inclusion' as const }

      const filter = manager.addFilterToGroup(criteria.id, filterData)

      expect(filter).not.toBeNull()
      expect(filter?.title).toBe('Test Filter')
      expect(criteria.events).toHaveLength(1) // Added filter
    })

    it('should return null when adding filter to non-existent group', () => {
      const filter = manager.addFilterToGroup('non-existent', {})

      expect(filter).toBeNull()
    })

    it('should remove filter from group', () => {
      const criteria = manager.addCriteria({ title: 'Test Group' })
      const filter = manager.addFilterToGroup(criteria.id, {})!

      const removed = manager.removeFilterFromGroup(criteria.id, filter.id)

      expect(removed).toBe(true)
      expect(criteria.events).toHaveLength(0) // No filters remain
    })
  })

  describe('serialization and cloning', () => {
    let manager: QueryFilterCriteriaManager

    beforeEach(() => {
      manager = new QueryFilterCriteriaManager()
    })

    it('should serialize to JSON', () => {
      const group = manager.addCriteria({ title: 'Test Group' })
      const json = manager.toJSON()

      expect(json.inclusionCriteria).toBeDefined()
      expect(json.inclusionCriteria.qualifyingEventsLimit).toBe('ALL')
      expect(json.inclusionCriteria.criteria).toHaveLength(1)
      expect(json.inclusionCriteria.criteria[0].title).toBe('Test Group')
    })

    it('should create manager from JSON', () => {
      manager.addCriteria({ title: 'Test Group' })
      const json = manager.toJSON()
      const restored = QueryFilterCriteriaManager.fromJSON(json)

      expect(restored.getCriteria().criteria).toHaveLength(1)
      expect(restored.getCriteria().criteria[0].title).toBe('Test Group')
    })

    it('should clone manager', () => {
      const criteria = manager.addCriteria({ title: 'Test Group' })
      const clone = manager.clone()

      expect(clone.getCriteria().criteria).toHaveLength(1)
      expect(clone.getCriteria().criteria[0].title).toBe('Test Group')

      // Ensure deep copy
      expect(clone.getCriteria().criteria[0]).not.toBe(criteria)
      expect(clone.getCriteria().criteria[0].id).not.toBe(criteria.id)
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
