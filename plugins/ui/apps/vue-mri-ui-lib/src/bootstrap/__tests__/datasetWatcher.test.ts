import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPortalContextStore } from '@/stores/portalContext'
import { SET_DATASET_RELOAD_IN_PROGRESS } from '@/store/mutation-types'
import { installDatasetChangeWatcher } from '../datasetWatcher'

describe('bootstrap/datasetWatcher', () => {
  it('triggers dataset reload flow on dataset change in order', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const calls: string[] = []
    const vuexStore = {
      commit: vi.fn((name: string) => calls.push(`commit:${name}`)),
      dispatch: vi.fn(async (name: string) => {
        calls.push(`dispatch:${name}`)
      }),
    } as any

    const stop = installDatasetChangeWatcher(portalContext, vuexStore)

    portalContext.applyProps({ datasetId: 'ds-2' })
    await nextTick()

    await vi.waitFor(() => {
      expect(calls).toEqual([
        `commit:${SET_DATASET_RELOAD_IN_PROGRESS}`,
        'dispatch:setDataset',
        'dispatch:setDatasetReleaseId',
        'commit:RESET_DATASET_CACHE',
        'dispatch:requestMriConfig',
        'dispatch:setFireRequest',
        `commit:${SET_DATASET_RELOAD_IN_PROGRESS}`,
      ])
    })

    stop()
  })

  it('does not trigger reload flow when watched values are unchanged', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const vuexStore = {
      commit: vi.fn(),
      dispatch: vi.fn(async () => {}),
    } as any

    const stop = installDatasetChangeWatcher(portalContext, vuexStore)

    portalContext.applyProps({ debug: true })
    await nextTick()

    expect(vuexStore.commit).not.toHaveBeenCalled()
    expect(vuexStore.dispatch).not.toHaveBeenCalled()

    stop()
  })

  it('clears dataset reload loading flag when requestMriConfig fails', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      username: 'user-1',
      locale: 'en',
      features: [],
      featuresLoading: false,
    })

    const commit = vi.fn()
    const dispatch = vi.fn(async (name: string) => {
      if (name === 'requestMriConfig') {
        throw new Error('config failed')
      }
    })

    const stop = installDatasetChangeWatcher(portalContext, { commit, dispatch } as any)

    portalContext.applyProps({ datasetId: 'ds-3' })
    await nextTick()

    await vi.waitFor(() => {
      expect(commit).toHaveBeenCalledWith(SET_DATASET_RELOAD_IN_PROGRESS, { datasetReloadInProgress: false })
    })
    expect(dispatch).toHaveBeenCalledWith('requestMriConfig')

    stop()
  })
})
