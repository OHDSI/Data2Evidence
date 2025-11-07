import { ref, computed, watch } from 'vue'
import type { ConceptSetItemDisplay, ConceptSetDomainValues } from '../types/ConceptSetTypes'
import { loadConceptSetDetails as apiLoadConceptSetDetails } from '../services/ConceptSetApiService'
import { filterConceptSets, createDefaultConceptSetDomainValues } from '../utils/ConceptSetHelpers'

/**
 * Composable for managing concept sets in the QueryFilter component
 * Handles loading, filtering, and updating concept sets
 */
export function useConceptSets(getDatasetId: () => string | null) {
  // Reactive state
  const selectedConceptSets = ref<ConceptSetItemDisplay[]>([])
  const allConceptSets = ref<ConceptSetItemDisplay[]>([])
  const conceptSetDomainValues = ref<ConceptSetDomainValues>(createDefaultConceptSetDomainValues())
  const loadingConceptDetails = ref(false)

  // Computed properties
  const selectedConceptSetValues = computed(() => {
    try {
      return selectedConceptSets.value
    } catch (error: unknown) {
      console.error('Error in selectedConceptSetValues computed:', error)
      console.error(
        'Error details:',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      )
      return []
    }
  })

  // Functions
  const loadConceptSetDetails = async (selectedConceptSets: ConceptSetItemDisplay[]) => {
    if (selectedConceptSets.length === 0) {
      return
    }

    const currentDatasetId = getDatasetId()
    if (!currentDatasetId) {
      console.warn('Cannot load concept set details: Dataset ID not available from store or portalAPI')
      return
    }

    loadingConceptDetails.value = true

    try {
      await apiLoadConceptSetDetails(selectedConceptSets, currentDatasetId)
    } catch (error) {
      console.error('Error loading concept set details:', error)
    } finally {
      loadingConceptDetails.value = false
    }
  }

  const filterConceptSetsLocal = (searchQuery: string) => {
    conceptSetDomainValues.value = filterConceptSets(allConceptSets.value, searchQuery)
  }

  const handleConceptSetUpdate = (value: ConceptSetItemDisplay[]) => {
    try {
      console.log('handleConceptSetUpdate called with:', value)
      if (Array.isArray(value) && selectedConceptSets) {
        selectedConceptSets.value = [...value]
        console.log('Concept set updated (stored locally):', value)
      } else {
        console.warn('Invalid value passed to handleConceptSetUpdate:', value)
      }
    } catch (error: unknown) {
      console.error('Error in handleConceptSetUpdate:', error)
      console.error(
        'Error details:',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      )
      if (selectedConceptSets && Array.isArray(value)) {
        selectedConceptSets.value = value
      }
    }
  }

  const handleSearchChange = (searchQuery: string) => {
    try {
      console.log('handleSearchChange called with:', searchQuery)
      filterConceptSetsLocal(searchQuery)
    } catch (error: unknown) {
      console.error('Error in handleSearchChange:', error)
      console.error(
        'Error details:',
        error instanceof Error ? error.message : String(error),
        error instanceof Error ? error.stack : undefined
      )
    }
  }

  const clearConceptSets = () => {
    selectedConceptSets.value = []
  }

  // Watchers
  watch(
    selectedConceptSets,
    async newSelection => {
      if (newSelection && newSelection.length > 0) {
        await loadConceptSetDetails(newSelection)
      }
    },
    { deep: true }
  )

  return {
    // State
    selectedConceptSets,
    allConceptSets,
    conceptSetDomainValues,
    loadingConceptDetails,

    // Computed
    selectedConceptSetValues,

    // Functions
    loadConceptSetDetails,
    filterConceptSetsLocal,
    handleConceptSetUpdate,
    handleSearchChange,
    clearConceptSets,
  }
}
