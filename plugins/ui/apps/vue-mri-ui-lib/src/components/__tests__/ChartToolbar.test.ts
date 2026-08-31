import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import ChartToolbar from '../ChartToolbar.vue'
import ChartButton from '../ChartButton.vue'
import OverlappingHistogramIcon from '../icons/OverlappingHistogramIcon.vue'

const noop = vi.fn()

const buildStore = (barChartType: string, stackedChartOptions: Record<string, boolean> = {}) =>
  createStore({
    getters: {
      getActiveChart: () => 'stacked',
      getChartSelection: () => () => [],
      getHasAssignedConfig: () => false,
      getAllChartConfigs: () => ({ stacked: { visible: true }, list: { visible: true } }),
      getMriFrontendConfig: () => ({
        _internalConfig: { panelOptions: {}, chartOptions: { stacked: stackedChartOptions } },
      }),
      getText: () => (key: string) => key,
      getSelectedDataset: () => ({ id: 'ds-1' }),
      getActiveCohortMaterializedId: () => null,
      getActiveBookmark: () => null,
      getBookmarksData: () => ({}),
      getMaterializedCohorts: () => [],
      getBookmarks: () => [],
      getCurrentBookmarkHasChanges: () => false,
      getPLRequest: () => ({}),
      getWizardConfig: () => ({}),
      getFilterCards: () => [],
      getFilterCard: () => () => null,
      getConstraintForAttribute: () => () => null,
      getBookmarkFromIFR: () => () => null,
      getConstraint: () => () => null,
      getCanDatasetMaterializeCohorts: () => false,
      getCurrentPatientCount: () => 100,
      getBarChartType: () => barChartType,
    },
    actions: {
      setActiveChart: noop,
      setFireRequest: noop,
      toggleConfigSelectionDialog: noop,
      setDatasetVersion: noop,
      setDataset: noop,
      requestDatasetVersions: noop,
      loadValuesForAttributePath: noop,
      refreshPatientCount: noop,
      fireBookmarkQuery: noop,
      fireQuery: noop,
      onAddCohortOkButtonPress: noop,
      ajaxAuth: noop,
      addFilterCard: noop,
      addFilterCardConstraint: noop,
      updateConstraintValue: noop,
      updateDateConstraintValue: noop,
      setWizardConfig: noop,
      clearWizardConfig: noop,
      holdFireRequest: noop,
      releaseFireRequest: noop,
    },
  })

const allModesEnabled = {
  overlappingHistogramEnabled: true,
  overlappingBarChartEnabled: true,
  kernelDensityPlotEnabled: true,
}

const mountComponent = (barChartType: string, stackedChartOptions = allModesEnabled) =>
  shallowMount(ChartToolbar as any, {
    props: { showUnHideFilters: false },
    global: {
      plugins: [buildStore(barChartType, stackedChartOptions)],
      stubs: {
        teleport: true,
        // Render the popover's default slot so the chart buttons it wraps are mounted.
        DisabledHoverPopover: { template: '<div><slot /></div>' },
      },
    },
  })

describe('ChartToolbar bar chart button icon', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('keeps the icon-font glyph while the stacked bar chart mode is selected', () => {
    const wrapper = mountComponent('stack')

    expect((wrapper.vm as any).chartIconComponent({ name: 'stacked' })).toBeNull()
  })

  it.each(['overlay', 'partialOverlaySolid', 'distribution'])(
    'uses the overlapping histogram icon for the %s chart type',
    chartType => {
      const wrapper = mountComponent(chartType)

      expect((wrapper.vm as any).chartIconComponent({ name: 'stacked' })).toBe(OverlappingHistogramIcon)
    }
  )

  it('falls back to the icon-font glyph when the selected chart type is disabled by config', () => {
    const wrapper = mountComponent('overlay', {})

    expect((wrapper.vm as any).chartIconComponent({ name: 'stacked' })).toBeNull()
  })

  it('leaves every other chart button on its icon-font glyph', () => {
    const wrapper = mountComponent('overlay')

    expect((wrapper.vm as any).chartIconComponent({ name: 'list' })).toBeNull()
  })

  it('passes the icon component to the bar chart button only', async () => {
    const wrapper = mountComponent('overlay')
    // chartConfig is filled in mounted(), so the buttons only exist after a re-render.
    await wrapper.vm.$nextTick()

    const buttons = wrapper.findAllComponents(ChartButton)
    const iconComponentByName = Object.fromEntries(
      buttons.map(button => [button.props('name'), button.props('iconComponent')])
    )

    expect(iconComponentByName.stacked).toBe(OverlappingHistogramIcon)
    expect(iconComponentByName.list).toBeNull()
  })
})
