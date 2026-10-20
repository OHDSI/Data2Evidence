import { computed, watch } from 'vue'
import { useStore } from 'vuex'
import { usePortalContext } from './usePortalContext'
import { useUnsavedChanges } from './useUnsavedChanges'
import { fallbackDatasetId, toDataSourceItems, type DataSource } from '../components/helpers/dataSourceSelection'

export const isAtlasHosted = import.meta.env.VITE_ATLAS_HOSTED === 'true'

export function useDataSourceSelection() {
  const store = useStore()
  const portalContext = usePortalContext()
  const unsavedChanges = useUnsavedChanges()

  const datasetId = computed<string>(() => store.getters.getSelectedDataset?.id || portalContext.datasetId)
  const datasetName = computed<string>(() => store.getters.getSelectedDatasetName || datasetId.value)
  const dataSourceItems = computed(() => toDataSourceItems((store.getters.getDataSources || []) as DataSource[]))
  const canSwitchDataSource = computed(() => isAtlasHosted && dataSourceItems.value.length > 1)
  const datasetItems = computed(() =>
    canSwitchDataSource.value ? dataSourceItems.value : [{ label: datasetName.value, value: datasetId.value }]
  )

  const switchDataSource = (nextDatasetId: string): void => {
    if (!nextDatasetId || nextDatasetId === datasetId.value) return
    unsavedChanges.guard(() => portalContext.applyProps({ datasetId: nextDatasetId }))
  }

  if (isAtlasHosted) {
    store.dispatch('fireGetDataSources')
    watch(
      () =>
        fallbackDatasetId(
          datasetId.value,
          dataSourceItems.value.map(item => item.value)
        ),
      nextDatasetId => {
        if (nextDatasetId) switchDataSource(nextDatasetId)
      },
      { immediate: true }
    )
  }

  return {
    isAtlasHosted,
    datasetId,
    datasetName,
    datasetItems,
    canSwitchDataSource,
    hasUnsavedChanges: unsavedChanges.isDirty,
    switchDataSource,
  }
}
