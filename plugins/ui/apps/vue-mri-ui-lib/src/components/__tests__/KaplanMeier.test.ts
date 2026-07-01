import { vi } from 'vitest'
import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import km from '../KaplanMeier.vue'
import mouseScroll from '@/directives/mouseScroll'

describe('KaplanMeier.vue', () => {
  let store
  let actions
  let getters

  beforeEach(() => {
    actions = {
      disableAllAxesandProperties: vi.fn(),
      setAxisValue: vi.fn(),
      setFireRequest: vi.fn(),
      setChartPropertyValue: vi.fn(),
    }
    getters = {
      getKMDisplayInfo: () => () => {
        return { censoring: true, errorlines: 1 }
      },
      getText: (modulestate, modulegetters) => (key, param) => {
        return key
      },
      getSplitterWidth: () => {
        return {}
      },
      getChartSize: () => {
        return {}
      },
      getCsvFireDownload: () => {
        return {}
      },
      getFireRequest: () => {
        return {}
      },
    }
    store = createStore({
      actions,
      getters,
    })
  })

  it('sets the correct default data', () => {
    const wrapper = shallowMount(km as any, {
      global: {
        plugins: [store],
        directives: { 'mouse-scroll': mouseScroll },
      },
    })
    const defaultData = wrapper.vm.$data
    expect(defaultData).toMatchSnapshot()
  })
})
