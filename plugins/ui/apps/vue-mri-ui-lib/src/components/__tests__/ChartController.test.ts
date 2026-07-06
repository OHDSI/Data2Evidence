import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { describe, expect, it, vi } from 'vitest'
import ChartController from '../ChartController.vue'

const actions = {
  setFireRequest: vi.fn(),
  setKMDisplayInfo: vi.fn(),
  clearAxisValue: vi.fn(),
}

const buildStore = (datasetReloadInProgress: boolean) =>
  createStore({
    getters: {
      getActiveChart: () => 'stacked',
      getAllAxes: () => [],
      getAllChartProperties: () => () => ({}),
      getAllChartConfigs: () => ({}),
      getMriFrontendConfig: () => ({ _internalConfig: { panelOptions: {} } }),
      getText: () => (key: string) => key,
      getChartCover: () => false,
      getChartSelection: () => () => [],
      getKMDisplayInfo: () => ({}),
      getActiveBookmark: () => null,
      getDatasetReloadInProgress: () => datasetReloadInProgress,
    },
    actions,
  })

const mountComponent = (datasetReloadInProgress: boolean) =>
  shallowMount(ChartController as any, {
    props: {
      chartBusy: true,
      shouldRerenderChart: false,
      showLeftPane: true,
    },
    global: {
      plugins: [buildStore(datasetReloadInProgress)],
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
