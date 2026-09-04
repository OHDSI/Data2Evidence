import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChartController from '../ChartController.vue'
import OverlappingHistogramIcon from '../icons/OverlappingHistogramIcon.vue'

const actions = {
  setFireRequest: vi.fn(),
  setKMDisplayInfo: vi.fn(),
  clearAxisValue: vi.fn(),
}

const buildStore = (datasetReloadInProgress: boolean, barChartType = 'stack') =>
  createStore({
    getters: {
      getActiveChart: () => 'stacked',
      getAllAxes: () => [],
      getAllChartProperties: () => () => ({}),
      getAllChartConfigs: () => ({}),
      getMriFrontendConfig: () => ({
        _internalConfig: {
          panelOptions: {},
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
      getChartCover: () => false,
      getChartSelection: () => () => [],
      getKMDisplayInfo: () => ({}),
      getActiveBookmark: () => null,
      getDatasetReloadInProgress: () => datasetReloadInProgress,
      getBarChartType: () => barChartType,
    },
    actions,
  })

const mountComponent = (datasetReloadInProgress: boolean, barChartType = 'stack') =>
  shallowMount(ChartController as any, {
    props: {
      chartBusy: true,
      shouldRerenderChart: false,
      showLeftPane: true,
    },
    global: {
      plugins: [buildStore(datasetReloadInProgress, barChartType)],
      stubs: {
        stackBarChart: true,
        patientListContainer: true,
        axisMenuButton: true,
        xAxisColorButton: true,
        sortMenuButton: true,
        cohortEntryExit: true,
        messageBox: true,
        appButton: true,
      },
    },
  })

const buildColorAxisStore = (axes: any[], colorAxisIndex: number | null, colorActions: any) =>
  createStore({
    state: { axes },
    getters: {
      getActiveChart: () => 'stacked',
      getAllAxes: (state: any) => state.axes,
      getAllChartProperties: () => () => ({}),
      getAllChartConfigs: () => ({}),
      getMriFrontendConfig: () => ({ _internalConfig: { panelOptions: {} } }),
      getText: () => (key: string) => key,
      getChartCover: () => false,
      getChartSelection: () => () => [],
      getKMDisplayInfo: () => ({}),
      getActiveBookmark: () => null,
      getDatasetReloadInProgress: () => false,
      getBarChartType: () => 'stack',
      getColorAxisIndex: () => colorAxisIndex,
      getCurrentPatientCount: () => 100,
    },
    actions: { ...actions, ...colorActions },
  })

const emptyAxes = () => [{ props: {} }, { props: {} }, { props: {} }, { props: {} }, { props: {} }]

const mountForColorAxis = (axes: any[], colorAxisIndex: number | null = null) => {
  const colorActions = {
    setColorAxisIndex: vi.fn(),
    setDefaultColorAxisIndex: vi.fn(),
  }
  const store = buildColorAxisStore(axes, colorAxisIndex, colorActions)
  const wrapper = shallowMount(ChartController as any, {
    props: { chartBusy: false, shouldRerenderChart: false, showLeftPane: true },
    global: {
      plugins: [store],
      stubs: {
        stackBarChart: true,
        patientListContainer: true,
        axisMenuButton: true,
        xAxisColorButton: true,
        sortMenuButton: true,
        cohortEntryExit: true,
        messageBox: true,
        appButton: true,
      },
    },
  })
  return { wrapper, store, colorActions }
}

describe('ChartController default color axis selection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('colors by the x axis with the fewest categories when at or below the limit', async () => {
    const axes = emptyAxes()
    axes[0].props = { attributeId: 'patient.attributes.gender' }
    axes[1].props = { attributeId: 'patient.attributes.region' }
    const { wrapper, colorActions } = mountForColorAxis(axes)
    ;(wrapper.vm as any).onChartDataReady([
      { axisIndex: 0, count: 12 },
      { axisIndex: 1, count: 3 },
    ])
    await wrapper.vm.$nextTick()

    expect(colorActions.setDefaultColorAxisIndex).toHaveBeenCalledWith(expect.anything(), 1)
  })

  it('does not color when every x axis exceeds the category limit', async () => {
    const axes = emptyAxes()
    axes[0].props = { attributeId: 'patient.attributes.gender' }
    const { wrapper, colorActions } = mountForColorAxis(axes)
    ;(wrapper.vm as any).onChartDataReady([{ axisIndex: 0, count: 12 }])
    await wrapper.vm.$nextTick()

    expect(colorActions.setDefaultColorAxisIndex).not.toHaveBeenCalled()
  })

  it('does not color an axis slot that holds no attribute', async () => {
    const { wrapper, colorActions } = mountForColorAxis(emptyAxes())
    ;(wrapper.vm as any).onChartDataReady([{ axisIndex: 0, count: 1 }])
    await wrapper.vm.$nextTick()

    expect(colorActions.setDefaultColorAxisIndex).not.toHaveBeenCalled()
  })

  it('does not color when the axis attribute changed before the deferred commit', async () => {
    const axes = emptyAxes()
    axes[0].props = { attributeId: 'patient.attributes.gender' }
    const { wrapper, store, colorActions } = mountForColorAxis(axes)
    ;(wrapper.vm as any).onChartDataReady([{ axisIndex: 0, count: 2 }])
    // User repoints X1 at a different attribute while the commit is still queued.
    store.state.axes = [{ props: { attributeId: 'patient.attributes.condition' } }, ...emptyAxes().slice(1)]
    await wrapper.vm.$nextTick()

    expect(colorActions.setDefaultColorAxisIndex).not.toHaveBeenCalled()
  })

  it('never overrides an existing color axis selection', async () => {
    const axes = emptyAxes()
    axes[0].props = { attributeId: 'patient.attributes.gender' }
    const { wrapper, colorActions } = mountForColorAxis(axes, 1)
    ;(wrapper.vm as any).onChartDataReady([{ axisIndex: 0, count: 2 }])
    await wrapper.vm.$nextTick()

    expect(colorActions.setDefaultColorAxisIndex).not.toHaveBeenCalled()
  })

  it('auto-selects at most once per cohort', async () => {
    const axes = emptyAxes()
    axes[0].props = { attributeId: 'patient.attributes.gender' }
    const { wrapper, colorActions } = mountForColorAxis(axes)
    ;(wrapper.vm as any).onChartDataReady([{ axisIndex: 0, count: 12 }])
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as any).onChartDataReady([{ axisIndex: 0, count: 2 }])
    await wrapper.vm.$nextTick()

    expect(colorActions.setDefaultColorAxisIndex).not.toHaveBeenCalled()
  })

  it('keeps the one-shot unspent when a response carries no eligible x axis', async () => {
    const axes = emptyAxes()
    axes[0].props = { attributeId: 'patient.attributes.gender' }
    const { wrapper, colorActions } = mountForColorAxis(axes)
    // Chart rendered without an x axis: the emit carries no eligible categories at all.
    ;(wrapper.vm as any).onChartDataReady([])
    await wrapper.vm.$nextTick()
    ;(wrapper.vm as any).onChartDataReady([{ axisIndex: 0, count: 2 }])
    await wrapper.vm.$nextTick()

    expect(colorActions.setDefaultColorAxisIndex).toHaveBeenCalledWith(expect.anything(), 0)
  })
})

