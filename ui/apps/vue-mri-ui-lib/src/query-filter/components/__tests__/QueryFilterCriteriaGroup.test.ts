import { QueryFilterEvent } from '../../models/QueryFilterModel'
import type { QueryFilterGroup } from '../../models/QueryFilterModel'

describe('QueryFilterCriteriaGroup Model Tests', () => {
  let mockGroup: QueryFilterGroup

  beforeEach(() => {
    mockGroup = {
      id: 'group_1',
      title: 'Test Group',
      description: 'Test Description',
      criteriaType: 'ALL',
      events: [
        {
          id: 'event_1',
          conceptSet: 'Test Event',
          eventType: 'conditionOccurrence',
        },
      ],
    }
  })

  it('creates a valid group structure', () => {
    expect(mockGroup.id).toBe('group_1')
    expect(mockGroup.title).toBe('Test Group')
    expect(mockGroup.description).toBe('Test Description')
    expect(mockGroup.criteriaType).toBe('ALL')
    expect(mockGroup.events).toHaveLength(1)
  })

  it('supports different group types', () => {
    const allGroup = { ...mockGroup, criteriaType: 'ALL' as const }
    const anyGroup = { ...mockGroup, criteriaType: 'ANY' as const }
    const atLeastGroup = { ...mockGroup, criteriaType: 'AT_LEAST' as const }
    const atMostGroup = { ...mockGroup, criteriaType: 'AT_MOST' as const }

    expect(allGroup.criteriaType).toBe('ALL')
    expect(anyGroup.criteriaType).toBe('ANY')
    expect(atLeastGroup.criteriaType).toBe('AT_LEAST')
    expect(atMostGroup.criteriaType).toBe('AT_MOST')
  })

  it('contains QueryFilterEvent instances', () => {
    expect(mockGroup.events[0]).toBeDefined()
    expect(mockGroup.events[0].id).toBe('event_1')
    expect(mockGroup.events[0].conceptSet).toBe('Test Event')
    expect(mockGroup.events[0].eventType).toBe('conditionOccurrence')
  })

  it('handles multiple events in a group', () => {
    const secondEvent: QueryFilterEvent = {
      id: 'event_2',
      conceptSet: 'Second Event',
      eventType: 'drugExposure',
    }

    mockGroup.events.push(secondEvent)

    expect(mockGroup.events).toHaveLength(2)
    expect(mockGroup.events[0].eventType).toBe('conditionOccurrence')
    expect(mockGroup.events[1].eventType).toBe('drugExposure')
    expect(mockGroup.events[1].conceptSet).toBe('Second Event')
  })

  it('validates group structure integrity', () => {
    // Test required properties
    expect(mockGroup.id).toBeDefined()
    expect(mockGroup.title).toBeDefined()
    expect(mockGroup.description).toBeDefined()
    expect(mockGroup.criteriaType).toBeDefined()
    expect(mockGroup.events).toBeDefined()
    expect(Array.isArray(mockGroup.events)).toBe(true)

    // Test that events contains valid event objects
    mockGroup.events.forEach(event => {
      expect(event.id).toBeDefined()
      expect(event.conceptSet).toBeDefined()
    })
  })

  it('supports group metadata updates', () => {
    const updatedGroup = {
      ...mockGroup,
      title: 'Updated Title',
      description: 'Updated Description',
      criteriaType: 'ANY' as const,
    }

    expect(updatedGroup.title).toBe('Updated Title')
    expect(updatedGroup.description).toBe('Updated Description')
    expect(updatedGroup.criteriaType).toBe('ANY')
    expect(updatedGroup.id).toBe(mockGroup.id) // ID should remain the same
  })

  it('handles empty events', () => {
    const emptyGroup: QueryFilterGroup = {
      id: 'empty_group',
      title: 'Empty Group',
      description: 'No filters',
      criteriaType: 'ALL',
      events: [],
    }

    expect(emptyGroup.events).toHaveLength(0)
    expect(Array.isArray(emptyGroup.events)).toBe(true)
  })

  it('supports event operations within group', () => {
    const initialCount = mockGroup.events.length

    // Add a new event
    const newEvent: QueryFilterEvent = {
      id: 'new_event',
      conceptSet: 'New Event',
      eventType: 'procedureOccurrence',
    }
    mockGroup.events.push(newEvent)

    expect(mockGroup.events.length).toBe(initialCount + 1)
    expect(mockGroup.events[mockGroup.events.length - 1]).toBe(newEvent)

    // Remove the event
    const removeIndex = mockGroup.events.findIndex(e => e.id === 'new_event')
    mockGroup.events.splice(removeIndex, 1)

    expect(mockGroup.events.length).toBe(initialCount)
  })

  it('maintains group type consistency', () => {
    const validGroupTypes = ['ALL', 'ANY', 'AT_LEAST', 'AT_MOST'] as const

    validGroupTypes.forEach(criteriaType => {
      const testGroup = { ...mockGroup, criteriaType }
      expect(testGroup.criteriaType).toBe(criteriaType)
    })
  })

  it('preserves event relationships', () => {
    // Verify events exist in the group
    expect(mockGroup.events[0]).toBeDefined()
    expect(mockGroup.events).toHaveLength(1)
    expect(mockGroup.events[0].conceptSet).toBe('Test Event')

    // Add a nested event
    const nestedEvent: QueryFilterEvent = {
      id: 'nested_event',
      conceptSet: 'Nested Event',
      eventType: 'observation',
      parentEventId: mockGroup.events[0].id,
    }

    mockGroup.events.push(nestedEvent)
    expect(mockGroup.events).toHaveLength(2)
    expect(mockGroup.events[1].parentEventId).toBe('event_1')
  })
})
