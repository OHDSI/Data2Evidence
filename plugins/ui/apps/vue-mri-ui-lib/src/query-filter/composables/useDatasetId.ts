import { computed } from 'vue'
import { getPortalAPI } from '../../utils/PortalUtils'

// Type definition for the Vuex store structure we need
interface VuexStore {
  state?: {
    selectedDataset?: {
      id?: string
    }
  }
  getters?: Record<string, unknown>
}

/**
 * Composable for managing dataset ID retrieval
 * Handles getting dataset ID from store or portal API
 */
export function useDatasetId(store: VuexStore) {
  // Computed property for reactive dataset ID
  const datasetId = computed(() => {
    const storeDatasetId = store?.state?.selectedDataset?.id
    if (storeDatasetId) {
      return storeDatasetId
    }

    const portalAPI = getPortalAPI()
    if (portalAPI?.studyId) {
      return portalAPI.studyId
    }

    return null
  })

  // Function to get current dataset ID value
  const getDatasetId = (): string | null => {
    return datasetId.value
  }

  return {
    datasetId,
    getDatasetId,
  }
}
