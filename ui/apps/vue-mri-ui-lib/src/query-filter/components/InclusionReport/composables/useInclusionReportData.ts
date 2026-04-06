import { ref, computed, watch, type Ref } from 'vue'
import {
  type InclusionReportResponse,
  type AttritionApiResponse,
  parseTreemapData,
} from '@/query-filter/types/InclusionReportTypes'

import { convertTreemapData } from '../computeTreemapStats'

export interface UseInclusionReportDataOptions {
  cohortDefinitionId: string
  sourceKey: string
  generationStatus?: 'idle' | 'pending' | 'complete' | 'failed'
  cacheKey?: string
  showIntersectView?: boolean
  fetchInclusionReport: (
    cohortDefinitionId: string,
    sourceKey: string,
    modeId: number
  ) => Promise<InclusionReportResponse>
  fetchAttritionReport?: (ruleOrder?: number[]) => Promise<AttritionApiResponse>
}

export function useInclusionReportData(
  options: UseInclusionReportDataOptions,
  selectedPersonEventView: Ref<'PERSON' | 'EVENT'>
) {
  const isLoadingInclusionReport = ref<boolean>(false)
  const inclusionReportPersonResponse = ref<InclusionReportResponse | null>(null)
  const inclusionReportEventResponse = ref<InclusionReportResponse | null>(null)
  const lastAttritionApiResponse = ref<AttritionApiResponse | null>(null)

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
    const data = parseTreemapData(inclusionReportResponse.value.treemapData)
    return convertTreemapData(data, inclusionReportResponse.value)
  })

  const shouldFetchInclusionReport = computed(() => {
    return !(options.generationStatus === 'pending' || options.generationStatus === 'failed')
  })

  /**
   * Map an AttritionApiResponse to a minimal InclusionReportResponse
   * so the rest of the component (SummaryTable, hasInclusionRules) works.
   */
  const mapAttritionToInclusionReport = (apiResponse: AttritionApiResponse): InclusionReportResponse => {
    return {
      summary: apiResponse.summary,
      inclusionRuleStats: apiResponse.attritionStats.map(s => {
        const pctSat = apiResponse.summary.baseCount ? s.cumulativeCountSatisfying / apiResponse.summary.baseCount : 0
        return {
          id: s.id,
          name: s.name,
          isExclude: s.isExclude,
          countSatisfying: s.cumulativeCountSatisfying,
          percentSatisfying: (pctSat * 100).toFixed(2) + '%',
          percentExcluded: ((1 - pctSat) * 100).toFixed(2) + '%',
        }
      }),
      treemapData: '', // Not needed when showIntersectView is false
    }
  }

  const fetchInclusionReportInternal = async (cohortDefinitionId: string, sourceKey: string) => {
    isLoadingInclusionReport.value = true

    try {
      if (!options.showIntersectView && options.fetchAttritionReport) {
        // Use the new attrition API
        const apiResponse = await options.fetchAttritionReport()
        lastAttritionApiResponse.value = apiResponse
        const mapped = mapAttritionToInclusionReport(apiResponse)

        if (selectedPersonEventView.value === 'PERSON') {
          inclusionReportPersonResponse.value = mapped
        } else {
          inclusionReportEventResponse.value = mapped
        }
      } else {
        // Use the existing inclusion report API
        const modeId = selectedPersonEventView.value === 'PERSON' ? 1 : 0
        if (selectedPersonEventView.value === 'PERSON' && !inclusionReportPersonResponse.value) {
          inclusionReportPersonResponse.value = await options.fetchInclusionReport(
            cohortDefinitionId,
            sourceKey,
            modeId
          )
        } else if (selectedPersonEventView.value === 'EVENT' && !inclusionReportEventResponse.value) {
          inclusionReportEventResponse.value = await options.fetchInclusionReport(cohortDefinitionId, sourceKey, modeId)
        }
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
    lastAttritionApiResponse.value = null
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
    lastAttritionApiResponse,
  }
}
