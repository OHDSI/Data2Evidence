import { QueryFilterCriteriaManager } from '../../models/QueryFilterModel'
import sample2Input from '../../__tests__/data/sample2-input'
import sample3Input from '../../__tests__/data/sample3-input'

describe('QueryFilter Integration Tests', () => {
  describe('Sample 2 Data Integration (Basic Hierarchy)', () => {
    let criteriaManager: QueryFilterCriteriaManager

    beforeEach(() => {
      criteriaManager = new QueryFilterCriteriaManager(sample2Input)
    })

    it('correctly loads sample2 data structure', () => {
      // Test the data structure directly
      const criteria = criteriaManager.getCriteria()

      expect(criteria).toBeDefined()
      expect(criteria.criteriaType).toBe('ALL')
      expect(criteria.criteria).toHaveLength(1)

      // Check first criteria group
      const firstGroup = criteria.criteria[0]
      expect(firstGroup.title).toBe('Criteria 1')
      expect(firstGroup.groupType).toBe('ALL')
      expect(firstGroup.groups).toHaveLength(1)

      // Check events in first group
      const firstCard = firstGroup.groups[0]
      expect(firstCard.events).toHaveLength(2)
      expect(firstCard.events[0].eventType).toBe('conditionOccurrence')
      expect(firstCard.events[1].eventType).toBe('conditionOccurrence')
    })

    it('handles qualifying events limit changes with sample2 data', () => {
      // Test data model changes directly
      expect(criteriaManager.getCriteria().criteriaType).toBe('ALL')

      // Change qualifying events limit
      criteriaManager.updateQualifyingEventsLimit('EARLIEST')

      expect(criteriaManager.getCriteria().criteriaType).toBe('EARLIEST')

      // Test other limits
      criteriaManager.updateQualifyingEventsLimit('LATEST')
      expect(criteriaManager.getCriteria().criteriaType).toBe('LATEST')
    })

    it('handles adding new groups to sample2 data', () => {
      const initialGroupCount = criteriaManager.getCriteria().criteria.length
      expect(initialGroupCount).toBe(1)

      // Add new criteria group
      criteriaManager.addCriteriaGroup({
        title: 'New Criteria',
        description: 'New description',
        groupType: 'ANY',
        groups: [],
      })

      expect(criteriaManager.getCriteria().criteria.length).toBe(2)

      const newGroup = criteriaManager.getCriteria().criteria[1]
      expect(newGroup.title).toBe('New Criteria')
      expect(newGroup.groupType).toBe('ANY')
    })

    it('handles group updates with sample2 data', () => {
      const firstGroup = criteriaManager.getCriteria().criteria[0]
      expect(firstGroup.title).toBe('Criteria 1')

      // Update the group
      criteriaManager.updateCriteriaGroup(0, {
        ...firstGroup,
        title: 'Updated Criteria',
        groupType: 'ANY',
      })

      const updatedGroup = criteriaManager.getCriteria().criteria[0]
      expect(updatedGroup.title).toBe('Updated Criteria')
      expect(updatedGroup.groupType).toBe('ANY')
    })

    it('handles removing groups from sample2 data', () => {
      // Add an extra group first
      criteriaManager.addCriteriaGroup({
        title: 'Temp Criteria',
        description: 'Temporary',
        groupType: 'ALL',
        groups: [],
      })

      expect(criteriaManager.getCriteria().criteria.length).toBe(2)

      // Remove the second group
      criteriaManager.removeCriteriaGroup(1)

      expect(criteriaManager.getCriteria().criteria.length).toBe(1)
      expect(criteriaManager.getCriteria().criteria[0].title).toBe('Criteria 1')
    })
  })

  describe('Sample 3 Data Integration (Nested Structures)', () => {
    let criteriaManager: QueryFilterCriteriaManager

    beforeEach(() => {
      criteriaManager = new QueryFilterCriteriaManager(sample3Input)
    })

    it('correctly loads sample3 data structure with nested attributes', () => {
      const criteria = criteriaManager.getCriteria()

      expect(criteria).toBeDefined()
      expect(criteria.criteria).toHaveLength(1)

      // Check that the group has events with attributes
      const firstGroup = criteria.criteria[0]
      expect(firstGroup.groups).toHaveLength(1)

      // Check first event has attributes
      const firstCard = firstGroup.groups[0]
      expect(firstCard.events).toHaveLength(2)
      const firstEvent = firstCard.events[0]
      expect(firstEvent.attributes).toBeDefined()
      expect(firstEvent.attributes?.length).toBeGreaterThan(0)
    })

    it('preserves nested criteria structure', () => {
      const criteria = criteriaManager.getCriteria()

      // Check the original structure is preserved
      expect(criteria.criteria).toHaveLength(1)
      expect(criteria.criteria[0].groups).toHaveLength(1)
      expect(criteria.criteria[0].groups[0].events).toHaveLength(2)

      // Check that first event has nested attributes
      const firstEvent = criteria.criteria[0].groups[0].events[0]
      expect(firstEvent.attributes).toBeDefined()
      expect(firstEvent.attributes).toHaveLength(1)
      expect(firstEvent.attributes?.[0].attributeType).toBe('nested')
      expect(firstEvent.attributes?.[0].nestedCriteria).toBeDefined()
    })

    it('handles complex nested structure navigation', () => {
      const criteria = criteriaManager.getCriteria()
      const firstEvent = criteria.criteria[0].groups[0].events[0]
      const nestedCriteria = firstEvent.attributes?.[0].nestedCriteria

      // Verify nested criteria structure
      expect(nestedCriteria?.id).toBe('criteria_1749626300528')
      expect(nestedCriteria?.criteriaType).toBe('ALL')
      expect(nestedCriteria?.events).toHaveLength(1)

      // Verify nested event
      const nestedEvent = nestedCriteria?.events[0]
      expect(nestedEvent?.id).toBe('event_1749626300529')
      expect(nestedEvent?.eventType).toBe('conditionOccurrence')
      expect(nestedEvent?.cardinality?.type).toBe('AT_LEAST')
      expect(nestedEvent?.cardinality?.count).toBe(1)
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
      const firstCard = group.groups[0]
      const events = firstCard.events
      expect(events).toHaveLength(2)
      events.forEach(event => {
        expect(event.id).toBeDefined()
        expect(event.eventType).toBeDefined()
        expect(event.cardinality).toBeDefined()
      })
    })

    it('validates sample3 nested data structure integrity', () => {
      const manager = new QueryFilterCriteriaManager(sample3Input)
      const criteria = manager.getCriteria()

      // Check nested attributes exist and are valid
      const firstEvent = criteria.criteria[0].groups[0].events[0]
      expect(firstEvent.attributes).toBeDefined()
      expect(firstEvent.attributes?.length).toBeGreaterThan(0)

      const nestedAttribute = firstEvent.attributes?.[0]
      expect(nestedAttribute?.attributeType).toBe('nested')
      expect(nestedAttribute?.nestedCriteria).toBeDefined()
      expect(nestedAttribute?.nestedCriteria?.events).toHaveLength(1)
    })

    it('handles serialization and deserialization', () => {
      const originalManager = new QueryFilterCriteriaManager(sample2Input)

      // Serialize to JSON
      const json = originalManager.toJSON()
      expect(json).toBeDefined()

      // Create new manager from JSON
      const newManager = new QueryFilterCriteriaManager(json)
      const newCriteria = newManager.getCriteria()
      const originalCriteria = originalManager.getCriteria()

      // Verify data integrity
      expect(newCriteria.criteriaType).toBe(originalCriteria.criteriaType)
      expect(newCriteria.criteria.length).toBe(originalCriteria.criteria.length)
      expect(newCriteria.criteria[0].title).toBe(originalCriteria.criteria[0].title)
      expect(newCriteria.criteria[0].groups.length).toBe(originalCriteria.criteria[0].groups.length)
    })
  })

  describe('Criteria Manager Operations', () => {
    it('clears all criteria', () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)

      expect(manager.getCriteria().criteria.length).toBe(1)

      manager.clearAllCriteria()

      expect(manager.getCriteria().criteria.length).toBe(0)
    })

    it('sets new criteria data', () => {
      const manager = new QueryFilterCriteriaManager()

      expect(manager.getCriteria().criteria.length).toBe(0)

      // Create a new manager with sample2 data and get its criteria
      const sampleManager = new QueryFilterCriteriaManager(sample2Input)
      manager.setCriteria(sampleManager.getCriteria())

      expect(manager.getCriteria().criteria.length).toBe(1)
      expect(manager.getCriteria().criteria[0].title).toBe('Criteria 1')
    })

    it('validates manager state consistency', () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)

      // Add multiple operations
      manager.addCriteriaGroup({
        title: 'Test Criteria',
        description: 'Test',
        groupType: 'ANY',
        groups: [],
      })

      manager.updateQualifyingEventsLimit('EARLIEST')

      const criteria = manager.getCriteria()
      expect(criteria.criteria.length).toBe(2)
      expect(criteria.criteriaType).toBe('EARLIEST')
      expect(criteria.criteria[1].title).toBe('Test Criteria')
      expect(criteria.criteria[1].groupType).toBe('ANY')
    })
  })

  describe('Event Management', () => {
    it('handles event operations in groups', () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)
      const group = manager.getCriteria().criteria[0]
      const firstCard = group.groups[0]

      expect(firstCard.events.length).toBe(2)

      // Test event cardinality
      expect(firstCard.events[0].cardinality?.type).toBe('AT_LEAST')
      expect(firstCard.events[0].cardinality?.count).toBe(1)

      // Test event types
      expect(firstCard.events[0].eventType).toBe('conditionOccurrence')
      expect(firstCard.events[1].eventType).toBe('conditionOccurrence')
    })

    it('preserves event attributes in nested structures', () => {
      const manager = new QueryFilterCriteriaManager(sample3Input)
      const firstEvent = manager.getCriteria().criteria[0].groups[0].events[0]

      expect(firstEvent.attributes).toBeDefined()
      expect(firstEvent.attributes?.length).toBe(1)

      const attribute = firstEvent.attributes?.[0]
      expect(attribute?.attributeType).toBe('nested')
      expect(attribute?.nestedCriteria?.events).toHaveLength(1)
    })
  })
})
