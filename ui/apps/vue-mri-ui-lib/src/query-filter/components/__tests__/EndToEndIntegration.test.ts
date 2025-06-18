import { QueryFilterCriteriaManager, QueryFilterCardModel } from '../../models/QueryFilterModel'
import sample2Input from '../../__tests__/data/sample2-input'
import sample3Input from '../../__tests__/data/sample3-input'

describe('End-to-End Integration Tests', () => {
  describe('Complete Workflow - Sample 2 Data', () => {
    it('loads sample2 data and performs full workflow', () => {
      // Step 1: Load sample2 data into criteria manager
      const manager = new QueryFilterCriteriaManager(sample2Input)
      const criteria = manager.getCriteria()

      // Step 2: Verify loaded data structure
      expect(criteria.criteriaType).toBe('ALL')
      expect(criteria.criteria).toHaveLength(1)
      expect(criteria.criteria[0].title).toBe('Criteria 1')
      expect(criteria.criteria[0].groupType).toBe('ALL')

      // Step 3: Test Atlas conversion
      const atlasFormat = manager.convertToAtlasFormat()
      expect(atlasFormat).toBeDefined()
      expect(atlasFormat.QualifiedLimit.Type).toBe('All')
      expect(atlasFormat.InclusionRules).toHaveLength(1)
      expect(atlasFormat.InclusionRules[0].name).toBe('Criteria 1')

      // Step 4: Test round-trip conversion via JSON
      const serialized = manager.toJSON()
      const restored = QueryFilterCriteriaManager.fromJSON(serialized)

      const finalCriteria = restored.getCriteria()
      expect(finalCriteria.criteriaType).toBe('ALL')
      expect(finalCriteria.criteria.length).toBe(1)
      expect(finalCriteria.criteria[0].title).toBe('Criteria 1')
    })

    it('maintains data integrity throughout operations', () => {
      // Load sample data
      const manager = new QueryFilterCriteriaManager(sample2Input)
      const originalCriteria = manager.getCriteria()

      // Perform multiple operations
      manager.updateQualifyingEventsLimit('EARLIEST')
      expect(manager.getCriteria().criteriaType).toBe('EARLIEST')

      manager.addCriteriaGroup({
        title: 'Additional Group',
        description: 'Additional description',
        groupType: 'ANY',
        groups: [],
      })
      expect(manager.getCriteria().criteria.length).toBe(2)

      // Convert to Atlas and verify
      const atlasFormat = manager.convertToAtlasFormat()
      expect(atlasFormat.QualifiedLimit.Type).toBe('First') // EARLIEST maps to First

      // Test serialization integrity
      const serialized = manager.toJSON()
      const restored = QueryFilterCriteriaManager.fromJSON(serialized)

      expect(restored.getCriteria().criteriaType).toBe('EARLIEST')
      expect(restored.getCriteria().criteria.length).toBe(2)
      expect(restored.getCriteria().criteria[0].title).toBe(originalCriteria.criteria[0].title)
      expect(restored.getCriteria().criteria[1].title).toBe('Additional Group')
    })

    it('handles concept set management integration', () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)
      const firstGroup = manager.getCriteria().criteria[0]
      const firstFilter = firstGroup.groups[0]

      // Simulate concept set assignment
      const event = firstFilter.addEvent({
        conceptSet: 'Diabetes Type 2 Conditions',
        conceptSetDetails: [
          {
            CONCEPT_ID: 201826,
            CONCEPT_NAME: 'Type 2 diabetes mellitus',
            CONCEPT_CODE: 'E11',
            VOCABULARY_ID: 'ICD10CM',
            DOMAIN_ID: 'Condition',
          },
        ],
      })

      expect(event.conceptSet).toBe('Diabetes Type 2 Conditions')
      expect(event.conceptSetDetails).toHaveLength(1)
      expect(event.conceptSetDetails![0].CONCEPT_NAME).toBe('Type 2 diabetes mellitus')

      // Test that Atlas conversion includes concept sets
      const atlasFormat = manager.convertToAtlasFormat()
      expect(atlasFormat.ConceptSets).toBeDefined()
    })
  })

  describe('Complete Workflow - Sample 3 Data (Nested)', () => {
    it('loads sample3 nested data and handles recursion', () => {
      // Load sample3 data with nested structures
      const manager = new QueryFilterCriteriaManager(sample3Input)
      const criteria = manager.getCriteria()

      // Verify nested structure is preserved
      expect(criteria.criteria).toHaveLength(1)

      const firstGroup = criteria.criteria[0]
      expect(firstGroup.groups).toHaveLength(1)
      expect(firstGroup.groups[0].events).toHaveLength(2)

      // Check for nested attributes
      const firstEvent = firstGroup.groups[0].events[0]
      expect(firstEvent.attributes).toBeDefined()
      expect(firstEvent.attributes).toHaveLength(1)
      expect(firstEvent.attributes![0].attributeType).toBe('nested')
      expect(firstEvent.attributes![0].nestedCriteria).toBeDefined()

      // Test Atlas conversion with nested data
      const atlasFormat = manager.convertToAtlasFormat()
      expect(atlasFormat.InclusionRules[0].expression.CriteriaList).toHaveLength(2)
    })

    it('handles complex nested operations', () => {
      // Load nested data
      const manager = new QueryFilterCriteriaManager(sample3Input)
      const criteria = manager.getCriteria()

      // Test nested structure navigation
      const nestedCriteria = criteria.criteria[0].groups[0].events[0].attributes![0].nestedCriteria

      expect(nestedCriteria!.id).toBe('criteria_1749626300528')
      expect(nestedCriteria!.criteriaType).toBe('ALL')
      expect(nestedCriteria!.events).toHaveLength(1)

      // Test nested event properties
      const nestedEvent = nestedCriteria!.events[0]
      expect(nestedEvent.id).toBe('event_1749626300529')
      expect(nestedEvent.eventType).toBe('conditionOccurrence')
      expect(nestedEvent.cardinality!.type).toBe('AT_LEAST')
      expect(nestedEvent.cardinality!.count).toBe(1)
    })

    it('validates nested data through full workflow', () => {
      // Complete workflow with nested data
      const manager = new QueryFilterCriteriaManager(sample3Input)

      // Convert to Atlas format
      const atlasFormat = manager.convertToAtlasFormat()
      expect(atlasFormat).toBeDefined()

      // Verify nested structures are handled in conversion
      const inclusionRule = atlasFormat.InclusionRules[0]
      expect(inclusionRule.expression.CriteriaList).toHaveLength(2)

      // Test serialization with nested data
      const serialized = manager.toJSON()
      const restored = QueryFilterCriteriaManager.fromJSON(serialized)

      const resultCriteria = restored.getCriteria()
      expect(resultCriteria.criteria.length).toBe(1)

      // Verify nested structure is preserved in round-trip
      const restoredNestedCriteria = resultCriteria.criteria[0].groups[0].events[0].attributes![0].nestedCriteria
      expect(restoredNestedCriteria!.id).toBe('criteria_1749626300528')
      expect(restoredNestedCriteria!.events).toHaveLength(1)
    })
  })

  describe('Filter Card Management Workflows', () => {
    it('handles complete filter lifecycle', () => {
      const manager = new QueryFilterCriteriaManager()

      // Create new group
      manager.addCriteriaGroup({
        title: 'Test Group',
        description: 'Test workflow',
        groupType: 'ALL',
        groups: [],
      })

      const group = manager.getCriteria().criteria[0]
      expect(group.groups).toHaveLength(1)

      // Add filter to group
      const filter = group.groups[0]
      expect(filter).toBeInstanceOf(QueryFilterCardModel)

      // Add events to filter
      const event1 = filter.addEvent({
        conceptSet: 'Conditions',
        criteriaType: 'conditionOccurrence',
      })

      const event2 = filter.addEvent({
        conceptSet: 'Medications',
        criteriaType: 'drugExposure',
      })

      expect(filter.events).toHaveLength(2)
      expect(filter.hasEvents()).toBe(true)

      // Test event updates
      filter.updateEvent(event1.id, {
        conceptSetDetails: [{ CONCEPT_ID: 1, CONCEPT_NAME: 'Test Condition' }],
      })

      expect(event1.conceptSetDetails).toHaveLength(1)

      // Test event removal
      filter.removeEvent(event2.id)
      expect(filter.events).toHaveLength(1)

      // Test Atlas conversion with events
      const atlasFormat = manager.convertToAtlasFormat()
      expect(atlasFormat.InclusionRules).toHaveLength(1)
    })

    it('supports nested event workflows', () => {
      const filter = new QueryFilterCardModel({
        title: 'Nested Event Test',
        type: 'inclusion',
      })

      // Add parent event
      const parentEvent = filter.addEvent({
        conceptSet: 'Parent Event',
        criteriaType: 'conditionOccurrence',
      })

      // Add nested attribute event
      const nestedEvent = filter.addAttributeEvent(parentEvent.id, {
        id: 'nested',
        name: 'Nested Group',
        description: 'A nested criteria group',
        type: 'nested',
        category: 'criteria-specific',
      })

      expect(nestedEvent.isNested).toBe(true)
      expect(nestedEvent.parentEventId).toBe(parentEvent.id)

      // Add child to nested event
      const childEvent = filter.addNestedEvent(nestedEvent.id, {
        conceptSet: 'Child Event',
        criteriaType: 'drugExposure',
      })

      expect(nestedEvent.nestedEvents).toHaveLength(1)
      expect(nestedEvent.nestedEvents![0]).toBe(childEvent)
      expect(childEvent.parentEventId).toBe(nestedEvent.id)

      // Test retrieval of nested events
      const foundChild = filter.getEvent(childEvent.id)
      expect(foundChild).toBe(childEvent)

      // Test nested event removal
      const removed = filter.removeNestedEvent(nestedEvent.id, childEvent.id)
      expect(removed).toBe(true)
      expect(nestedEvent.nestedEvents).toHaveLength(0)
    })
  })

  describe('Error Scenarios and Recovery', () => {
    it('handles invalid data scenarios gracefully', () => {
      // Test with invalid data
      const invalidData = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'INVALID_TYPE',
          criteria: null as any,
        },
      }

      expect(() => {
        new QueryFilterCriteriaManager(invalidData)
      }).not.toThrow()

      const manager = new QueryFilterCriteriaManager(invalidData)
      expect(() => manager.convertToAtlasFormat()).not.toThrow()
    })

    it('recovers from incomplete nested structures', () => {
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
                    },
                  ],
                },
              ],
            },
          ],
        },
      }

      expect(() => {
        new QueryFilterCriteriaManager(incompleteData)
      }).not.toThrow()

      const manager = new QueryFilterCriteriaManager(incompleteData)
      const criteria = manager.getCriteria()
      expect(criteria.criteria).toHaveLength(1)
    })

    it('handles filter operations with invalid IDs', () => {
      const filter = new QueryFilterCardModel()

      // Attempt operations with non-existent IDs
      expect(filter.removeEvent('non-existent')).toBe(false)
      expect(filter.updateEvent('non-existent', {})).toBe(false)
      expect(filter.getEvent('non-existent')).toBeUndefined()
      expect(filter.removeNestedEvent('non-existent', 'child')).toBe(false)

      // These should not throw
      expect(() => filter.updateNestedOperator('non-existent', 'OR')).not.toThrow()
    })
  })

  describe('Performance and Scale Testing', () => {
    it('handles large datasets efficiently', () => {
      // Create large hierarchical structure
      const largeHierarchy = {
        inclusionCriteria: {
          qualifyingEventsLimit: 'ALL',
          criteria: Array.from({ length: 50 }, (_, i) => ({
            id: `criteria_${i}`,
            title: `Large Criteria ${i}`,
            description: `Description for criteria ${i}`,
            criteriaType: 'ALL',
            events: Array.from({ length: 20 }, (_, j) => ({
              id: `event_${i}_${j}`,
              eventType: 'conditionOccurrence',
              isExpanded: true,
              attributes: [],
              cardinality: {
                type: 'AT_LEAST',
                count: 1,
                using: 'ALL',
              },
            })),
          })),
        },
      }

      const startTime = performance.now()

      const manager = new QueryFilterCriteriaManager(largeHierarchy)
      const criteria = manager.getCriteria()
      const atlasFormat = manager.convertToAtlasFormat()
      const serialized = manager.toJSON()
      const restored = QueryFilterCriteriaManager.fromJSON(serialized)

      const endTime = performance.now()

      // Should complete within reasonable time
      expect(endTime - startTime).toBeLessThan(1000) // 1 second
      expect(criteria.criteria).toHaveLength(50)
      expect(atlasFormat.InclusionRules).toHaveLength(50)
      expect(restored.getCriteria().criteria.length).toBe(50)
    })

    it('maintains responsiveness with complex operations', () => {
      const operations = Array.from({ length: 100 }, () => () => {
        const manager = new QueryFilterCriteriaManager(sample2Input)
        const atlas = manager.convertToAtlasFormat()
        const json = manager.toJSON()
        const restored = QueryFilterCriteriaManager.fromJSON(json)
        return { atlas, restored }
      })

      const startTime = performance.now()

      // Execute all operations
      const results = operations.map(op => op())

      const endTime = performance.now()

      // Should complete all operations reasonably quickly
      expect(endTime - startTime).toBeLessThan(2000) // 2 seconds for 100 operations
      expect(results).toHaveLength(100)
      results.forEach(result => {
        expect(result.atlas).toBeDefined()
        expect(result.restored).toBeDefined()
      })
    })
  })

  describe('Data Format Validation', () => {
    it('produces valid JSON serialization', () => {
      const manager = new QueryFilterCriteriaManager(sample3Input)

      // Test JSON serialization/deserialization
      const serialized = JSON.stringify(manager.toJSON())
      expect(() => JSON.parse(serialized)).not.toThrow()

      const parsed = JSON.parse(serialized)
      expect(parsed).toBeDefined()
      expect(parsed.criteriaType).toBeDefined()
      expect(parsed.criteria).toBeDefined()

      const reconstructed = QueryFilterCriteriaManager.fromJSON(parsed)
      expect(reconstructed.getCriteria().criteria.length).toBe(manager.getCriteria().criteria.length)
    })

    it('maintains type safety throughout conversions', () => {
      const manager = new QueryFilterCriteriaManager(sample2Input)

      // All operations should maintain proper typing
      const criteria = manager.getCriteria()
      expect(typeof criteria.criteriaType).toBe('string')
      expect(Array.isArray(criteria.criteria)).toBe(true)

      criteria.criteria.forEach(group => {
        expect(typeof group.groupType).toBe('string')
        expect(Array.isArray(group.groups)).toBe(true)

        group.groups.forEach(filter => {
          expect(filter).toBeInstanceOf(QueryFilterCardModel)
          expect(Array.isArray(filter.events)).toBe(true)
        })
      })

      const atlasFormat = manager.convertToAtlasFormat()
      expect(typeof atlasFormat.QualifiedLimit.Type).toBe('string')
      expect(Array.isArray(atlasFormat.InclusionRules)).toBe(true)
    })
  })
})
