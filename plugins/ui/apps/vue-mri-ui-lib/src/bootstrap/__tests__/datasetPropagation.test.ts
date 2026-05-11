import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPortalContextStore } from '@/stores/portalContext'
import { installDatasetChangeWatcher } from '../datasetWatcher'
import { installPortalPropsListener } from '../portalPropsListener'
import { SET_DATASET_RELOAD_IN_PROGRESS } from '@/store/mutation-types'

describe('bootstrap/datasetPropagation', () => {
  it('propagates custom-props-changed dataset updates through watcher flow', async () => {
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

    const stopWatcher = installDatasetChangeWatcher(portalContext, vuexStore)
    const stopListener = installPortalPropsListener(portalContext, {
      expectedAppId: 'mri-app',
      expectedContainerId: 'single-spa-application:mri-app',
    })

    window.dispatchEvent(
      new CustomEvent('custom-props-changed', {
        detail: {
          appId: 'mri-app',
          datasetId: 'ds-2',
          releaseId: 'rel-2',
        },
      })
    )

    await nextTick()

    await vi.waitFor(() => {
      expect(calls).toEqual([
        `commit:${SET_DATASET_RELOAD_IN_PROGRESS}`,
        'dispatch:setDataset',
        'dispatch:setDatasetReleaseId',
        'commit:RESET_DATASET_CACHE',
        'dispatch:requestMriConfig',
        'dispatch:setFireRequest',
        'dispatch:refreshBookmarksForDatasetSwitch',
        `commit:${SET_DATASET_RELOAD_IN_PROGRESS}`,
      ])
    })

    stopListener()
    stopWatcher()
  })
})
