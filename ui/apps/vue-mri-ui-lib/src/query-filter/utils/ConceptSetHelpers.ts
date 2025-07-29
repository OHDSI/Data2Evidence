/**
 * Helper utilities for concept set operations
 */
import type { ConceptSetItem, ApiConfig, ConceptSetDomainValues } from '../types/ConceptSetTypes'

interface StoreGetters {
  getMriConfig: {
    meta?: {
      configId?: string
      configVersion?: string
    }
  }
  getSelectedDataset: {
    id?: string
  }
}

/**
 * Get API configuration from the Vuex store
 */
export const getApiConfig = (store: { getters: StoreGetters }): ApiConfig | null => {
  if (!store) return null

  const mriConfig = store.getters.getMriConfig
  const selectedDataset = store.getters.getSelectedDataset

  const configId = mriConfig?.meta?.configId
  const configVersion = mriConfig?.meta?.configVersion
  const datasetId = selectedDataset?.id

  // Return null if any required field is missing
  if (!configId || !configVersion || !datasetId) {
    return null
  }

  return {
    configId,
    configVersion,
    datasetId,
  }
}

/**
 * Filter concept sets based on search query
 */
export const filterConceptSets = (allConceptSets: ConceptSetItem[], searchQuery: string): ConceptSetDomainValues => {
  if (!searchQuery || searchQuery.trim() === '') {
    return {
      values: allConceptSets,
      isLoading: false,
      loadedStatus: allConceptSets.length > 0 ? 'HAS_RESULTS' : 'NO_RESULTS',
    }
  }

  const searchLower = searchQuery.toLowerCase()
  const filteredResults = allConceptSets.filter(
    (cs: ConceptSetItem) =>
      (cs.text && cs.text.toLowerCase().includes(searchLower)) ||
      (cs.display_value && cs.display_value.toLowerCase().includes(searchLower)) ||
      (cs.value && cs.value.toLowerCase().includes(searchLower))
  )

  return {
    values: filteredResults,
    isLoading: false,
    loadedStatus: filteredResults.length > 0 ? 'HAS_RESULTS' : 'NO_RESULTS',
  }
}

/**
 * Get tag input texts configuration
 */
export const getTagInputTexts = () => ({
  placeholder: 'Select concepts or type to search...',
  enterSearchTerm: 'Enter search term',
  clearAll: 'Clear All',
  createConceptSet: 'Create concept set',
  loadingSuggestions: 'Loading suggestions...',
  tooManyValues: 'Too many values',
  noSuggestions: 'No suggestions found',
})

/**
 * Create a tag input model for concept set selection
 */
export const createTagInputModel = (
  eventId: string
): {
  id: string
  props: {
    type: string
    value: ConceptSetItem[]
    attributePath: string
    domainFilter: string
    standardConceptCodeFilter: string
  }
} => ({
  id: `concept-set-${eventId}`,
  props: {
    type: 'conceptSet',
    value: [],
    attributePath: 'condition_occurrence.concept_id',
    domainFilter: 'Condition',
    standardConceptCodeFilter: 'Standard',
  },
})

/**
 * Initialize default concept set domain values
 */
export const createDefaultConceptSetDomainValues = (): ConceptSetDomainValues => ({
  values: [],
  isLoading: false,
  loadedStatus: 'NO_RESULTS',
})
