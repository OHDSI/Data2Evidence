import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import FilterCard from '../FilterCard.vue'

describe('FilterCard.vue', () => {
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

  it('Basic filter card should not show advanced time', () => {
    getters.getFilterCard = () => () => createMockFilterCard('patient')
    store = createStore({ getters, state: {} })

    const wrapper = shallowMount(FilterCard as any, {
      global: { plugins: [store] },
      props: { id: 'test-card-1' },
    })

    const timeOperations = wrapper.vm.moreButtonMenuTimeOperations
    const hasAdvancedTime = timeOperations.some((item: any) => item.key === 'advancedTime')
    expect(hasAdvancedTime).toBe(false)
  })

  it('Non-basic filter card should show advanced time', () => {
    getters.getFilterCard = () => () => createMockFilterCard('visit')
    store = createStore({ getters, state: {} })

    const wrapper = shallowMount(FilterCard as any, {
      global: { plugins: [store] },
      props: { id: 'test-card-2' },
    })

    const timeOperations = wrapper.vm.moreButtonMenuTimeOperations
    const hasAdvancedTime = timeOperations.some((item: any) => item.key === 'advancedTime')
    expect(hasAdvancedTime).toBe(true)
  })
})
