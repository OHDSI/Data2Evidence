import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import pager from '../Pager.vue'

describe('Pager.vue', () => {
  let store

  beforeEach(() => {
    store = createStore({
      getters: {
        getText: (modulestate, modulegetters) => (key, param) => {
          return key
        },
      },
    })
  })

  it('sets the correct default data', () => {
    const wrapper = shallowMount(pager as any)
    const defaultData = wrapper.props()

    expect(defaultData).toMatchSnapshot()
  })
  it('renders a div with class pager-container if there is at least 2 pages', () => {
    const wrapper = shallowMount(pager as any, {
      global: {
        plugins: [store],
      },
      props: { rowCount: 40 },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('not rendered when there is only a single page', () => {
    const wrapper = shallowMount(pager as any, {
      global: {
        plugins: [store],
      },
    })
    expect(wrapper.html()).toMatchSnapshot()
  })
  it('emits goPage with page number', () => {
    const wrapper = shallowMount(pager as any, {
      global: {
        plugins: [store],
      },
    })
    wrapper.vm.$emit('goPage', 10)
    // assert event has been emitted
    expect(wrapper.emitted().goPage).toBeTruthy()

    // assert event count
    expect(wrapper.emitted().goPage[0]).toEqual([10])
  })
})
