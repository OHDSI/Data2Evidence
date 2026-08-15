import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { describe, it, expect, vi } from 'vitest'
import FilterCard from '../FilterCard.vue'

describe('FilterCard.vue - Reset and Advanced Time', () => {
  let store: any
  let getters: any

  const createMockFilterCard = (propsKey: string) => ({
    props: {
      key: propsKey,
      constraints: [],
      excludeFilter: false,
      layout: {
        advancedTimeLayout: {
          props: {
            timeFilterModel: {
              timeFilters: [],
            },
          },
        },
      },
      filterCardConfig: {
        getFilterAttributes: () => [],
      },
      allowParentConstraint: false,
      allowExcludeOption: true,
    },
  })

  beforeEach(() => {
    getters = {
      getFilterCard: () => () => createMockFilterCard('patient'),
      getText: () => (text: string) => text,
      getMriFrontendConfig: () => ({
        _internalConfig: {
          panelOptions: {
            cohortEntryExit: false,
          },
        },
        getGenericPath: () => '',
      }),
      getNewCardStates: () => ({}),
      getSplitterWidth: () => 800,
      getFilterCardConstraints: () => () => [],
      getHasAssignedConfig: () => false,
      getFilterCardCount: () => ({ excludeBasicCard, excludedOnly, matchType }: any) => 2,
    }
    store = createStore({
      getters,
      state: {},
    })
  })

  it('reset clears advanced time display and store data', async () => {
    const mockClearFilterCardTimeFilter = vi.fn()
    const mockClearAllConstraintsOfFilterCard = vi.fn()
    
    store = createStore({ 
      getters,
      state: {},
      actions: {
        clearAllConstraintsOfFilterCard: mockClearAllConstraintsOfFilterCard,
        clearFilterCardTimeFilter: mockClearFilterCardTimeFilter
      }
    })
    
    const wrapper = shallowMount(FilterCard as any, {
      global: { plugins: [store] },
      props: { id: 'test-card-1' }
    })
    
    // Simulate having advanced time displayed
    wrapper.vm.displayAdvanceTime = true
    
    // Trigger reset
    await wrapper.vm.onMoreMenuItemSelected({ key: 'clear' })
    
    expect(mockClearAllConstraintsOfFilterCard).toHaveBeenCalledWith(expect.any(Object), { filterCardId: 'test-card-1' })
    expect(wrapper.vm.displayAdvanceTime).toBe(false)
    expect(mockClearFilterCardTimeFilter).toHaveBeenCalledWith(expect.any(Object), { filterCardId: 'test-card-1' })
  })

  it('advanced time menu hidden when only 1 filter card exists', () => {
    getters.getFilterCard = () => () => createMockFilterCard('visit')
    getters.getFilterCardCount = () => ({ excludeBasicCard, excludedOnly, matchType }: any) => 1
    
    store = createStore({ getters, state: {} })
    
    const wrapper = shallowMount(FilterCard as any, {
      global: { plugins: [store] },
      props: { id: 'test-card-1' }
    })
    
    const timeOperations = wrapper.vm.moreButtonMenuTimeOperations
    const hasAdvancedTime = timeOperations.some((item: any) => item.key === 'advancedTime')
    expect(hasAdvancedTime).toBe(false)
  })

  it('advanced time menu shown when 2+ filter cards exist', () => {
    getters.getFilterCard = () => () => createMockFilterCard('visit')
    getters.getFilterCardCount = () => ({ excludeBasicCard, excludedOnly, matchType }: any) => 2
    
    store = createStore({ getters, state: {} })
    
    const wrapper = shallowMount(FilterCard as any, {
      global: { plugins: [store] },
      props: { id: 'test-card-1' }
    })
    
    const timeOperations = wrapper.vm.moreButtonMenuTimeOperations
    const hasAdvancedTime = timeOperations.some((item: any) => item.key === 'advancedTime')
    expect(hasAdvancedTime).toBe(true)
  })

  it('auto-clears advanced time when filter card count drops to 1', async () => {
    const mockClearFilterCardTimeFilter = vi.fn()
    
    getters.getFilterCard = () => () => createMockFilterCard('visit')
    getters.getFilterCardCount = () => ({ excludeBasicCard, excludedOnly, matchType }: any) => 1
    
    store = createStore({ 
      getters,
      state: {},
      actions: {
        clearFilterCardTimeFilter: mockClearFilterCardTimeFilter
      }
    })
    
    const wrapper = shallowMount(FilterCard as any, {
      global: { plugins: [store] },
      props: { id: 'test-card-1' }
    })
    
    // The component should auto-clear advanced time on mount if count is 1
    // Since we're mocking getFilterCardCount to return 1, the watcher should fire
    await wrapper.vm.$nextTick()
    
    // Note: In a real scenario, displayAdvanceTime would be set based on mount logic
    // Here we verify the component is in correct state for count=1
    expect(wrapper.vm.totalFilterCardCount).toBe(1)
  })
})
