import { ref, computed, watch, type Ref } from 'vue'
import type { InclusionReportResponse } from '@/query-filter/types/InclusionReportTypes'

import { convertTreemapData } from '../computeTreemapStats'

export interface UseInclusionReportDataOptions {
  cohortDefinitionId: string
  sourceKey: string
  isReady: boolean
  generationStatus?: 'idle' | 'pending' | 'complete' | 'failed'
  cacheKey?: string
  fetchInclusionReport: (
    cohortDefinitionId: string,
    sourceKey: string,
    modeId: number
  ) => Promise<InclusionReportResponse>
}

export function useInclusionReportData(
  options: UseInclusionReportDataOptions,
  selectedPersonEventView: Ref<'PERSON' | 'EVENT'>
) {
  const isLoadingInclusionReport = ref<boolean>(false)
  const inclusionReportPersonResponse = ref<InclusionReportResponse | null>(null)
  const inclusionReportEventResponse = ref<InclusionReportResponse | null>(null)

  const inclusionReportResponse = computed(() => {
    return selectedPersonEventView.value === 'PERSON'
      ? inclusionReportPersonResponse.value
      : inclusionReportEventResponse.value
  })

  const hasInclusionRules = computed(() => {
    return inclusionReportResponse.value?.inclusionRuleStats.length > 0
  })

  const treemapData = computed(() => {
    if (!inclusionReportResponse.value) return null
    const data = JSON.parse(inclusionReportResponse.value.treemapData)
    return convertTreemapData(data, inclusionReportResponse.value)
  })

  const shouldFetchInclusionReport = computed(() => {
    return options.isReady && !(options.generationStatus === 'pending' || options.generationStatus === 'failed')
  })

  const fetchInclusionReportInternal = async (cohortDefinitionId: string, sourceKey: string) => {
    isLoadingInclusionReport.value = true

    const modeId = selectedPersonEventView.value === 'PERSON' ? 1 : 0
    try {
      if (selectedPersonEventView.value === 'PERSON' && !inclusionReportPersonResponse.value) {
        inclusionReportPersonResponse.value = await options.fetchInclusionReport(cohortDefinitionId, sourceKey, modeId)
      } else if (selectedPersonEventView.value === 'EVENT' && !inclusionReportEventResponse.value) {
        inclusionReportEventResponse.value = await options.fetchInclusionReport(cohortDefinitionId, sourceKey, modeId)
      }
    } catch (error) {
      console.error('Error fetching inclusion report:', error)
    } finally {
      isLoadingInclusionReport.value = false
    }
  }

  const resetData = () => {
    inclusionReportPersonResponse.value = null
    inclusionReportEventResponse.value = null
  }

  // Watch for changes in cacheKey and reset/refetch when the underlying query changes
  watch(
    () => options.cacheKey,
    () => {
      resetData()
      if (shouldFetchInclusionReport.value) {
        fetchInclusionReportInternal(options.cohortDefinitionId, options.sourceKey)
      }
    }
  )

  // Watch for changes in sourceKey and decide whether to fetch inclusion report
  watch(
    () => options.sourceKey,
    newSourceKey => {
      resetData()
      if (shouldFetchInclusionReport.value) {
        fetchInclusionReportInternal(options.cohortDefinitionId, newSourceKey)
      }
    }
  )

  // Watch for changes in shouldFetchInclusionReport and decide whether to fetch inclusion report
  watch(shouldFetchInclusionReport, shouldFetch => {
    if (shouldFetch) {
      fetchInclusionReportInternal(options.cohortDefinitionId, options.sourceKey)
    } else {
      resetData()
    }
  })

  return {
    isLoadingInclusionReport,
    inclusionReportResponse,
    hasInclusionRules,
    treemapData,
    shouldFetchInclusionReport,
    fetchInclusionReportInternal,
    resetData,
  }
}
