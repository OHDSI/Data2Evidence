import { vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import axisMenuButton from '@/components/AxisMenuButton.vue'
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

  it('renders the Button that has axisMenuButton class', () => {
    const wrapper = mount(axisMenuButton as any, {
      global: {
        plugins: [store],
        directives: { 'click-focus': clickFocus },
      },
    })
    expect(wrapper.get('button'))
  })
})
