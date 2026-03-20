import { ref, watch, computed, type Ref } from 'vue'
import type { InclusionReportResponse } from '@/query-filter/types/InclusionReportTypes'
import { computeAttritionStats, type AttritionStat } from '../computeAttritionStats'
import { calculateFilteredSummary } from '../ruleSelectionFilter'

export function useRuleManagement(inclusionReportResponse: Ref<InclusionReportResponse | null>, treemapData: Ref<any>) {
  const checkedRulesIds = ref<number[]>([])
  const draggableAttritionStats = ref<AttritionStat[]>([])
  const allAnyOption = ref<'ALL' | 'ANY'>('ANY')
  const passedFailedOption = ref<'PASSED' | 'FAILED'>('PASSED')

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

  function handleDragEnd() {
    const newOrder = draggableAttritionStats.value.map(stat => stat.id)
    draggableAttritionStats.value = computeAttritionStats(inclusionReportResponse.value, newOrder)
  }

  function getRowIndex(statId: number): number {
    return draggableAttritionStats.value.findIndex(s => s.id === statId)
  }

  function moveRowUp(statId: number) {
    const index = getRowIndex(statId)
    if (index > 0) {
      const newStats = [...draggableAttritionStats.value]
      ;[newStats[index - 1], newStats[index]] = [newStats[index], newStats[index - 1]]
      const newOrder = newStats.map(s => s.id)
      draggableAttritionStats.value = computeAttritionStats(inclusionReportResponse.value, newOrder)
    }
  }

  function moveRowDown(statId: number) {
    const index = getRowIndex(statId)
    if (index < draggableAttritionStats.value.length - 1) {
      const newStats = [...draggableAttritionStats.value]
      ;[newStats[index], newStats[index + 1]] = [newStats[index + 1], newStats[index]]
      const newOrder = newStats.map(s => s.id)
      draggableAttritionStats.value = computeAttritionStats(inclusionReportResponse.value, newOrder)
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
        draggableAttritionStats.value = computeAttritionStats(newResponse)
      }
    }
  )

  return {
    checkedRulesIds,
    draggableAttritionStats,
    allAnyOption,
    passedFailedOption,
    filteredSummary,
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
