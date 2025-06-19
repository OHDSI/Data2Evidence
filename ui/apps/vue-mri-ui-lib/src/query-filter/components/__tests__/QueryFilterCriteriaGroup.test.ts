import { QueryFilterCardModel } from '../../models/QueryFilterModel'
import type { QueryFilterGroup } from '../../models/QueryFilterModel'

describe('QueryFilterCriteriaGroup Model Tests', () => {
  let mockGroup: QueryFilterGroup

  beforeEach(() => {
    mockGroup = {
      id: 'group_1',
      title: 'Test Group',
      description: 'Test Description',
      groupType: 'ALL',
      groups: [
        new QueryFilterCardModel({
          id: 'filter_1',
          title: 'Test Filter',
          type: 'inclusion',
          events: [],
          isExpanded: true,
          cardinality: { type: 'AT_LEAST', count: 1, using: 'ALL' },
        }),
      ],
    }
  })

  it('creates a valid group structure', () => {
    expect(mockGroup.id).toBe('group_1')
    expect(mockGroup.title).toBe('Test Group')
    expect(mockGroup.description).toBe('Test Description')
    expect(mockGroup.groupType).toBe('ALL')
    expect(mockGroup.groups).toHaveLength(1)
  })

  it('supports different group types', () => {
    const allGroup = { ...mockGroup, groupType: 'ALL' as const }
    const anyGroup = { ...mockGroup, groupType: 'ANY' as const }
    const atLeastGroup = { ...mockGroup, groupType: 'AT_LEAST' as const }
    const atMostGroup = { ...mockGroup, groupType: 'AT_MOST' as const }

    expect(allGroup.groupType).toBe('ALL')
    expect(anyGroup.groupType).toBe('ANY')
    expect(atLeastGroup.groupType).toBe('AT_LEAST')
    expect(atMostGroup.groupType).toBe('AT_MOST')
  })

  it('contains QueryFilterCardModel instances', () => {
    expect(mockGroup.groups[0]).toBeInstanceOf(QueryFilterCardModel)
    expect(mockGroup.groups[0].id).toBe('filter_1')
    expect(mockGroup.groups[0].title).toBe('Test Filter')
    expect(mockGroup.groups[0].type).toBe('inclusion')
  })

  it('handles multiple filters in a group', () => {
    const secondFilter = new QueryFilterCardModel({
      id: 'filter_2',
      title: 'Second Filter',
      type: 'exclusion',
      events: [],
      isExpanded: false,
      cardinality: { type: 'exactly', count: 2, using: 'ALL' },
    })

    mockGroup.groups.push(secondFilter)

    expect(mockGroup.groups).toHaveLength(2)
    expect(mockGroup.groups[0].type).toBe('inclusion')
    expect(mockGroup.groups[1].type).toBe('exclusion')
    expect(mockGroup.groups[1].cardinality.count).toBe(2)
  })

  it('validates group structure integrity', () => {
    // Test required properties
    expect(mockGroup.id).toBeDefined()
    expect(mockGroup.title).toBeDefined()
    expect(mockGroup.description).toBeDefined()
    expect(mockGroup.groupType).toBeDefined()
    expect(mockGroup.groups).toBeDefined()
    expect(Array.isArray(mockGroup.groups)).toBe(true)

    // Test that groups contains valid filter models
    mockGroup.groups.forEach(filter => {
      expect(filter.id).toBeDefined()
      expect(filter.hasEvents).toBeDefined()
      expect(filter.addEvent).toBeDefined()
      expect(filter.removeEvent).toBeDefined()
    })
  })

  it('supports group metadata updates', () => {
    const updatedGroup = {
      ...mockGroup,
      title: 'Updated Title',
      description: 'Updated Description',
      groupType: 'ANY' as const,
    }

    expect(updatedGroup.title).toBe('Updated Title')
    expect(updatedGroup.description).toBe('Updated Description')
    expect(updatedGroup.groupType).toBe('ANY')
    expect(updatedGroup.id).toBe(mockGroup.id) // ID should remain the same
  })

  it('handles empty groups', () => {
    const emptyGroup: QueryFilterGroup = {
      id: 'empty_group',
      title: 'Empty Group',
      description: 'No filters',
      groupType: 'ALL',
      groups: [],
    }

    expect(emptyGroup.groups).toHaveLength(0)
    expect(Array.isArray(emptyGroup.groups)).toBe(true)
  })

  it('supports filter operations within group', () => {
    const initialCount = mockGroup.groups.length

    // Add a new filter
    const newFilter = new QueryFilterCardModel({
      id: 'new_filter',
      title: 'New Filter',
      type: 'inclusion',
    })
    mockGroup.groups.push(newFilter)

    expect(mockGroup.groups.length).toBe(initialCount + 1)
    expect(mockGroup.groups[mockGroup.groups.length - 1]).toBe(newFilter)

    // Remove the filter
    const removeIndex = mockGroup.groups.findIndex(f => f.id === 'new_filter')
    mockGroup.groups.splice(removeIndex, 1)

    expect(mockGroup.groups.length).toBe(initialCount)
  })

  it('maintains group type consistency', () => {
    const validGroupTypes = ['ALL', 'ANY', 'AT_LEAST', 'AT_MOST'] as const

    validGroupTypes.forEach(groupType => {
      const testGroup = { ...mockGroup, groupType }
      expect(testGroup.groupType).toBe(groupType)
    })
  })

  it('preserves filter relationships', () => {
    // Add events to the filter
    const filter = mockGroup.groups[0]
    const event1 = filter.addEvent({ conceptSet: 'Event 1' })
    const event2 = filter.addEvent({ conceptSet: 'Event 2' })

    expect(filter.events).toHaveLength(2)
    expect(filter.events[0].conceptSet).toBe('Event 1')
    expect(filter.events[1].conceptSet).toBe('Event 2')

    // Verify the filter is still part of the group
    expect(mockGroup.events[0]).toBeDefined()
    expect(mockGroup.events).toHaveLength(1)
  })
})
