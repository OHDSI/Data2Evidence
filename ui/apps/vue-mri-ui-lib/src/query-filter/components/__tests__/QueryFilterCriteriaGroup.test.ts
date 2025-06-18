import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import QueryFilterCriteriaGroup from '../QueryFilterCriteriaGroup.vue'
import type { QueryFilterGroup } from '../../models/QueryFilterModel'

// Mock child components
vi.mock('../QueryFilterEventContainer.vue', () => ({
  default: {
    name: 'QueryFilterEventContainer',
    props: ['events', 'parentGroup', 'conceptSets', 'conceptSetDomainValues', 'conceptSetTexts', 'readonly'],
    emits: ['update-events'],
    template: '<div class="mock-event-container">Mock Event Container</div>'
  }
}))

describe('QueryFilterCriteriaGroup', () => {
  let mockGroup: QueryFilterGroup
  
  beforeEach(() => {
    mockGroup = {
      id: 'group_1',
      title: 'Test Group',
      description: 'Test Description',
      groupType: 'ALL',
      groups: [{
        id: 'filter_1',
        title: 'Test Filter',
        type: 'inclusion',
        events: [],
        isExpanded: true,
        cardinality: { type: 'AT_LEAST', count: 1, using: 'ALL' },
        addEvent: vi.fn(),
        removeEvent: vi.fn(),
        getEvent: vi.fn(),
        hasEvent: vi.fn(),
        addChipToEvent: vi.fn(),
        toJSON: vi.fn()
      }]
    }
  })

  it('renders the component correctly', () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    expect(wrapper.find('.query-filter-criteria-group').exists()).toBe(true)
    expect(wrapper.find('.group-title-input').element.value).toBe('Test Group')
    expect(wrapper.find('.group-description-input').element.value).toBe('Test Description')
  })

  it('displays readonly content when readonly prop is true', () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: true
      }
    })

    expect(wrapper.find('.group-title-readonly').exists()).toBe(true)
    expect(wrapper.find('.group-title-input').exists()).toBe(false)
    expect(wrapper.find('.group-description-readonly').exists()).toBe(true)
    expect(wrapper.find('.group-description-input').exists()).toBe(false)
    expect(wrapper.find('.operator-readonly').exists()).toBe(true)
    expect(wrapper.find('.operator-select').exists()).toBe(false)
  })

  it('shows editable inputs when not readonly', () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    expect(wrapper.find('.group-title-input').exists()).toBe(true)
    expect(wrapper.find('.group-description-input').exists()).toBe(true)
    expect(wrapper.find('.operator-select').exists()).toBe(true)
    expect(wrapper.find('.btn-remove-group').exists()).toBe(true)
  })

  it('displays the correct operator in select', () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    const select = wrapper.find('.operator-select')
    expect(select.element.value).toBe('ALL')
  })

  it('handles title input changes', async () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    const titleInput = wrapper.find('.group-title-input')
    await titleInput.setValue('New Title')

    expect(wrapper.emitted('update-group')).toBeTruthy()
    const emittedGroup = wrapper.emitted('update-group')[0][0] as QueryFilterGroup
    expect(emittedGroup.title).toBe('New Title')
  })

  it('handles description input changes', async () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    const descInput = wrapper.find('.group-description-input')
    await descInput.setValue('New Description')

    expect(wrapper.emitted('update-group')).toBeTruthy()
    const emittedGroup = wrapper.emitted('update-group')[0][0] as QueryFilterGroup
    expect(emittedGroup.description).toBe('New Description')
  })

  it('handles operator selection changes', async () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    const select = wrapper.find('.operator-select')
    await select.setValue('ANY')

    expect(wrapper.emitted('update-group')).toBeTruthy()
    const emittedGroup = wrapper.emitted('update-group')[0][0] as QueryFilterGroup
    expect(emittedGroup.groupType).toBe('ANY')
  })

  it('shows remove group confirmation', async () => {
    // Mock window.confirm
    window.confirm = vi.fn(() => true)

    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    const removeButton = wrapper.find('.btn-remove-group')
    await removeButton.trigger('click')

    expect(window.confirm).toHaveBeenCalledWith('Are you sure you want to remove this criteria group?')
    expect(wrapper.emitted('remove-group')).toBeTruthy()
  })

  it('does not emit remove-group when confirmation is cancelled', async () => {
    // Mock window.confirm to return false
    window.confirm = vi.fn(() => false)

    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    const removeButton = wrapper.find('.btn-remove-group')
    await removeButton.trigger('click')

    expect(window.confirm).toHaveBeenCalled()
    expect(wrapper.emitted('remove-group')).toBeFalsy()
  })

  it('displays sidebar with group type', () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    const sidebarLabel = wrapper.find('.sidebar-label')
    expect(sidebarLabel.text()).toBe('ALL')
  })

  it('renders event container component', () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: false
      }
    })

    const eventContainer = wrapper.findComponent({ name: 'QueryFilterEventContainer' })
    expect(eventContainer.exists()).toBe(true)
    expect(eventContainer.props('parentGroup')).toEqual(mockGroup)
  })

  it('hides remove button when readonly', () => {
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        readonly: true
      }
    })

    expect(wrapper.find('.btn-remove-group').exists()).toBe(false)
  })

  it('passes props correctly to event container', () => {
    const conceptSets = [{ value: 'test', text: 'Test' }]
    
    const wrapper = mount(QueryFilterCriteriaGroup, {
      props: {
        group: mockGroup,
        groupIndex: 0,
        conceptSets,
        readonly: true
      }
    })

    const eventContainer = wrapper.findComponent({ name: 'QueryFilterEventContainer' })
    expect(eventContainer.props('conceptSets')).toEqual(conceptSets)
    expect(eventContainer.props('readonly')).toBe(true)
  })
})