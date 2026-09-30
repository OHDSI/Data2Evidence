import { mount } from '@vue/test-utils'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createStore } from 'vuex'
import ImageExport from '../ImageExport.vue'

vi.mock('../../utils/saveFile', () => ({
  pickSaveTarget: vi.fn(async () => ({ kind: 'fallback', fileName: 'chart.png' })),
  writeBlobToSaveTarget: vi.fn(async () => undefined),
}))

vi.mock('../../utils/ExportUtils', () => ({
  buildXAxisTitle: vi.fn(() => ''),
  createChartCanvas: vi.fn(() => ({
    toBlob: (cb: (b: Blob) => void) => cb(new Blob(['png'], { type: 'image/png' })),
  })),
}))

const createTestStore = () =>
  createStore({
    getters: {
      getActiveChart: () => 'stacked',
      getActiveBookmark: () => null,
      getText: () => (key: string) => key,
      getResponse: () => () => ({ data: null }),
      getKMSeries: () => [],
    },
    actions: { setChartCover: () => undefined },
  })

const mountExport = (chartBusy: boolean) =>
  mount(ImageExport, {
    props: { compareChartType: 'columnbar', overrideResponse: null, chartBusy },
    global: { plugins: [createTestStore()] },
  })

const waitForClose = async wrapper => {
  await vi.waitFor(() => expect(wrapper.emitted('closeEv')).toBeTruthy())
  return wrapper.emitted('closeEv')[0][0]
}

describe('ImageExport comparison chart gate', () => {
  beforeEach(() => {
    // A rendered comparison chart, as Plotly leaves it in the DOM
    const chart = document.createElement('div')
    chart.id = 'columnbar-chart'
    chart.appendChild(document.createElementNS('http://www.w3.org/2000/svg', 'svg'))
    document.body.appendChild(chart)
  })

  afterEach(() => {
    document.body.innerHTML = ''
  })

  it('exports the rendered chart once it has finished loading', async () => {
    const result = await waitForClose(mountExport(false))

    expect(result).toEqual({ success: true, cancelled: false })
  })

  it('refuses to export the stale chart left on screen while it refetches', async () => {
    const result = await waitForClose(mountExport(true))

    expect(result).toEqual({ success: false, cancelled: false })
  })
})
