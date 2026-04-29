import type { Store } from 'vuex'
import type { usePortalContextStore } from '@/stores/portalContext'

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

    vuexStore.commit('RESET_DATASET_CACHE')
    await vuexStore.dispatch('requestMriConfig')
    vuexStore.dispatch('setFireRequest')
  })
}
