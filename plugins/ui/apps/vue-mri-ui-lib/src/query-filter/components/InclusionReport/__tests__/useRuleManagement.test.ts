import { ref, nextTick } from 'vue'
import axios from 'axios'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRuleManagement } from '../composables/useRuleManagement'
import type { AttritionApiResponse } from '@/query-filter/types/InclusionReportTypes'

function createMockAttritionResponse(overrides?: Partial<AttritionApiResponse>): AttritionApiResponse {
  return {
    summary: { baseCount: 100, finalCount: 80, lostCount: 20, percentMatched: '80.00%' },
    attritionStats: [
      { id: 0, name: 'Rule A', isExclude: false, cumulativeCountSatisfying: 90 },
      { id: 1, name: 'Rule B', isExclude: false, cumulativeCountSatisfying: 80 },
    ],
    ...overrides,
  }
}

/**
 * Helper: creates a deferred promise so tests can control when the fetch resolves/rejects.
 */
function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

describe('useRuleManagement – fetchAndUpdateAttritionStats', () => {
  const inclusionReportResponse = ref(null as any)
  const treemapData = ref(null as any)

  beforeEach(() => {
    inclusionReportResponse.value = null
    treemapData.value = null
  })

  it('happy path: fetches and updates draggableAttritionStats', async () => {
    const mockResponse = createMockAttritionResponse()
    const fetchAttritionReport = vi.fn().mockResolvedValue(mockResponse)

    const { draggableAttritionStats, isReorderLoading, handleDragEnd } = useRuleManagement(
      inclusionReportResponse,
      treemapData,
      false, // showIntersectView = false to trigger API path
      fetchAttritionReport
    )

    // Trigger via handleDragEnd (which calls fetchAndUpdateAttritionStats internally)
    // handleDragEnd is async (awaits nextTick), so we need to await it and flush nextTick
    handleDragEnd()
    await nextTick()

    // Should be loading after nextTick resolves
    expect(isReorderLoading.value).toBe(true)

    // Wait for the promise to resolve
    await vi.waitFor(() => {
      expect(isReorderLoading.value).toBe(false)
    })

    expect(draggableAttritionStats.value).toHaveLength(2)
    expect(draggableAttritionStats.value[0].id).toBe(0)
    expect(draggableAttritionStats.value[0].name).toBe('Rule A')
    expect(fetchAttritionReport).toHaveBeenCalledTimes(1)
    // ruleOrder is derived from draggableAttritionStats (empty before first fetch)
    // signal should have been passed as second argument
    expect(fetchAttritionReport.mock.calls[0][0]).toEqual([])
    expect(fetchAttritionReport.mock.calls[0][1]).toBeInstanceOf(AbortSignal)
  })

  it('second call aborts the first – stale response does not update state', async () => {
    const deferred1 = createDeferred<AttritionApiResponse>()
    const deferred2 = createDeferred<AttritionApiResponse>()

    let callCount = 0
    const fetchAttritionReport = vi.fn().mockImplementation((ruleOrder?: number[], signal?: AbortSignal) => {
      callCount++
      if (callCount === 1) {
        // First call: reject with abort when signal fires
        return new Promise<AttritionApiResponse>((resolve, reject) => {
          signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')))
          deferred1.promise.then(resolve, reject)
        })
      }
      return deferred2.promise
    })

    const { draggableAttritionStats, isReorderLoading, handleDragEnd } = useRuleManagement(
      inclusionReportResponse,
      treemapData,
      false,
      fetchAttritionReport
    )

    // First call
    handleDragEnd()
    await nextTick()
    expect(isReorderLoading.value).toBe(true)

    // Second call – should abort the first
    const response2 = createMockAttritionResponse({
      attritionStats: [{ id: 10, name: 'New Rule', isExclude: false, cumulativeCountSatisfying: 50 }],
    })
    handleDragEnd()
    await nextTick()

    // isReorderLoading should still be true (newest request is in flight)
    expect(isReorderLoading.value).toBe(true)

    // Resolve the second request
    deferred2.resolve(response2)

    await vi.waitFor(() => {
      expect(isReorderLoading.value).toBe(false)
    })

    // State should reflect the SECOND response only
    expect(draggableAttritionStats.value).toHaveLength(1)
    expect(draggableAttritionStats.value[0].id).toBe(10)
    expect(draggableAttritionStats.value[0].name).toBe('New Rule')
  })

  it('real errors are logged and errorMessage is set', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const networkError = new Error('Network failure')
    const fetchAttritionReport = vi.fn().mockRejectedValue(networkError)

    const { isReorderLoading, errorMessage, handleDragEnd } = useRuleManagement(
      inclusionReportResponse,
      treemapData,
      false,
      fetchAttritionReport
    )

    handleDragEnd()
    await nextTick()

    await vi.waitFor(() => {
      expect(isReorderLoading.value).toBe(false)
    })

    expect(consoleErrorSpy).toHaveBeenCalledWith('[useRuleManagement] Failed to fetch attrition stats:', networkError)
    expect(errorMessage.value).toBe('Attrition report update failed. Please contact your system administrator.')

    consoleErrorSpy.mockRestore()
  })

  it('sets errorMessage from axios response data when available', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const axiosError = Object.assign(new Error('Request failed'), {
      response: { data: { errorMessage: 'Backend validation failed' } },
    })
    const fetchAttritionReport = vi.fn().mockRejectedValue(axiosError)

    const { isReorderLoading, errorMessage, handleDragEnd } = useRuleManagement(
      inclusionReportResponse,
      treemapData,
      false,
      fetchAttritionReport
    )

    handleDragEnd()
    await nextTick()

    await vi.waitFor(() => {
      expect(isReorderLoading.value).toBe(false)
    })

    expect(errorMessage.value).toBe('Attrition report update failed. Please contact your system administrator.')

    consoleErrorSpy.mockRestore()
  })

  it('uses getText for i18n error message when provided', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const networkError = new Error('Network failure')
    const fetchAttritionReport = vi.fn().mockRejectedValue(networkError)
    const mockGetText = vi.fn().mockReturnValue('Translated error message')

    const { isReorderLoading, errorMessage, handleDragEnd } = useRuleManagement(
      inclusionReportResponse,
      treemapData,
      false,
      fetchAttritionReport,
      undefined,
      mockGetText
    )

    handleDragEnd()
    await nextTick()

    await vi.waitFor(() => {
      expect(isReorderLoading.value).toBe(false)
    })

    expect(mockGetText).toHaveBeenCalledWith('MRI_PA_INCLUSION_REPORT_FETCH_ATTRITION_ERROR')
    expect(errorMessage.value).toBe('Translated error message')

    consoleErrorSpy.mockRestore()
  })

  it('clears errorMessage on successful fetch after a previous error', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const networkError = new Error('Network failure')
    let callCount = 0
    const mockResponse = createMockAttritionResponse()
    const fetchAttritionReport = vi.fn().mockImplementation(() => {
      callCount++
      if (callCount === 1) return Promise.reject(networkError)
      return Promise.resolve(mockResponse)
    })

    const { isReorderLoading, errorMessage, handleDragEnd } = useRuleManagement(
      inclusionReportResponse,
      treemapData,
      false,
      fetchAttritionReport
    )

    // First call – should error
    handleDragEnd()
    await nextTick()
    await vi.waitFor(() => {
      expect(isReorderLoading.value).toBe(false)
    })
    expect(errorMessage.value).toBe('Attrition report update failed. Please contact your system administrator.')

    // Second call – should succeed and clear errorMessage
    handleDragEnd()
    await nextTick()
    await vi.waitFor(() => {
      expect(isReorderLoading.value).toBe(false)
    })
    expect(errorMessage.value).toBe('')

    consoleErrorSpy.mockRestore()
  })

  it('axios cancel errors from fireQuery shared CancelToken are silently swallowed', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const axiosCancelError = new axios.Cancel('cancel')
    const fetchAttritionReport = vi.fn().mockRejectedValue(axiosCancelError)

    const { isReorderLoading, handleDragEnd } = useRuleManagement(
      inclusionReportResponse,
      treemapData,
      false,
      fetchAttritionReport
    )

    handleDragEnd()
    await nextTick()

    await vi.waitFor(() => {
      expect(isReorderLoading.value).toBe(false)
    })

    // Should NOT log the error — it's a known cancellation
    expect(consoleErrorSpy).not.toHaveBeenCalled()

    consoleErrorSpy.mockRestore()
  })
})
