import type { Store } from 'vuex'
import { usePortalContextStore } from '@/stores/portalContext'
import { SET_DATASET_RELOAD_IN_PROGRESS } from '@/store/mutation-types'

type PortalContextLike = ReturnType<typeof usePortalContextStore>

export function installDatasetChangeWatcher(portalContext: PortalContextLike, vuexStore: Store<unknown>): () => void {
  let previousDatasetId = portalContext.datasetId
  let previousReleaseId = portalContext.releaseId
  let latestRequestId = 0

  return portalContext.$subscribe(async (_mutation, state) => {
    const datasetId = state.datasetId
    const releaseId = state.releaseId

    if (datasetId === previousDatasetId && releaseId === previousReleaseId) {
      return
    }

    previousDatasetId = datasetId
    previousReleaseId = releaseId
    latestRequestId += 1
    const requestId = latestRequestId

    vuexStore.commit(SET_DATASET_RELOAD_IN_PROGRESS, { datasetReloadInProgress: true })
    // Clear the active bookmark so the cohort tab does not remain open with
    // stale data after a dataset/release switch.
    vuexStore.commit('SET_ACTIVE_BOOKMARK', null)

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
  })
}
