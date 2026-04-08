import { ref, watch, computed, nextTick, type Ref } from 'vue'
import axios from 'axios'
import type { InclusionReportResponse, AttritionApiResponse } from '@/query-filter/types/InclusionReportTypes'
import { computeAttritionStats, type AttritionStat } from '../computeAttritionStats'
import { calculateFilteredSummary } from '../ruleSelectionFilter'

/**
 * Map an AttritionApiResponse into the local AttritionStat[] format
 * used by the UI (adds percentSatisfying and pctDiff).
 */
function mapAttritionApiResponse(apiResponse: AttritionApiResponse): AttritionStat[] {
  const baseCount = apiResponse.summary.baseCount
  let priorPct = 1.0

  return apiResponse.attritionStats.map(s => {
    const percentSatisfying = baseCount !== 0 ? s.cumulativeCountSatisfying / baseCount : 0
    const pctDiff = priorPct - percentSatisfying
    priorPct = percentSatisfying

    return {
      id: s.id,
      name: s.name,
      isExclude: s.isExclude,
      countSatisfying: s.cumulativeCountSatisfying,
      percentSatisfying: (percentSatisfying * 100).toFixed(2) + '%',
      pctDiff: (pctDiff * 100).toFixed(2) + '%',
    }
  })
}

export function useRuleManagement(
  inclusionReportResponse: Ref<InclusionReportResponse | null>,
  treemapData: Ref<any>,
  showIntersectView: boolean = true,
  fetchAttritionReport?: (ruleOrder?: number[], signal?: AbortSignal) => Promise<AttritionApiResponse>,
  lastAttritionApiResponse?: Ref<AttritionApiResponse | null>
) {
  const checkedRulesIds = ref<number[]>([])
  const draggableAttritionStats = ref<AttritionStat[]>([])
  const allAnyOption = ref<'ALL' | 'ANY'>('ANY')
  const passedFailedOption = ref<'PASSED' | 'FAILED'>('PASSED')
  const isReorderLoading = ref(false)
  const errorMessage = ref('')
  let activeAbortController: AbortController | null = null

  const filteredSummary = computed(() => {
    if (!treemapData.value || checkedRulesIds.value.length === 0) {
      return { value: 0, percent: '0%' }
    }

    const { value } = calculateFilteredSummary(
      treemapData.value,
      checkedRulesIds.value,
      allAnyOption.value,
      passedFailedOption.value
    )
    const baseCount = inclusionReportResponse.value?.summary.baseCount || 1
    const percent = ((value / baseCount) * 100).toFixed(2) + '%'

    return { value, percent }
  })

  function toggleRuleSelection(ruleId: number) {
    const index = checkedRulesIds.value.indexOf(ruleId)
    if (index > -1) {
      checkedRulesIds.value.splice(index, 1)
    } else {
      checkedRulesIds.value.push(ruleId)
    }
  }

  function isRuleChecked(ruleId: number): boolean {
    return checkedRulesIds.value.includes(ruleId)
  }

  function areAllRulesChecked(): boolean {
    if (!inclusionReportResponse.value || !inclusionReportResponse.value.inclusionRuleStats) return false
    const totalRules = inclusionReportResponse.value.inclusionRuleStats.length
    return checkedRulesIds.value.length === totalRules
  }

  function toggleAllRules() {
    if (!inclusionReportResponse.value || !inclusionReportResponse.value.inclusionRuleStats) return

    if (areAllRulesChecked()) {
      // Uncheck all
      checkedRulesIds.value = []
    } else {
      // Check all
      checkedRulesIds.value = inclusionReportResponse.value.inclusionRuleStats.map(r => r.id)
    }
  }

  /**
   * Fetch attrition stats from the attrition API and update local state.
   * Used when showIntersectView is false and fetchAttritionReport is provided.
   */
  async function fetchAndUpdateAttritionStats(ruleOrder?: number[]) {
    if (!fetchAttritionReport) {
      // Fallback: compute locally when no API is provided
      draggableAttritionStats.value = computeAttritionStats(inclusionReportResponse.value!, ruleOrder)
      return
    }
    // Abort any in-flight request so only the newest one updates state
    activeAbortController?.abort()
    const controller = new AbortController()
    activeAbortController = controller

    isReorderLoading.value = true
    errorMessage.value = ''
    try {
      const apiResponse = await fetchAttritionReport(ruleOrder, controller.signal)
      const stats = mapAttritionApiResponse(apiResponse)
      // The attrition API remaps stat.id to the new positional index when a
      // custom ruleOrder is supplied.  Restore the original rule IDs so that
      // filterCardDetails lookup (indexed by original rule ID) stays correct.
      if (ruleOrder) {
        stats.forEach((stat, idx) => {
          stat.id = ruleOrder[idx]
        })
      }
      draggableAttritionStats.value = stats
    } catch (error: unknown) {
      if (controller.signal.aborted) return // cancelled by a newer request, ignore
      if (axios.isCancel(error)) return // cancelled by fireQuery's shared CancelToken
      console.error('[useRuleManagement] Failed to fetch attrition stats:', error)
      const axiosError = error as { response?: { data?: { errorMessage?: string } } }
      errorMessage.value =
        axiosError?.response?.data?.errorMessage ||
        (error instanceof Error ? error.message : 'Failed to fetch attrition stats')
    } finally {
      if (!controller.signal.aborted) {
        isReorderLoading.value = false
      }
    }
  }

  async function handleDragEnd() {
    // VueDraggable fires @end before @update:modelValue, so draggableAttritionStats
    // still holds the old order at this point. Wait for nextTick so the model update
    // (emitted via @update:draggableAttritionStats) is applied before reading the new order.
    await nextTick()
    const newOrder = draggableAttritionStats.value.map(stat => stat.id)
    if (!showIntersectView) {
      fetchAndUpdateAttritionStats(newOrder)
    } else {
      draggableAttritionStats.value = computeAttritionStats(inclusionReportResponse.value, newOrder)
    }
  }

  function getRowIndex(statId: number): number {
    return draggableAttritionStats.value.findIndex(s => s.id === statId)
  }

  function moveRowUp(statId: number) {
    const index = getRowIndex(statId)
    if (index > 0) {
      const newStats = [...draggableAttritionStats.value]
      ;[newStats[index - 1], newStats[index]] = [newStats[index], newStats[index - 1]]
      // Optimistically reorder rows in the UI
      draggableAttritionStats.value = newStats
      const newOrder = newStats.map(s => s.id)
      if (!showIntersectView) {
        fetchAndUpdateAttritionStats(newOrder)
      } else {
        draggableAttritionStats.value = computeAttritionStats(inclusionReportResponse.value, newOrder)
      }
    }
  }

  function moveRowDown(statId: number) {
    const index = getRowIndex(statId)
    if (index < draggableAttritionStats.value.length - 1) {
      const newStats = [...draggableAttritionStats.value]
      ;[newStats[index], newStats[index + 1]] = [newStats[index + 1], newStats[index]]
      // Optimistically reorder rows in the UI
      draggableAttritionStats.value = newStats
      const newOrder = newStats.map(s => s.id)
      if (!showIntersectView) {
        fetchAndUpdateAttritionStats(newOrder)
      } else {
        draggableAttritionStats.value = computeAttritionStats(inclusionReportResponse.value, newOrder)
      }
    }
  }

  function handleAllAnyChange(newValue: 'ALL' | 'ANY') {
    allAnyOption.value = newValue
  }

  function handlePassedFailedChange(newValue: 'PASSED' | 'FAILED') {
    passedFailedOption.value = newValue
  }

  // Watch for changes in inclusionReportResponse to initialize rules
  watch(
    () => inclusionReportResponse.value,
    newResponse => {
      if (newResponse && newResponse.inclusionRuleStats) {
        // Initialize checkedRulesIds with all rule IDs
        checkedRulesIds.value = newResponse.inclusionRuleStats.map(r => r.id)

        if (!showIntersectView) {
          // Use the already-fetched attrition API response if available,
          // avoiding a duplicate request on initial load
          if (lastAttritionApiResponse?.value) {
            draggableAttritionStats.value = mapAttritionApiResponse(lastAttritionApiResponse.value)
          } else {
            fetchAndUpdateAttritionStats()
          }
        } else {
          draggableAttritionStats.value = computeAttritionStats(newResponse)
        }
      }
    }
  )

  return {
    checkedRulesIds,
    draggableAttritionStats,
    allAnyOption,
    passedFailedOption,
    filteredSummary,
    isReorderLoading,
    errorMessage,
    toggleRuleSelection,
    isRuleChecked,
    areAllRulesChecked,
    toggleAllRules,
    handleDragEnd,
    getRowIndex,
    moveRowUp,
    moveRowDown,
    handleAllAnyChange,
    handlePassedFailedChange,
  }
}
