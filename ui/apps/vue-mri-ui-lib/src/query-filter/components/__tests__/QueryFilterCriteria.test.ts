import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import QueryFilterCriteria from '../QueryFilterCriteria.vue'
import { QueryFilterCriteriaManager } from '../../models/QueryFilterModel'

// Mock child components
vi.mock('../QueryFilterCriteriaGroup.vue', () => ({
  default: {
    name: 'QueryFilterCriteriaGroup',
    props: ['group', 'groupIndex', 'conceptSets', 'conceptSetDomainValues', 'conceptSetTexts', 'readonly'],
    emits: ['update-group', 'remove-group'],
    template: '<div class="mock-criteria-group">Mock Criteria Group {{ groupIndex }}</div>'
  }
}))

describe('QueryFilterCriteria', () => {
  let criteriaManager: QueryFilterCriteriaManager
  
  beforeEach(() => {
    // Create a basic criteria manager with sample data
    criteriaManager = new QueryFilterCriteriaManager({
      inclusionCriteria: {
        qualifyingEventsLimit: 'ALL',
        criteria: [
          {
            id: 'criteria_1',
            title: 'Test Criteria 1',
            description: 'Test description',
            criteriaType: 'ALL',
            events: []
          }
        ]
      }
    })
  })

  it('renders the component correctly', () => {
    const wrapper = mount(QueryFilterCriteria, {
      props: {
        criteriaManager,
        conceptSets: [],
        readonly: false
      }
    })

    expect(wrapper.find('.query-filter-criteria').exists()).toBe(true)
    expect(wrapper.find('.criteria-title').text()).toBe('Inclusion Criteria')
  })

  it('displays qualifying events limit controls', () => {
    const wrapper = mount(QueryFilterCriteria, {
      props: {
        criteriaManager,
        conceptSets: [],
        readonly: false
      }
    })

    const buttons = wrapper.findAll('.qualifying-events-btn')
    expect(buttons).toHaveLength(3)
    expect(buttons[0].text()).toBe('ALL')
    expect(buttons[1].text()).toBe('EARLIEST')
    expect(buttons[2].text()).toBe('LATEST')
  })

  it('highlights active qualifying events limit', () => {
    const wrapper = mount(QueryFilterCriteria, {
      props: {
        criteriaManager,
        conceptSets: [],
        readonly: false
      }
    })

    const activeButton = wrapper.find('.qualifying-events-btn--active')
    expect(activeButton.exists()).toBe(true)
    expect(activeButton.text()).toBe('ALL')
  })

  it('renders criteria groups', () => {
    const wrapper = mount(QueryFilterCriteria, {
      props: {
        criteriaManager,
        conceptSets: [],
        readonly: false
      }
    })

    const groups = wrapper.findAll('.mock-criteria-group')
    expect(groups).toHaveLength(1)
    expect(groups[0].text()).toContain('Mock Criteria Group 0')
  })

  it('shows add group button when not readonly', () => {
    const wrapper = mount(QueryFilterCriteria, {
      props: {
        criteriaManager,
        conceptSets: [],
        readonly: false
      }
    })

    const addButton = wrapper.find('.btn-add-group')
    expect(addButton.exists()).toBe(true)
    expect(addButton.text()).toContain('Add Criteria Group')
  })

  it('hides add group button when readonly', () => {
    const wrapper = mount(QueryFilterCriteria, {
      props: {
        criteriaManager,
        conceptSets: [],
        readonly: true
      }
    })

    const addButton = wrapper.find('.btn-add-group')
    expect(addButton.exists()).toBe(false)
  })

  it('handles qualifying events limit changes', async () => {
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

  it('handles adding new criteria group', async () => {
    const wrapper = mount(QueryFilterCriteria, {
      props: {
        criteriaManager,
        conceptSets: [],
        readonly: false
      }
    })

    const initialGroupCount = criteriaManager.getCriteria().criteria.length
    
    const addButton = wrapper.find('.btn-add-group')
    await addButton.trigger('click')

    expect(wrapper.emitted('criteria-updated')).toBeTruthy()
    expect(criteriaManager.getCriteria().criteria.length).toBe(initialGroupCount + 1)
  })

  it('disables controls when readonly', () => {
    const wrapper = mount(QueryFilterCriteria, {
      props: {
        criteriaManager,
        conceptSets: [],
        readonly: true
      }
    })

    const buttons = wrapper.findAll('.qualifying-events-btn')
    buttons.forEach(button => {
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.classes()).toContain('qualifying-events-btn--readonly')
    })
  })

  it('passes props correctly to child components', () => {
    const conceptSets = [{ value: 'test', text: 'Test Concept Set' }]
    const conceptSetTexts = { test: 'Test Text' }
    
    const wrapper = mount(QueryFilterCriteria, {
      props: {
        criteriaManager,
        conceptSets,
        conceptSetTexts,
        readonly: true
      }
    })

    const criteriaGroup = wrapper.findComponent({ name: 'QueryFilterCriteriaGroup' })
    expect(criteriaGroup.props('conceptSets')).toEqual(conceptSets)
    expect(criteriaGroup.props('conceptSetTexts')).toEqual(conceptSetTexts)
    expect(criteriaGroup.props('readonly')).toBe(true)
  })
})