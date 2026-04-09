import { shallowMount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createStore } from 'vuex'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import StackBarChart from '../StackBarChart.vue'
import Plotly from '../../lib/CustomPlotly'

vi.mock('../../lib/CustomPlotly', () => ({
  default: {
    newPlot: vi.fn(),
    react: vi.fn(),
    relayout: vi.fn(),
    update: vi.fn(),
    purge: vi.fn(),
    Plots: {
      resize: vi.fn(),
    },
  },
}))

const selectionAction = vi.fn()
const actions = {
  setAxisValue: vi.fn(),
  setChartPropertyValue: vi.fn(),
  fireQuery: vi.fn(),
  disableAllAxesandProperties: vi.fn(),
  setChartSelection: selectionAction,
  setPdfChartReady: vi.fn(),
  downloadCSV: vi.fn(),
  setCurrentPatientCount: vi.fn(),
  setFireRequest: vi.fn(),
  completeDownloadCSV: vi.fn(),
  setAlertMessage: vi.fn(),
  setPlotlyElement: vi.fn(),
}

const getters = {
  dataToTraces: () => (chartData, selection = []) => ({
    ...chartData,
    traces: (chartData.traces || []).map((trace, index) => ({
      ...trace,
      selectedpoints: selection[index] || [],
    })),
  }),
  getMriFrontendConfig: () => ({}),
  getChartSize: () => ({}),
  getCsvFireDownload: () => false,
  getText: () => (key: string) => key,
  getFireRequest: () => false,
  isFireRequestHeld: () => false,
  getHasAssignedConfig: () => false,
  getBookmarksData: () => ({}),
  getChartableFilterCardByInstanceId: () => () => ({ name: 'Card' }),
  sortProperty: () => ({ props: { value: null } }),
  processResponse: () => (chartData => chartData),
  getChartProperty: () => () => ({ props: { active: true } }),
}

const getLastSelectionPayload = () => selectionAction.mock.calls.at(-1)?.[1]

describe('StackBarChart selection handling', () => {
  const mountComponent = () => {
    const store = createStore({ actions, getters })
    const pinia = createPinia()

    return shallowMount(StackBarChart as any, {
      global: { plugins: [store, pinia] },
      props: { busyEv: false, shouldRerenderChart: false },
    })
  }

  beforeEach(() => {
    vi.clearAllMocks()
    ;(globalThis as any).ResizeObserver = class {
      observe() {}
      disconnect() {}
    }
  })

  it('uses shared clearSelectionState from reset button', async () => {
    const wrapper = mountComponent()

    const clearSelectionSpy = vi.spyOn(wrapper.vm as any, 'clearSelectionState')
    const fakePlotElement = { id: 'plot' }
    ;(wrapper.vm as any).config.modeBarButtons[0][0].click(fakePlotElement)

    expect(clearSelectionSpy).toHaveBeenCalledWith({ plotElement: fakePlotElement, resetAxes: true })
  })

  it('captures selection after deselect and clears drilldown state', async () => {
    const wrapper = mountComponent()

    const handlers: Record<string, () => void> = {}
    const fakePlotElement = {
      clientWidth: 800,
      on: vi.fn((event: string, cb: () => void) => {
        handlers[event] = cb
      }),
    }

    Object.defineProperty((wrapper.vm as any).$el, 'querySelector', {
      value: vi.fn(() => fakePlotElement),
    })

    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [
        {
          name: 'Group One',
          meta: { fullName: 'Group One' },
          selectedpoints: [0],
          x: ['Alpha', 'Beta'],
          customdata: [
            { x: [{ id: 'cat.id' }], y: [{ id: 'grp.id' }], values: ['Alpha'] },
            { x: [{ id: 'cat.id' }], y: [{ id: 'grp.id' }], values: ['Beta'] },
          ],
        },
      ],
      tickvals: ['Alpha', 'Beta'],
      ticktext: ['Alpha', 'Beta'],
      ticktextFull: ['Alpha', 'Beta'],
    }

    ;(wrapper.vm as any).setupPlotly()

    handlers.plotly_selected()
    const firstSelection = getLastSelectionPayload()
    expect(firstSelection.selection).toEqual([
      { id: 'cat.id', value: 'Alpha' },
      { id: 'grp.id', value: 'Group One' },
    ])

    handlers.plotly_deselect()
    const afterDeselect = getLastSelectionPayload()
    expect(afterDeselect.selection).toEqual([])

    ;(wrapper.vm as any).chartData.traces[0].selectedpoints = [1]
    handlers.plotly_selected()
    const secondSelection = getLastSelectionPayload()
    expect(secondSelection.selection).toEqual([
      { id: 'cat.id', value: 'Beta' },
      { id: 'grp.id', value: 'Group One' },
    ])

    expect(Plotly.react).toHaveBeenCalled()
  })

  it('uses relayout only on reset when no active selection exists', async () => {
    const wrapper = mountComponent()

    const fakePlotElement = { id: 'plot' }
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [
        {
          selectedpoints: [],
        },
      ],
      tickvals: ['A'],
      ticktext: ['A'],
      ticktextFull: ['A'],
    }

    ;(wrapper.vm as any).clearSelectionState({ plotElement: fakePlotElement, resetAxes: true })

    expect(Plotly.relayout).toHaveBeenCalledWith(fakePlotElement, {
      'xaxis.autorange': true,
      'yaxis.autorange': true,
    })
    expect(Plotly.react).not.toHaveBeenCalled()
  })
})
