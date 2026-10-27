export const COHORT_ID = 'cohortId'
export const NO_VALUE = 'NoValue'
export const MAX_UNCENSORED_MIN_COHORT_SIZE = 1

export interface CompareBarResponse {
  categories: { id: string }[]
  measures: { id: string }[]
  data: Record<string, unknown>[]
}

export function withEmptyCohorts<T extends CompareBarResponse>(response: T, cohortIds: string[], minCohortSize = 0): T {
  if (Number(minCohortSize) > MAX_UNCENSORED_MIN_COHORT_SIZE) return response

  const measureId = response.measures[0]?.id
  if (!measureId) return response

  const presentIds = new Set(response.data.map(row => row[COHORT_ID]))
  const missingIds = cohortIds.filter(id => !presentIds.has(id))
  if (missingIds.length === 0) return response

  const otherCategoryIds = response.categories.map(category => category.id).filter(id => id !== COHORT_ID)
  const emptyRows = missingIds.map(cohortId => ({
    [COHORT_ID]: cohortId,
    ...Object.fromEntries(otherCategoryIds.map(id => [id, NO_VALUE])),
    [measureId]: 0,
  }))

  return { ...response, data: [...response.data, ...emptyRows] }
}
