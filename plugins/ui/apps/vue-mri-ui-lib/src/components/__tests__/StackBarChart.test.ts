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
  dataToTraces:
    () =>
    (chartData, selection = []) => ({
      ...chartData,
      traces: (chartData.traces || []).map((trace, index) => ({
        ...trace,
        selectedpoints: selection && index in selection ? selection[index] : [],
      })),
    }),
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
  getChartSize: () => ({}),
  getCsvFireDownload: () => false,
  getText: () => (key: string) => key,
  getFireRequest: () => false,
  isFireRequestHeld: () => false,
  getHasAssignedConfig: () => false,
  getBookmarksData: () => ({}),
  getChartableFilterCardByInstanceId: () => () => ({ name: 'Card' }),
  sortProperty: () => ({ props: { value: null } }),
  processResponse: () => chartData => chartData,
  getChartProperty: () => () => ({ props: { active: true } }),
  getAllAxes: () => [],
  getBarChartType: () => 'stack',
  getShowDistributionOverlay: () => false,
}

const getLastSelectionPayload = () => selectionAction.mock.calls.at(-1)?.[1]

describe('StackBarChart selection handling', () => {
  const mountComponent = (barDisplayMode = 'stack', showDistributionOverlay = false) => {
    const customGetters = {
      ...getters,
      getBarChartType: () => barDisplayMode,
      getShowDistributionOverlay: () => showDistributionOverlay,
    }
    const store = createStore({ actions, getters: customGetters })
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

    // selectionUpdate now reads from the eventData payload, not from
    // trace.selectedpoints on the canonical traces.
    handlers.plotly_selected({ points: [{ curveNumber: 0, pointIndex: 0 }] })
    const firstSelection = getLastSelectionPayload()
    expect(firstSelection.selection).toEqual([
      { id: 'cat.id', value: 'Alpha' },
      { id: 'grp.id', value: 'Group One' },
    ])

    handlers.plotly_deselect()
    const afterDeselect = getLastSelectionPayload()
    expect(afterDeselect.selection).toEqual([])
    // Plotly.react is called by clearSelectionState (deselect), not by the selection handler.
    expect(Plotly.react).toHaveBeenCalled()

    handlers.plotly_selected({ points: [{ curveNumber: 0, pointIndex: 1 }] })
    const secondSelection = getLastSelectionPayload()
    expect(secondSelection.selection).toEqual([
      { id: 'cat.id', value: 'Beta' },
      { id: 'grp.id', value: 'Group One' },
    ])
  })

  it('resets to default state when plotly_selected has no selected points', async () => {
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
          selectedpoints: [],
          x: ['Alpha'],
          customdata: [{ x: [{ id: 'cat.id' }], y: [{ id: 'grp.id' }], values: ['Alpha'] }],
        },
      ],
      tickvals: ['Alpha'],
      ticktext: ['Alpha'],
      ticktextFull: ['Alpha'],
    }
    ;(wrapper.vm as any).setupPlotly()

    handlers.plotly_selected()

    const afterEmptySelection = getLastSelectionPayload()
    expect(afterEmptySelection.selection).toEqual([])
    expect(Plotly.react).toHaveBeenCalled()
    const reactTraces = (Plotly.react as any).mock.calls.at(-1)?.[1]
    expect(reactTraces[0].selectedpoints).toBeNull()
  })

  it('uses relayout only on reset when no active selection exists', async () => {
    const wrapper = mountComponent()

    const fakePlotElement = { id: 'plot' }
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [{}],
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

  it('clears visual selection state with null selectedpoints on reset', async () => {
    const wrapper = mountComponent()

    const fakePlotElement = { id: 'plot' }
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [
        {
          selectedpoints: [0],
          x: ['A'],
          customdata: [{ x: [{ id: 'cat.id' }], y: [] }],
        },
      ],
      tickvals: ['A'],
      ticktext: ['A'],
      ticktextFull: ['A'],
    }
    ;(wrapper.vm as any).config.modeBarButtons[0][0].click(fakePlotElement)

    expect(Plotly.react).toHaveBeenCalled()
    const reactTraces = (Plotly.react as any).mock.calls.at(-1)?.[1]
    expect(reactTraces[0].selectedpoints).toBeNull()
  })

  it('uses label aliases for truncation without forcing manual ticks', async () => {
    const wrapper = mountComponent()

    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [],
      tickvals: ['Very Long Label A', 'Very Long Label B'],
      ticktext: ['Very Long...', 'Very Long...'],
      ticktextFull: ['Very Long Label A', 'Very Long Label B'],
    }

    const layout = (wrapper.vm as any).buildPlotlyLayout()

    expect(layout.xaxis.tickvals).toBeUndefined()
    expect(layout.xaxis.ticktext).toBeUndefined()
    expect(layout.xaxis.labelalias).toEqual({
      'Very Long Label A': 'Very Long...',
      'Very Long Label B': 'Very Long...',
    })
  })

  const wireSelectionHandlers = (wrapper: ReturnType<typeof shallowMount>) => {
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
    return { handlers, fakePlotElement }
  }

  const lastReactArgs = () => (Plotly.react as any).mock.calls.at(-1)

  it('preserves overlay barmode and trace opacity through selection', async () => {
    const wrapper = mountComponent('overlay')
    const { handlers } = wireSelectionHandlers(wrapper)
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [
        {
          name: 'A',
          meta: { fullName: 'A' },
          selectedpoints: [0],
          x: ['Alpha'],
          customdata: [{ x: [{ id: 'cat.id' }], y: [], values: ['Alpha'] }],
        },
      ],
    }
    ;(wrapper.vm as any).setupPlotly()

    handlers.plotly_selected()

    const [, traces, layout] = lastReactArgs()
    expect(layout.barmode).toBe('overlay')
    expect(layout.bargap).toBe(0)
    expect(traces[0].marker.opacity).toBe(0.3)
  })

  it('preserves partialOverlaySolid mode through selection with multiple traces', async () => {
    const wrapper = mountComponent('partialOverlaySolid')
    const { handlers } = wireSelectionHandlers(wrapper)
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [
        {
          name: 'A',
          meta: { fullName: 'A' },
          selectedpoints: [0],
          x: ['Alpha'],
          customdata: [{ x: [{ id: 'cat.id' }], y: [], values: ['Alpha'] }],
        },
        {
          name: 'B',
          meta: { fullName: 'B' },
          selectedpoints: [],
          x: ['Alpha'],
          customdata: [{ x: [{ id: 'cat.id' }], y: [], values: ['Alpha'] }],
        },
      ],
    }
    ;(wrapper.vm as any).setupPlotly()

    handlers.plotly_selected()

    const [, traces, layout] = lastReactArgs()
    expect(layout.barmode).toBe('overlay')
    expect(traces[0].width).toBeGreaterThan(0)
    expect(typeof traces[0].offset).toBe('number')
    expect(traces[1].width).toBeGreaterThan(0)
    expect(typeof traces[1].offset).toBe('number')
    expect(traces[0].offset).not.toBe(traces[1].offset)
  })

  it('preserves overlay barmode through clearSelectionState with active selection', async () => {
    const wrapper = mountComponent('overlay')
    const fakePlotElement = { id: 'plot' }
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [
        {
          selectedpoints: [0],
          x: ['A'],
          customdata: [{ x: [{ id: 'cat.id' }], y: [] }],
        },
      ],
    }
    ;(wrapper.vm as any).clearSelectionState({ plotElement: fakePlotElement, resetAxes: true })

    const [, traces, layout] = lastReactArgs()
    expect(layout.barmode).toBe('overlay')
    expect(traces[0].marker.opacity).toBe(0.3)
  })

  it('sets y-axis title to selected measure name in non-KDP modes', async () => {
    const wrapper = mountComponent('stack')
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [],
      measures: [{ id: 'patient.attributes.pcount', name: 'Patient Count' }],
    }

    expect((wrapper.vm as any).yAxisTitle).toBe('Patient Count')
    const layout = (wrapper.vm as any).buildPlotlyLayout()
    expect(layout.yaxis.title).toEqual({ text: 'Patient Count' })
  })

  it('sets y-axis title to the density translation key when bar display mode is KDP', async () => {
    const wrapper = mountComponent('distribution')
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [],
      measures: [{ id: 'patient.attributes.pcount', name: 'Patient Count' }],
    }

    expect((wrapper.vm as any).yAxisTitle).toBe('MRI_PA_CHART_YAXIS_DENSITY')
    const layout = (wrapper.vm as any).buildPlotlyLayout()
    expect(layout.yaxis.title).toEqual({ text: 'MRI_PA_CHART_YAXIS_DENSITY' })
  })

  it('falls back to measure name in KDP mode when there is only one bin', async () => {
    const wrapper = mountComponent('distribution')
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [{ x: ['A'], y: [5] }],
      measures: [{ id: 'patient.attributes.pcount', name: 'Patient Count' }],
    }

    expect((wrapper.vm as any).yAxisTitle).toBe('Patient Count')
    const layout = (wrapper.vm as any).buildPlotlyLayout()
    expect(layout.yaxis.title).toEqual({ text: 'Patient Count' })
  })

  it('falls back to empty y-axis title when no measure is available', async () => {
    const wrapper = mountComponent('stack')
    ;(wrapper.vm as any).chartData = {
      axisType: 'category',
      traces: [],
    }

    expect((wrapper.vm as any).yAxisTitle).toBe('')
    const layout = (wrapper.vm as any).buildPlotlyLayout()
    expect(layout.yaxis.title).toEqual({ text: '' })
  })
})
