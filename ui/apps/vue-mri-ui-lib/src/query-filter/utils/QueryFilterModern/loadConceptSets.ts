import { Ref } from 'vue'
import { loadConceptSets as apiLoadConceptSets } from '../../services/ConceptSetApiService'
import { ConceptSetDomainValues, ConceptSetItemDisplay } from '@/query-filter/types/ConceptSetTypes'

export const loadConceptSets = async (
  getDatasetId: () => string | null,
  allConceptSets: Ref<ConceptSetItemDisplay[]>,
  conceptSetDomainValues: Ref<ConceptSetDomainValues>
) => {
  const currentDatasetId = getDatasetId()

  if (!currentDatasetId) {
    console.warn('Cannot load concept sets: Dataset ID not available from store or portalAPI')
    allConceptSets.value = []
    conceptSetDomainValues.value = {
      values: [],
      isLoading: false,
      loadedStatus: 'NO_RESULTS',
    }
    return
  }

  conceptSetDomainValues.value.isLoading = true

  try {
    const result = await apiLoadConceptSets(currentDatasetId)
    allConceptSets.value = result.values
    conceptSetDomainValues.value = result
  } catch (error) {
    console.error('Error loading concept sets:', error)
    allConceptSets.value = []
    conceptSetDomainValues.value = {
      values: [],
      isLoading: false,
      loadedStatus: 'NO_RESULTS',
    }
  }
}

