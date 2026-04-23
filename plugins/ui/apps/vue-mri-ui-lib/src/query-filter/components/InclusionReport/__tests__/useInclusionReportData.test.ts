import { ref, reactive, nextTick } from 'vue'
import { describe, it, expect, vi } from 'vitest'
import { useInclusionReportData } from '../composables/useInclusionReportData'
import type { InclusionReportResponse, AttritionApiResponse } from '@/query-filter/types/InclusionReportTypes'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeInclusionReport(): InclusionReportResponse {
  return {
    summary: { baseCount: 100, finalCount: 80, lostCount: 20, percentMatched: '80.00%' },
    inclusionRuleStats: [
      {
        id: 0,
        name: 'Rule A',
        isExclude: false,
        percentExcluded: '10.00%',
        percentSatisfying: '90.00%',
        countSatisfying: 90,
      },
      {
        id: 1,
        name: 'Rule B',
        isExclude: false,
        percentExcluded: '20.00%',
        percentSatisfying: '80.00%',
        countSatisfying: 80,
      },
    ],
    treemapData: {
      name: 'Everyone',
      children: [
        { name: 'Group 0', children: [{ name: '00', size: 10 }] },
        { name: 'Group 2', children: [{ name: '11', size: 90 }] },
      ],
    },
  }
}

function makeAttritionResponse(): AttritionApiResponse {
  return {
    summary: { baseCount: 100, finalCount: 80, lostCount: 20, percentMatched: '80.00%' },
    attritionStats: [
      { id: 0, name: 'Rule A', isExclude: false, cumulativeCountSatisfying: 90 },
      { id: 1, name: 'Rule B', isExclude: false, cumulativeCountSatisfying: 80 },
    ],
  }
}

// ─── Factory ─────────────────────────────────────────────────────────────────
// Options is created with reactive() so Vue's watch(() => options.xxx) tracks changes.

function makeOptions(overrides: Record<string, any> = {}) {
  return reactive({
    cohortDefinitionId: 'cohort-1',
    sourceKey: 'source-1',
    generationStatus: 'complete' as 'idle' | 'pending' | 'complete' | 'failed' | undefined,
    cacheKey: 'key-1',
    showIntersectView: true,
    fetchInclusionReport: vi.fn().mockResolvedValue(makeInclusionReport()),
    fetchAttritionReport: undefined as any,
    ...overrides,
  })
}

// ─── Tests ───────────────────────────────────────────────────────────────────

