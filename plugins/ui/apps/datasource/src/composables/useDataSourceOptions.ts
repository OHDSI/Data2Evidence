import { ref, watch, type Ref } from 'vue'
import { fetchResearcherSources, resolveAccess, sortCards, toCardVM, type DataSourceCardVM } from './useDataSourceCatalog'
import { getPublicDatasetList } from '../api/systemPortal'
import { getIdpUserId } from '../utils/jwt'

export function useDataSourceOptions(getToken: () => string | null) {
  const sources: Ref<DataSourceCardVM[]> = ref([])
  const loading = ref(true)
  let requestId = 0

  async function load(): Promise<void> {
    const myRequestId = ++requestId
    loading.value = true
    const token = getToken()
    const idpUserId = getIdpUserId(token)
    try {
      const list = token && idpUserId
        ? await fetchResearcherSources(token, idpUserId)
        : (await getPublicDatasetList()).map(d => toCardVM(d, resolveAccess(d, new Set(), new Set(), false), true))
      if (myRequestId === requestId) sources.value = sortCards(list, 'access')
    } catch {
      if (myRequestId === requestId) sources.value = []
    } finally {
      if (myRequestId === requestId) loading.value = false
    }
  }

  watch(getToken, () => void load(), { immediate: true })

  return { sources, loading, reload: load }
}
