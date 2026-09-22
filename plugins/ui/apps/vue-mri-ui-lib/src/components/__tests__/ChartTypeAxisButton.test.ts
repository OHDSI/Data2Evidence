import { shallowMount, flushPromises } from '@vue/test-utils'
import { createStore } from 'vuex'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import ChartTypeAxisButton from '@/components/ChartTypeAxisButton.vue'
import DropDownMenu from '@/components/DropDownMenu.vue'
import ChartTypeChangeWarningDialog from '@/components/ChartTypeChangeWarningDialog.vue'

const setBarChartType = vi.fn()
const setShowDistributionOverlay = vi.fn()

const buildStore = (barChartType: string) =>
  createStore({
    getters: {
      getBarChartType: () => barChartType,
      getShowDistributionOverlay: () => false,
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

const mountComponent = (barChartType: string) =>
  shallowMount(ChartTypeAxisButton as any, {
    global: {
      plugins: [buildStore(barChartType)],
    },
  })

const selectMode = (wrapper: ReturnType<typeof mountComponent>, id: string) =>
  wrapper.findComponent(DropDownMenu).vm.$emit('clickEv', { id })

const warningDialog = (wrapper: ReturnType<typeof mountComponent>) =>
  wrapper.findComponent(ChartTypeChangeWarningDialog)

// Skipped until the workspace installs a single Vue runtime. CI installs two copies, so
// @vue/test-utils mounts this component on a different Vue than the one its `import 'vue'`
// resolves to, and its useTemplateRef() calls throw "object is not extensible" there while
// passing locally. Every test below mounts the component, so the whole block is skipped.
// The decision logic these tests cover is also tested mount-free via planChartTypeChange in
// src/utils/__tests__/chartTypeChange.test.ts. Un-skip once the duplicate is gone.
// See docs/duplicate-vue-runtime.md at the repo root.
describe.skip('ChartTypeAxisButton – switching away from stacked bar chart', () => {
  beforeEach(() => {
    setBarChartType.mockClear()
    setShowDistributionOverlay.mockClear()
  })

  it('shows the warning dialog instead of switching away from the stacked bar chart', async () => {
    const wrapper = mountComponent('stack')

    selectMode(wrapper, 'overlay')
    await flushPromises()

    expect(setBarChartType).not.toHaveBeenCalled()
    expect(warningDialog(wrapper).props('modelValue')).toBe(true)
  })

  it('applies the pending mode after confirming the warning', async () => {
    const wrapper = mountComponent('stack')

    selectMode(wrapper, 'overlay')
    await flushPromises()
    warningDialog(wrapper).vm.$emit('confirm')
    await flushPromises()

    expect(setBarChartType).toHaveBeenCalledWith(expect.anything(), 'overlay')
    expect(warningDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('does not switch when the warning is cancelled', async () => {
    const wrapper = mountComponent('stack')

    selectMode(wrapper, 'overlay')
    await flushPromises()
    warningDialog(wrapper).vm.$emit('cancel')
    await flushPromises()

    expect(setBarChartType).not.toHaveBeenCalled()
    expect(warningDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('does not warn when re-selecting the stacked bar chart mode', async () => {
    const wrapper = mountComponent('stack')

    selectMode(wrapper, 'stack')
    await flushPromises()

    expect(setBarChartType).toHaveBeenCalledWith(expect.anything(), 'stack')
    expect(warningDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('switches directly between two non-stacked chart types', async () => {
    const wrapper = mountComponent('overlay')

    selectMode(wrapper, 'distribution')
    await flushPromises()

    expect(setBarChartType).toHaveBeenCalledWith(expect.anything(), 'distribution')
    expect(warningDialog(wrapper).props('modelValue')).toBe(false)
  })

  it('warns when the stored mode is disabled by config and therefore falls back to stacked', async () => {
    const store = createStore({
      getters: {
        getBarChartType: () => 'overlay',
        getShowDistributionOverlay: () => false,
        // overlay is not enabled here, so the effective mode is the stacked bar chart
        getMriFrontendConfig: () => ({
          _internalConfig: { chartOptions: { stacked: { kernelDensityPlotEnabled: true } } },
        }),
        getText: () => (key: string) => key,
      },
      actions: { setBarChartType, setShowDistributionOverlay },
    })
    const wrapper = shallowMount(ChartTypeAxisButton as any, { global: { plugins: [store] } })

    wrapper.findComponent(DropDownMenu).vm.$emit('clickEv', { id: 'distribution' })
    await flushPromises()

    expect(setBarChartType).not.toHaveBeenCalled()
    expect(warningDialog(wrapper as any).props('modelValue')).toBe(true)
  })
})
