import type { Store } from 'vuex'
import { usePortalContextStore } from '@/stores/portalContext'
import { SET_DATASET_RELOAD_IN_PROGRESS, SET_ACTIVE_BOOKMARK, RESET_ALL_BOOKMARKS } from '@/store/mutation-types'

type PortalContextLike = ReturnType<typeof usePortalContextStore>

export function installDatasetChangeWatcher(portalContext: PortalContextLike, vuexStore: Store<unknown>): () => void {
  let previousDatasetId = portalContext.datasetId
  let previousReleaseId = portalContext.releaseId
  let latestRequestId = 0

  const reloadForDatasetChange = async (datasetId: string, releaseId: string) => {
    latestRequestId += 1
    const requestId = latestRequestId

    vuexStore.commit(SET_DATASET_RELOAD_IN_PROGRESS, { datasetReloadInProgress: true })
    vuexStore.commit(SET_ACTIVE_BOOKMARK, null)
    vuexStore.commit(RESET_ALL_BOOKMARKS)

    const isStale = () => requestId !== latestRequestId

    try {
      await vuexStore.dispatch('setDataset', datasetId)
      if (isStale()) {
        return
      }

      await vuexStore.dispatch('setDatasetReleaseId', releaseId)
      if (isStale()) {
        return
      }

      vuexStore.commit('RESET_DATASET_CACHE')

      await vuexStore.dispatch('requestMriConfig')
      if (isStale()) {
        return
      }

      await vuexStore.dispatch('setFireRequest')
      if (isStale()) {
        return
      }

      await vuexStore.dispatch('refreshBookmarksForDatasetSwitch')
    } catch (error) {
      if (!isStale()) {
        console.error('[datasetWatcher] Config reload on dataset change failed', error)
      }
    } finally {
      if (!isStale()) {
        vuexStore.commit(SET_DATASET_RELOAD_IN_PROGRESS, { datasetReloadInProgress: false })
      }
    }
  }

  const lastLoadedDatasetId = (vuexStore.getters?.getSelectedDataset as { id?: string } | undefined)?.id
  if (lastLoadedDatasetId && lastLoadedDatasetId !== portalContext.datasetId) {
    void reloadForDatasetChange(portalContext.datasetId, portalContext.releaseId)
  }

  return portalContext.$subscribe((_mutation, state) => {
    const datasetId = state.datasetId
    const releaseId = state.releaseId

    if (datasetId === previousDatasetId && releaseId === previousReleaseId) {
      return
    }

    previousDatasetId = datasetId
    previousReleaseId = releaseId
    void reloadForDatasetChange(datasetId, releaseId)
  })
}
