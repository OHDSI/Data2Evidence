import { computed } from 'vue'
import { usePortalContext } from '@/composables/usePortalContext'

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
  const portalContext = usePortalContext()

  // Computed property for reactive dataset ID
  const datasetId = computed(() => {
    const storeDatasetId = store?.state?.selectedDataset?.id
    if (storeDatasetId) {
      return storeDatasetId
    }

    if (portalContext.datasetId) {
      return portalContext.datasetId
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
