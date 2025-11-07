import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import filterCardCount from '../FilterCardCount.vue'

describe('FilterCardCount.vue', () => {
  let store
  let getters

  beforeEach(() => {
    getters = {
      getFilterCardCount: () => type => 2,
      getText: () => text => 'ABC',
    }
    store = createStore({
      getters,
      state: {},
    })
  })

  it('renders a label', () => {
    const wrapper = shallowMount(filterCardCount as any, {
      global: {
        plugins: [store],
      },
      props: {
        type: 'matchall',
      },
    })
    expect(wrapper.findAll('label')).toHaveLength(1)
    expect(wrapper.find('span').text()).toEqual(getters.getFilterCardCount()('matchall').toString())
  })
})