describe('ChartController loading precedence', () => {
  it('hides chart loading animation when dataset reload is in progress', () => {
    const wrapper = mountComponent(true)

    expect((wrapper.vm as any).showChartLoadingAnimation).toBe(false)
  })

  it('shows chart loading animation when dataset reload is not in progress', () => {
    const wrapper = mountComponent(false)

    expect((wrapper.vm as any).showChartLoadingAnimation).toBe(true)
  })
})

describe('ChartController stack attribute icon', () => {
  it('keeps the icon-font glyph while the stacked bar chart is selected', () => {
    const wrapper = mountComponent(false, 'stack')

    expect((wrapper.vm as any).stackAttributeIconComponent).toBeNull()
  })

  it.each(['overlay', 'partialOverlaySolid', 'distribution'])(
    'uses the overlapping histogram icon for the %s chart type',
    chartType => {
      const wrapper = mountComponent(false, chartType)

      expect((wrapper.vm as any).stackAttributeIconComponent).toBe(OverlappingHistogramIcon)
    }
  )

  it('falls back to the icon-font glyph when the selected chart type is disabled by config', () => {
    const wrapper = shallowMount(ChartController as any, {
      props: { chartBusy: true, shouldRerenderChart: false, showLeftPane: true },
      global: {
        plugins: [
          createStore({
            getters: {
              getActiveChart: () => 'stacked',
              getAllAxes: () => [],
              getAllChartProperties: () => () => ({}),
              getAllChartConfigs: () => ({}),
              getMriFrontendConfig: () => ({
                _internalConfig: { panelOptions: {}, chartOptions: { stacked: {} } },
              }),
              getText: () => (key: string) => key,
              getChartCover: () => false,
              getChartSelection: () => () => [],
              getKMDisplayInfo: () => ({}),
              getActiveBookmark: () => null,
              getDatasetReloadInProgress: () => false,
              getBarChartType: () => 'overlay',
            },
            actions,
          }),
        ],
        stubs: {
          stackBarChart: true,
          patientListContainer: true,
          axisMenuButton: true,
          xAxisColorButton: true,
          sortMenuButton: true,
          cohortEntryExit: true,
          messageBox: true,
          appButton: true,
        },
      },
    })

    expect((wrapper.vm as any).stackAttributeIconComponent).toBeNull()
  })
})
