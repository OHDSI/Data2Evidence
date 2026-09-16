import { shallowMount } from '@vue/test-utils'
import { createStore } from 'vuex'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// PatientAnalytics.mounted() reaches for the experimental browser modelContext API.
// Neither registration matters here and both throw under happy-dom.
vi.mock('@/ai/webmcpServer', () => ({ registerPaTools: () => () => {} }))
vi.mock('@/ai/paToolBridge', () => ({ publishPaTools: () => () => {} }))

import PatientAnalytics from '../PatientAnalytics.vue'

const actions = {
  setFireRequest: vi.fn(),
  invalidateCurrentPatientCount: vi.fn(),
  changePage: vi.fn(),
  setSplitterSize: vi.fn(),
  completeInitialLoad: vi.fn(),
  fireBookmarkQuery: vi.fn(),
  loadSharedBookmarkList: vi.fn(),
  queryGenomicsSettings: vi.fn(),
  setupChartDefaults: vi.fn(),
  setIFRState: vi.fn(),
  drilldown: vi.fn(),
  setActiveChart: vi.fn(),
  loadbookmarkToState: vi.fn(),
  setAddNewCohort: vi.fn(),
  fireCheckIfDatasetCanMaterializeCohorts: vi.fn(),
  setRightPaneMounted: vi.fn(),
  loadValuesForAttributePath: vi.fn(),
}

const buildStore = ({ held = false, currentPage = 1 } = {}) =>
  createStore({
    state: { ifr: { cards: [] }, held },
    getters: {
      getBookmarkFromIFR: s => (s as any).ifr,
      isFireRequestHeld: s => (s as any).held,
      getPLModel: () => ({ currentPage }),
      getMriFrontendConfig: () => ({ _internalConfig: {}, getInitialIFR: () => ({ cards: [] }) }),
      getHasAssignedConfig: () => false,
      getInitialLoad: () => false,
      getText: () => (key: string) => key,
      getChartSelection: () => () => [],
      getAllChartConfigs: () => ({ initialChart: 'stacked' }),
      getActiveChart: () => 'stacked',
      getActiveBookmark: () => null,
      getBookmarkById: () => () => null,
      getDatasetReloadInProgress: () => false,
    },
    mutations: {
      // Stands in for a filter-card constraint edit: every value the user adds or
      // removes rewrites the IFR, which is what the watcher under test reacts to.
      editFilterValues(s, count: number) {
        ;(s as any).ifr = { cards: new Array(count).fill('constraint') }
      },
      setHeld(s, value: boolean) {
        ;(s as any).held = value
      },
    },
    actions,
  })

const mountPA = (storeOptions = {}) => {
  const store = buildStore(storeOptions)
  const wrapper = shallowMount(PatientAnalytics as any, {
    global: { plugins: [store] },
  })
  return { store, wrapper }
}

describe('PatientAnalytics cohort recalculation debounce', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.useFakeTimers()
    Object.values(actions).forEach(a => a.mockClear())
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('fires one recalculation for a burst of filter-value edits', async () => {
    const { store, wrapper } = mountPA()
    actions.setFireRequest.mockClear()

    // The production incident: 110 medication values added ~180-500ms apart, each
    // one dispatching its own barchart query. Ten edits at 200ms is the same shape.
    for (let i = 1; i <= 10; i++) {
      store.commit('editFilterValues', i)
      await wrapper.vm.$nextTick()
      vi.advanceTimersByTime(200)
    }
    vi.advanceTimersByTime(500)
    await wrapper.vm.$nextTick()

    expect(actions.setFireRequest).toHaveBeenCalledTimes(1)
  })

  it('marks the patient count stale on the first edit, before the debounce elapses', async () => {
    const { store, wrapper } = mountPA()
    actions.invalidateCurrentPatientCount.mockClear()

    store.commit('editFilterValues', 1)
    await wrapper.vm.$nextTick()

    // Nothing has been queried yet, so the displayed count still belongs to the
    // previous cohort. It must be flagged rather than left looking authoritative.
    expect(actions.setFireRequest).not.toHaveBeenCalled()
    expect(actions.invalidateCurrentPatientCount).toHaveBeenCalledTimes(1)
  })

  it('does not fire for edits made while the fire request is held', async () => {
    const { store, wrapper } = mountPA({ held: true })
    actions.setFireRequest.mockClear()

    store.commit('editFilterValues', 3)
    await wrapper.vm.$nextTick()

    // Bookmark load and the WebMCP cohort patch both hold, then release and fire once
    // explicitly. Before debouncing, the held edit hit setFireRequest's own early
    // return and queued nothing; a call scheduled here would instead land after the
    // release and duplicate that explicit fire.
    store.commit('setHeld', false)
    vi.advanceTimersByTime(1000)
    await wrapper.vm.$nextTick()

    expect(actions.setFireRequest).not.toHaveBeenCalled()
  })

  it('drops a pending recalculation when the component unmounts', async () => {
    const { store, wrapper } = mountPA()
    actions.setFireRequest.mockClear()

    store.commit('editFilterValues', 2)
    await wrapper.vm.$nextTick()
    wrapper.unmount()
    vi.advanceTimersByTime(1000)

    // Querying on behalf of a screen the user has already navigated away from costs a
    // multi-second analytics query and writes a count into a torn-down chart.
    expect(actions.setFireRequest).not.toHaveBeenCalled()
  })
})