describe('useInclusionReportData', () => {
  describe('shouldFetchInclusionReport', () => {
    it.each([undefined, 'idle', 'complete'] as const)('returns true when generationStatus is %s', status => {
      const { shouldFetchInclusionReport } = useInclusionReportData(
        makeOptions({ generationStatus: status }),
        ref('PERSON')
      )
      expect(shouldFetchInclusionReport.value).toBe(true)
    })

    it.each(['pending', 'failed'] as const)('returns false when generationStatus is %s', status => {
      const { shouldFetchInclusionReport } = useInclusionReportData(
        makeOptions({ generationStatus: status }),
        ref('PERSON')
      )
      expect(shouldFetchInclusionReport.value).toBe(false)
    })
  })

  describe('fetchInclusionReportInternal – standard API path', () => {
    it('calls fetchInclusionReport with correct args and modeId=1 for PERSON', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ fetchInclusionReport: fetchFn })
      const { fetchInclusionReportInternal } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(fetchFn).toHaveBeenCalledWith('cohort-1', 'source-1', 1)
    })

    it('calls fetchInclusionReport with modeId=0 for EVENT', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ fetchInclusionReport: fetchFn })
      const { fetchInclusionReportInternal } = useInclusionReportData(options, ref('EVENT'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(fetchFn).toHaveBeenCalledWith('cohort-1', 'source-1', 0)
    })

    it('sets isLoadingInclusionReport true while fetching, false when done', async () => {
      let resolvePromise!: (v: InclusionReportResponse) => void
      const inflightPromise = new Promise<InclusionReportResponse>(res => {
        resolvePromise = res
      })
      const options = makeOptions({ fetchInclusionReport: vi.fn().mockReturnValue(inflightPromise) })
      const { fetchInclusionReportInternal, isLoadingInclusionReport } = useInclusionReportData(options, ref('PERSON'))

      expect(isLoadingInclusionReport.value).toBe(false)
      const fetchPromise = fetchInclusionReportInternal('cohort-1', 'source-1')
      expect(isLoadingInclusionReport.value).toBe(true)

      resolvePromise(makeInclusionReport())
      await fetchPromise
      expect(isLoadingInclusionReport.value).toBe(false)
    })

    it('caches PERSON response: second call for PERSON is skipped', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ fetchInclusionReport: fetchFn })
      const { fetchInclusionReportInternal } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')
      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    it('fetches EVENT independently after PERSON is already cached', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ fetchInclusionReport: fetchFn })
      const selectedView = ref<'PERSON' | 'EVENT'>('PERSON')
      const { fetchInclusionReportInternal } = useInclusionReportData(options, selectedView)

      await fetchInclusionReportInternal('cohort-1', 'source-1')
      selectedView.value = 'EVENT'
      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(fetchFn).toHaveBeenCalledTimes(2)
      expect(fetchFn).toHaveBeenNthCalledWith(2, 'cohort-1', 'source-1', 0)
    })
  })

  describe('fetchInclusionReportInternal – attrition API path (showIntersectView=false)', () => {
    it('calls fetchAttritionReport instead of fetchInclusionReport when provided', async () => {
      const fetchInclusionFn = vi.fn()
      const fetchAttritionFn = vi.fn().mockResolvedValue(makeAttritionResponse())
      const options = makeOptions({
        fetchInclusionReport: fetchInclusionFn,
        fetchAttritionReport: fetchAttritionFn,
        showIntersectView: false,
      })
      const { fetchInclusionReportInternal } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(fetchAttritionFn).toHaveBeenCalledTimes(1)
      expect(fetchInclusionFn).not.toHaveBeenCalled()
    })

    it('maps the attrition response into inclusionReportResponse with correct shape', async () => {
      const options = makeOptions({
        fetchAttritionReport: vi.fn().mockResolvedValue(makeAttritionResponse()),
        showIntersectView: false,
      })
      const { fetchInclusionReportInternal, inclusionReportResponse } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(inclusionReportResponse.value).not.toBeNull()
      expect(inclusionReportResponse.value!.summary.baseCount).toBe(100)
      expect(inclusionReportResponse.value!.inclusionRuleStats).toHaveLength(2)
      expect(inclusionReportResponse.value!.inclusionRuleStats[0].name).toBe('Rule A')
    })

    it('falls back to fetchInclusionReport when fetchAttritionReport is not provided', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({
        fetchInclusionReport: fetchFn,
        fetchAttritionReport: undefined,
        showIntersectView: false,
      })
      const { fetchInclusionReportInternal } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(fetchFn).toHaveBeenCalledTimes(1)
    })

    it('stores the raw attrition response in lastAttritionApiResponse', async () => {
      const attritionResponse = makeAttritionResponse()
      const options = makeOptions({
        fetchAttritionReport: vi.fn().mockResolvedValue(attritionResponse),
        showIntersectView: false,
      })
      const { fetchInclusionReportInternal, lastAttritionApiResponse } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      // Vue ref wraps stored values in a reactive proxy, so use toEqual for deep equality
      expect(lastAttritionApiResponse.value).toEqual(attritionResponse)
    })
  })

  describe('error handling', () => {
    it('resets isLoadingInclusionReport to false when fetch throws', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const options = makeOptions({ fetchInclusionReport: vi.fn().mockRejectedValue(new Error('Network error')) })
      const { fetchInclusionReportInternal, isLoadingInclusionReport } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(isLoadingInclusionReport.value).toBe(false)
      consoleSpy.mockRestore()
    })

    it('logs the error to console.error when fetch fails', async () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const networkError = new Error('Network error')
      const options = makeOptions({ fetchInclusionReport: vi.fn().mockRejectedValue(networkError) })
      const { fetchInclusionReportInternal } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(consoleSpy).toHaveBeenCalledWith('Error fetching inclusion report:', networkError)
      consoleSpy.mockRestore()
    })
  })

  describe('hasInclusionRules computed', () => {
    it('returns false when inclusionReportResponse is null', () => {
      const { hasInclusionRules } = useInclusionReportData(makeOptions(), ref('PERSON'))
      expect(hasInclusionRules.value).toBe(false)
    })

    it('returns false when inclusionRuleStats is empty', async () => {
      const emptyReport = { ...makeInclusionReport(), inclusionRuleStats: [] }
      const options = makeOptions({ fetchInclusionReport: vi.fn().mockResolvedValue(emptyReport) })
      const { fetchInclusionReportInternal, hasInclusionRules } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(hasInclusionRules.value).toBe(false)
    })

    it('returns true when inclusionRuleStats has entries', async () => {
      const options = makeOptions()
      const { fetchInclusionReportInternal, hasInclusionRules } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(hasInclusionRules.value).toBe(true)
    })
  })

  describe('treemapData computed', () => {
    it('returns null when inclusionReportResponse is null', () => {
      const { treemapData } = useInclusionReportData(makeOptions(), ref('PERSON'))
      expect(treemapData.value).toBeNull()
    })

    it('returns ECharts-format data (with name and value) after a successful fetch', async () => {
      const options = makeOptions({ showIntersectView: true })
      const { fetchInclusionReportInternal, treemapData } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(treemapData.value).not.toBeNull()
      expect(treemapData.value).toHaveProperty('name')
      expect(treemapData.value).toHaveProperty('value')
    })

    it('returns null when treemapData is an empty string (legacy backend)', async () => {
      const reportWithStringTreemap: InclusionReportResponse = {
        ...makeInclusionReport(),
        treemapData: '',
      }
      const options = makeOptions({ fetchInclusionReport: vi.fn().mockResolvedValue(reportWithStringTreemap) })
      const { fetchInclusionReportInternal, treemapData } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      expect(treemapData.value).toBeNull()
    })
  })

  describe('resetData', () => {
    it('sets inclusionReportResponse to null for the active view', async () => {
      const options = makeOptions()
      const { fetchInclusionReportInternal, inclusionReportResponse, resetData } = useInclusionReportData(
        options,
        ref('PERSON')
      )

      await fetchInclusionReportInternal('cohort-1', 'source-1')
      expect(inclusionReportResponse.value).not.toBeNull()

      resetData()
      expect(inclusionReportResponse.value).toBeNull()
    })

    it('allows a fresh fetch after resetData clears the cache', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ fetchInclusionReport: fetchFn })
      const { fetchInclusionReportInternal, resetData } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1') // first – cached
      resetData()
      await fetchInclusionReportInternal('cohort-1', 'source-1') // should re-fetch

      expect(fetchFn).toHaveBeenCalledTimes(2)
    })
  })

  describe('watch effects', () => {
    it('resets data immediately and refetches when cacheKey changes', async () => {
      const fetchFn = vi.fn().mockResolvedValueOnce(makeInclusionReport())
      const options = makeOptions({ fetchInclusionReport: fetchFn })
      const { fetchInclusionReportInternal, inclusionReportResponse } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')
      expect(inclusionReportResponse.value).not.toBeNull()

      // Use a deferred promise for the refetch so the transient reset state is
      // observed deterministically before the fetch resolves and repopulates.
      let resolveRefetch!: (value: InclusionReportResponse) => void
      fetchFn.mockReturnValueOnce(
        new Promise<InclusionReportResponse>(resolve => {
          resolveRefetch = resolve
        })
      )

      // Changing cacheKey triggers watch → resetData() + refetch
      options.cacheKey = 'key-2'
      await nextTick()
      // Reset happens synchronously inside the watch callback; refetch is still pending.
      expect(inclusionReportResponse.value).toBeNull()
      expect(fetchFn).toHaveBeenCalledTimes(2)

      // Resolve the in-flight refetch and confirm state is repopulated.
      resolveRefetch(makeInclusionReport())
      await vi.waitFor(() => expect(inclusionReportResponse.value).not.toBeNull())
    })

    it('refetches with the new sourceKey when sourceKey changes', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ fetchInclusionReport: fetchFn })
      const { fetchInclusionReportInternal } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')

      options.sourceKey = 'source-2'
      await nextTick()
      await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(2))
      expect(fetchFn.mock.calls[1][1]).toBe('source-2')
    })

    it('triggers a fetch when generationStatus transitions from pending → complete', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ generationStatus: 'pending', fetchInclusionReport: fetchFn })
      useInclusionReportData(options, ref('PERSON'))

      await nextTick()
      expect(fetchFn).not.toHaveBeenCalled() // blocked by 'pending'

      options.generationStatus = 'complete'
      await nextTick()
      await vi.waitFor(() => expect(fetchFn).toHaveBeenCalledTimes(1))
    })

    it('resets cached data when generationStatus transitions to pending', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ generationStatus: 'complete', fetchInclusionReport: fetchFn })
      const { fetchInclusionReportInternal, inclusionReportResponse } = useInclusionReportData(options, ref('PERSON'))

      await fetchInclusionReportInternal('cohort-1', 'source-1')
      expect(inclusionReportResponse.value).not.toBeNull()

      options.generationStatus = 'pending'
      await nextTick()
      expect(inclusionReportResponse.value).toBeNull()
    })
  })

  describe('inclusionReportResponse switching between PERSON and EVENT', () => {
    it('returns null for EVENT view when only PERSON has been fetched', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ fetchInclusionReport: fetchFn })
      const selectedView = ref<'PERSON' | 'EVENT'>('PERSON')
      const { fetchInclusionReportInternal, inclusionReportResponse } = useInclusionReportData(options, selectedView)

      await fetchInclusionReportInternal('cohort-1', 'source-1')
      expect(inclusionReportResponse.value).not.toBeNull()

      selectedView.value = 'EVENT'
      expect(inclusionReportResponse.value).toBeNull() // EVENT not yet fetched
    })

    it('returns the correct cached response after fetching both PERSON and EVENT', async () => {
      const fetchFn = vi.fn().mockResolvedValue(makeInclusionReport())
      const options = makeOptions({ fetchInclusionReport: fetchFn })
      const selectedView = ref<'PERSON' | 'EVENT'>('PERSON')
      const { fetchInclusionReportInternal, inclusionReportResponse } = useInclusionReportData(options, selectedView)

      await fetchInclusionReportInternal('cohort-1', 'source-1')
      selectedView.value = 'EVENT'
      await fetchInclusionReportInternal('cohort-1', 'source-1')

      // Both fetched – toggling between views now returns cached responses
      selectedView.value = 'PERSON'
      expect(inclusionReportResponse.value).not.toBeNull()
      selectedView.value = 'EVENT'
      expect(inclusionReportResponse.value).not.toBeNull()
    })
  })
})
