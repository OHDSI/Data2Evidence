import { mount } from '@vue/test-utils'
import { createStore } from 'vuex'
import axisMenuButton from '@/components/AxisMenuButton.vue'
import clickFocus from '@/directives/clickFocus'
jest.mock('popper.js', () => {
  const PopperJS = jest.requireActual('popper.js')

  return class {
    public static placements = PopperJS.placements

    constructor() {
      return {
        // tslint:disable-next-line:no-empty
        destroy: () => {},
        // tslint:disable-next-line:no-empty
        scheduleUpdate: () => {},
        // tslint:disable-next-line:no-empty
        update: () => {},
      }
    }
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
