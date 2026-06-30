import { vi, describe, expect, it } from 'vitest'

vi.mock('axios')
vi.mock('../../stores/notifications', () => ({
  useNotificationStore: () => ({
    setToastMessage: vi.fn(),
    setAlertMessage: vi.fn(),
  }),
}))
vi.mock('@/store', () => ({
  default: {
    getters: {},
    dispatch: vi.fn(),
    commit: vi.fn(),
  },
}))

import bookmarkModule from '../bookmark'
import * as types from '../../mutation-types'

describe('store - bookmark', () => {
  describe('mutations', () => {
    let state: {
      bookmarks: any[]
      materializedCohorts: any[]
      atlasCohortDefinitions: any[]
      filterSummaryVisible: boolean
      schemaName: string
      activeBookmark: any
      addNewCohort: boolean
      loading: boolean
      canDatasetMaterializeCohorts: boolean
      canMaterializeCohortDatasetId: string
      isRestoringBookmark: boolean
      activeBookmarkBaseline: any
    }

    beforeEach(() => {
      state = {
        bookmarks: [],
        materializedCohorts: [],
        atlasCohortDefinitions: [],
        filterSummaryVisible: false,
        schemaName: '',
        activeBookmark: null,
        addNewCohort: false,
        loading: false,
        canDatasetMaterializeCohorts: false,
        canMaterializeCohortDatasetId: '',
        isRestoringBookmark: false,
        activeBookmarkBaseline: null,
      }
    })

    it('SET_ACTIVE_BOOKMARK sets new bookmark and resets baseline', () => {
      const bookmark = { bmkId: '123', bookmarkname: 'Test' }
      state.activeBookmarkBaseline = { filter: {} }
      bookmarkModule.mutations[types.SET_ACTIVE_BOOKMARK](state, bookmark)
      expect(state.activeBookmark).toEqual({ ...bookmark, isNew: false })
      expect(state.activeBookmarkBaseline).toBeNull()
    })

    it('SET_ACTIVE_BOOKMARK preserves properties when updating bookmarkname', () => {
      state.activeBookmark = {
        bmkId: '123',
        bookmarkname: 'Old Name',
        cohortDefinitionId: '456',
        bookmark: '{"filter":{}}',
      }

      bookmarkModule.mutations[types.SET_ACTIVE_BOOKMARK](state, {
        ...state.activeBookmark,
        bookmarkname: 'New Name',
      })

      expect(state.activeBookmark.bmkId).toBe('123')
      expect(state.activeBookmark.bookmarkname).toBe('New Name')
      expect(state.activeBookmark.cohortDefinitionId).toBe('456')
      expect(state.activeBookmark.bookmark).toBe('{"filter":{}}')
    })

    it('SET_ACTIVE_BOOKMARK clears baseline when null', () => {
      state.activeBookmarkBaseline = { filter: {} }
      state.activeBookmark = { bmkId: '123', bookmarkname: 'Test' }
      bookmarkModule.mutations[types.SET_ACTIVE_BOOKMARK](state, null)
      expect(state.activeBookmark).toBeNull()
      expect(state.activeBookmarkBaseline).toBeNull()
    })

    it('SET_ACTIVE_BOOKMARK_BASELINE stores the baseline data', () => {
      const baseline = { filter: { foo: 'bar' }, chartType: 'stacked' }
      bookmarkModule.mutations[types.SET_ACTIVE_BOOKMARK_BASELINE](state, baseline)
      expect(state.activeBookmarkBaseline).toEqual(baseline)
    })
  })

  describe('getters', () => {
    describe('getCurrentBookmarkHasChanges', () => {
      const createConfig = (overrides = {}) => ({
        _internalConfig: {
          chartOptions: {
            stacked: {
              overlappingHistogramEnabled: true,
              kernelDensityPlotEnabled: true,
              partialOverlaySolidEnabled: true,
              ...overrides,
            },
          },
        },
      })

      const createState = () => ({
        bookmarks: [],
        materializedCohorts: [],
        atlasCohortDefinitions: [],
        filterSummaryVisible: false,
        schemaName: '',
        activeBookmark: null,
        addNewCohort: false,
        loading: false,
        canDatasetMaterializeCohorts: false,
        canMaterializeCohortDatasetId: '',
        isRestoringBookmark: false,
        activeBookmarkBaseline: null,
      })

      const callGetter = (state, moduleGetters, rootGetters) =>
        bookmarkModule.getters.getCurrentBookmarkHasChanges(state, moduleGetters, {}, rootGetters)

      it('returns false when baseline matches even if raw saved JSON differs (auto-defaulted colorAxis)', () => {
        const savedBookmark = {
          filter: {},
          chartType: 'stacked',
          axisSelection: [],
          datasetId: 'ds1',
          barChartType: { mode: 'stack', showDistributionOverlay: false },
          colorAxis: null,
        }
        const liveData = {
          ...savedBookmark,
          colorAxis: 'some.auto.defaulted.axis',
        }
        const state = createState()
        state.activeBookmark = { bmkId: '1', bookmarkname: 'Test', bookmark: JSON.stringify(savedBookmark) }
        state.activeBookmarkBaseline = liveData
        const moduleGetters = { getBookmarksData: liveData }
        const rootGetters = { getMriFrontendConfig: createConfig() }
        expect(callGetter(state, moduleGetters, rootGetters)).toBe(false)
      })

      it('returns true when baseline differs from live state for a saved bookmark', () => {
        const savedBookmark = {
          filter: {},
          chartType: 'stacked',
          axisSelection: [],
          datasetId: 'ds1',
          barChartType: { mode: 'stack', showDistributionOverlay: false },
          colorAxis: null,
        }
        const liveData = {
          ...savedBookmark,
          filter: { changed: true },
        }
        const state = createState()
        state.activeBookmark = { bmkId: '1', bookmarkname: 'Test', bookmark: JSON.stringify(savedBookmark) }
        state.activeBookmarkBaseline = savedBookmark
        const moduleGetters = { getBookmarksData: liveData }
        const rootGetters = { getMriFrontendConfig: createConfig() }
        expect(callGetter(state, moduleGetters, rootGetters)).toBe(true)
      })

      it('falls back to saved JSON comparison when no baseline exists', () => {
        const bookmarkData = {
          filter: {},
          chartType: 'stacked',
          axisSelection: [],
          datasetId: 'ds1',
          barChartType: { mode: 'stack', showDistributionOverlay: false },
          colorAxis: null,
        }
        const state = createState()
        state.activeBookmark = { bmkId: '1', bookmarkname: 'Test', bookmark: JSON.stringify(bookmarkData) }
        const moduleGetters = { getBookmarksData: bookmarkData }
        const rootGetters = { getMriFrontendConfig: createConfig() }
        expect(callGetter(state, moduleGetters, rootGetters)).toBe(false)
      })

      it('returns false when a saved overlay mode is disabled by the current config', () => {
        const savedBookmark = {
          filter: {},
          chartType: 'stacked',
          axisSelection: [],
          datasetId: 'ds1',
          barChartType: { mode: 'overlay', showDistributionOverlay: true },
          colorAxis: null,
        }
        const liveData = {
          ...savedBookmark,
          barChartType: { mode: 'stack', showDistributionOverlay: false },
        }
        const state = createState()
        state.activeBookmark = { bmkId: '1', bookmarkname: 'Test', bookmark: JSON.stringify(savedBookmark) }
        const moduleGetters = { getBookmarksData: liveData }
        const rootGetters = { getMriFrontendConfig: createConfig({ overlappingHistogramEnabled: false }) }
        expect(callGetter(state, moduleGetters, rootGetters)).toBe(false)
      })

      it('returns true when overlay flag differs and the mode is enabled', () => {
        const savedBookmark = {
          filter: {},
          chartType: 'stacked',
          axisSelection: [],
          datasetId: 'ds1',
          barChartType: { mode: 'overlay', showDistributionOverlay: true },
          colorAxis: null,
        }
        const liveData = {
          ...savedBookmark,
          barChartType: { mode: 'overlay', showDistributionOverlay: false },
        }
        const state = createState()
        state.activeBookmark = { bmkId: '1', bookmarkname: 'Test', bookmark: JSON.stringify(savedBookmark) }
        const moduleGetters = { getBookmarksData: liveData }
        const rootGetters = { getMriFrontendConfig: createConfig() }
        expect(callGetter(state, moduleGetters, rootGetters)).toBe(true)
      })

      it('returns false when colorAxis was auto-defaulted over a null baseline', () => {
        const baseline = {
          filter: {},
          chartType: 'stacked',
          axisSelection: [],
          datasetId: 'ds1',
          barChartType: { mode: 'stack', showDistributionOverlay: false },
          colorAxis: null,
        }
        // The chart auto-picked a color axis after the baseline was captured.
        const liveData = { ...baseline, colorAxis: 'some.auto.defaulted.axis' }
        const state = createState()
        state.activeBookmark = { bmkId: '1', bookmarkname: 'Test', bookmark: JSON.stringify(baseline) }
        state.activeBookmarkBaseline = baseline
        const moduleGetters = { getBookmarksData: liveData }
        const rootGetters = { getMriFrontendConfig: createConfig(), getIsColorAxisAutoDefaulted: true }
        expect(callGetter(state, moduleGetters, rootGetters)).toBe(false)
      })

      it('returns true when colorAxis was chosen by the user over a null baseline', () => {
        const baseline = {
          filter: {},
          chartType: 'stacked',
          axisSelection: [],
          datasetId: 'ds1',
          barChartType: { mode: 'stack', showDistributionOverlay: false },
          colorAxis: null,
        }
        const liveData = { ...baseline, colorAxis: 'user.chosen.axis' }
        const state = createState()
        state.activeBookmark = { bmkId: '1', bookmarkname: 'Test', bookmark: JSON.stringify(baseline) }
        state.activeBookmarkBaseline = baseline
        const moduleGetters = { getBookmarksData: liveData }
        const rootGetters = { getMriFrontendConfig: createConfig(), getIsColorAxisAutoDefaulted: false }
        expect(callGetter(state, moduleGetters, rootGetters)).toBe(true)
      })

      it('returns false when the auto-defaulted colorAxis leaked into the baseline (re-open/cached race)', () => {
        // Re-open / navigate-back: onChartDataReady fired BEFORE the baseline was
        // captured, so the baseline holds the auto-selected colorAxis, not null.
        const baseline = {
          filter: {},
          chartType: 'stacked',
          axisSelection: [],
          datasetId: 'ds1',
          barChartType: { mode: 'stack', showDistributionOverlay: false },
          colorAxis: 'some.auto.defaulted.axis',
        }
        const liveData = { ...baseline }
        const state = createState()
        state.activeBookmark = {
          bmkId: '1',
          bookmarkname: 'Test',
          bookmark: JSON.stringify({ ...baseline, colorAxis: null }),
        }
        state.activeBookmarkBaseline = baseline
        const moduleGetters = { getBookmarksData: liveData }
        const rootGetters = { getMriFrontendConfig: createConfig(), getIsColorAxisAutoDefaulted: true }
        expect(callGetter(state, moduleGetters, rootGetters)).toBe(false)
      })

      it('ignores auto-defaulted colorAxis in the saved-JSON fallback comparison', () => {
        const savedBookmark = {
          filter: {},
          chartType: 'stacked',
          axisSelection: [],
          datasetId: 'ds1',
          barChartType: { mode: 'stack', showDistributionOverlay: false },
          colorAxis: null,
        }
        const liveData = { ...savedBookmark, colorAxis: 'some.auto.defaulted.axis' }
        const state = createState()
        state.activeBookmark = { bmkId: '1', bookmarkname: 'Test', bookmark: JSON.stringify(savedBookmark) }
        // No baseline -> exercises the raw-JSON branch.
        const moduleGetters = { getBookmarksData: liveData }
        const rootGetters = { getMriFrontendConfig: createConfig(), getIsColorAxisAutoDefaulted: true }
        expect(callGetter(state, moduleGetters, rootGetters)).toBe(false)
      })
    })
  })
})
