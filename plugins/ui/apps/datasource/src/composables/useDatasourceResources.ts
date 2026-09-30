import { ref, watch, type Ref } from 'vue'
import { getResources, downloadResource, type DatasetResource } from '../api/systemPortal'
import { base64ToBlob, saveBlobAs } from '../utils/downloadResource'

export interface UseDatasourceResourcesResult {
  resources: Ref<DatasetResource[]>
  loading: Ref<boolean>
  downloadingName: Ref<string | null>
  download: (resource: DatasetResource) => Promise<void>
}

export function useDatasourceResources(
  getSourceKey: () => string,
  getToken: () => string | null,
): UseDatasourceResourcesResult {
  const resources = ref<DatasetResource[]>([])
  const loading = ref(true)
  const downloadingName = ref<string | null>(null)

  async function load(): Promise<void> {
    loading.value = true
    try {
      resources.value = await getResources(getSourceKey(), getToken())
    } catch {
      resources.value = []
    } finally {
      loading.value = false
    }
  }

  async function download(resource: DatasetResource): Promise<void> {
    downloadingName.value = resource.name
    try {
      const { data, contentType } = await downloadResource(getSourceKey(), resource.name, getToken())
      saveBlobAs(base64ToBlob(data, contentType), resource.name)
    } finally {
      downloadingName.value = null
    }
  }

  watch(getSourceKey, () => void load(), { immediate: true })

  return { resources, loading, downloadingName, download }
}
