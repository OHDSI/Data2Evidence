import { vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import axisMenuButton from '@/components/AxisMenuButton.vue'
import OverlappingHistogramIcon from '@/components/icons/OverlappingHistogramIcon.vue'
import clickFocus from '@/directives/clickFocus'
import * as PopperJS from 'popper.js'

vi.mock('popper.js', async importOriginal => {
  const actual = await importOriginal<typeof PopperJS>()

  return {
    default: class {
      public static placements = actual.default?.placements || []

      constructor() {
        return {
          destroy: () => {},
          scheduleUpdate: () => {},
          update: () => {},
        }
      }
    },
  }
})

describe('AxisMenuButton', () => {
  let store
  let getters

  beforeEach(() => {
    getters = {
      getMriFrontendConfig: () => null,
      getChartableFilterCards: (modulestate, moduleGetters) => {
        return []
      },
      getAxis: () => dimensionIndex => 1,
      getAllAxes: () => [],
      getText: () => text => 'ABC',
    }
    store = createStore({
      getters,
      state: {
        axisDisplay: true,
      },
    })
  })

  const mountButton = (props = {}) =>
    mount(axisMenuButton as any, {
      props,
      global: {
        plugins: [store],
        directives: { 'click-focus': clickFocus },
      },
    })

  it('renders the Button that has axisMenuButton class', () => {
    const wrapper = mountButton()
    expect(wrapper.get('button'))
  })

  it('renders the icon-font glyph when no icon component is given', () => {
    const wrapper = mountButton()

    expect(wrapper.findComponent(OverlappingHistogramIcon).exists()).toBe(false)
    expect(wrapper.find('.iconLabel span.icon').exists()).toBe(true)
  })

  it('renders the given icon component instead of the icon-font glyph', () => {
    const wrapper = mountButton({ iconComponent: OverlappingHistogramIcon })

    expect(wrapper.findComponent(OverlappingHistogramIcon).exists()).toBe(true)
    expect(wrapper.find('.iconLabel span.icon').exists()).toBe(false)
  })
})
