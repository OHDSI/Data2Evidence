import { shallowMount, flushPromises } from '@vue/test-utils'
import { createStore } from 'vuex'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ChartTypeAxisButton from '@/components/ChartTypeAxisButton.vue'
import DropDownMenu from '@/components/DropDownMenu.vue'
import ChartTypeChangeWarningDialog from '@/components/ChartTypeChangeWarningDialog.vue'

const setBarChartType = vi.fn()
const setShowDistributionOverlay = vi.fn()

const buildStore = (colorAxisIndex: number | null) =>
  createStore({
    getters: {
      getBarChartType: () => 'stack',
      getShowDistributionOverlay: () => false,
      getColorAxisIndex: () => colorAxisIndex,
      getMriFrontendConfig: () => ({
        _internalConfig: {
          chartOptions: {
            stacked: {
              overlappingHistogramEnabled: true,
              overlappingBarChartEnabled: true,
              kernelDensityPlotEnabled: true,
            },
          },
        },
      }),
      getText: () => (key: string) => key,
    },
    actions: {
      setBarChartType,
      setShowDistributionOverlay,
    },
  })

const mountComponent = (colorAxisIndex: number | null) =>
  shallowMount(ChartTypeAxisButton as any, {
    global: {
      plugins: [buildStore(colorAxisIndex)],
    },
  })

const selectMode = (wrapper: ReturnType<typeof mountComponent>, id: string) =>
  wrapper.findComponent(DropDownMenu).vm.$emit('clickEv', { id })

const warningDialog = (wrapper: ReturnType<typeof mountComponent>) =>
  wrapper.findComponent(ChartTypeChangeWarningDialog)

describe('ChartTypeAxisButton – switching away from stacked bar chart', () => {
  beforeEach(() => {
    setBarChartType.mockClear()
    setShowDistributionOverlay.mockClear()
  })

  it('applies the new mode immediately when no colour axis is selected', async () => {
    const wrapper = mountComponent(null)

    selectMode(wrapper, 'overlay')
    await flushPromises()

    expect(setBarChartType).toHaveBeenCalledWith(expect.anything(), 'overlay')
    expect(warningDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('shows the warning dialog instead of switching when a colour axis is selected', async () => {
    const wrapper = mountComponent(1)

    selectMode(wrapper, 'overlay')
    await flushPromises()

    expect(setBarChartType).not.toHaveBeenCalled()
    expect(warningDialog(wrapper).props('modelValue')).toBe(true)
  })

  it('applies the pending mode after confirming the warning', async () => {
    const wrapper = mountComponent(1)

    selectMode(wrapper, 'overlay')
    await flushPromises()
    warningDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(setBarChartType).toHaveBeenCalledWith(expect.anything(), 'overlay')
    expect(warningDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('does not switch when the warning is cancelled', async () => {
    const wrapper = mountComponent(1)

    selectMode(wrapper, 'overlay')
    await flushPromises()
    warningDialog(wrapper).vm.$emit('cancel')
    await flushPromises()

    expect(setBarChartType).not.toHaveBeenCalled()
    expect(warningDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('does not warn when re-selecting the stacked bar chart mode', async () => {
    const wrapper = mountComponent(1)

    selectMode(wrapper, 'stack')
    await flushPromises()

    expect(setBarChartType).toHaveBeenCalledWith(expect.anything(), 'stack')
    expect(warningDialog(wrapper).props('modelValue')).toBe(false)
  })
})
