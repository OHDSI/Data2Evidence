import type { Store } from 'vuex'
import type { usePortalContextStore } from '@/stores/portalContext'
import { SET_DATASET_RELOAD_IN_PROGRESS } from '@/store/mutation-types'

type PortalContextLike = ReturnType<typeof usePortalContextStore>

export function installDatasetChangeWatcher(portalContext: PortalContextLike, vuexStore: Store<unknown>): () => void {
  let previousDatasetId = portalContext.datasetId
  let previousReleaseId = portalContext.releaseId

  return portalContext.$subscribe(async (_mutation, state) => {
    const datasetId = state.datasetId
    const releaseId = state.releaseId

    if (datasetId === previousDatasetId && releaseId === previousReleaseId) {
      return
    }

    previousDatasetId = datasetId
    previousReleaseId = releaseId

    vuexStore.commit(SET_DATASET_RELOAD_IN_PROGRESS, { datasetReloadInProgress: true })
    try {
      await vuexStore.dispatch('setDataset', datasetId)
      await vuexStore.dispatch('setDatasetReleaseId', releaseId)
      vuexStore.commit('RESET_DATASET_CACHE')
      await vuexStore.dispatch('requestMriConfig')
      await vuexStore.dispatch('setFireRequest')
    } catch (error) {
      console.error('[datasetWatcher] Config reload on dataset change failed', error)
    } finally {
      vuexStore.commit(SET_DATASET_RELOAD_IN_PROGRESS, { datasetReloadInProgress: false })
    }
  })
}
