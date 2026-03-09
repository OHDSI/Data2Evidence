import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ref } from 'vue'
import { useDashboardFlow } from '../useDashboardFlow'

describe('useDashboardFlow', () => {
  const mockDispatch = vi.fn()
  const mockGetters = {
    getActiveBookmark: ref(null),
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('initializes with correct default state', () => {
    const flow = useDashboardFlow(mockDispatch, mockGetters)
    expect(flow.showDashboardModal.value).toBe(false)
    expect(flow.showDashboardSelectionModal.value).toBe(false)
    expect(flow.dashboardCodes.value).toEqual([])
  })

  it('resetDashboardFlowState clears flow state', () => {
    const flow = useDashboardFlow(mockDispatch, mockGetters)
    flow.showDashboardSelectionModal.value = true
    flow.showRequiredFiltersModal.value = true
    flow.dashboardMetadataLoading.value = true
    flow.dashboardCodes.value = [{ name: 'test' }]
    flow.dashboardSelectionError.value = 'error'
    flow.resetDashboardFlowState()
    expect(flow.showDashboardSelectionModal.value).toBe(false)
    expect(flow.showRequiredFiltersModal.value).toBe(false)
    expect(flow.dashboardMetadataLoading.value).toBe(false)
    expect(flow.dashboardCodes.value).toEqual([])
    expect(flow.dashboardSelectionError.value).toBe('')
  })
})
