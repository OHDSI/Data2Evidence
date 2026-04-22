import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
import { nextTick } from 'vue'
import { createPortalContextStore } from '@/stores/portalContext'
import { installDatasetChangeWatcher } from '../datasetWatcher'

describe('bootstrap/datasetWatcher', () => {
  it('triggers dataset reload flow on dataset change in order', async () => {
    setActivePinia(createPinia())
    const portalContext = createPortalContextStore({
      getToken: async () => 'token',
      datasetId: 'ds-1',
      releaseId: 'rel-1',
      tenantId: 'tenant-1',
      username: 'user-1',
      idpUserId: 'idp-1',
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
        'commit:RESET_DATASET_CACHE',
        'dispatch:requestMriConfig',
        'dispatch:setFireRequest',
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
      tenantId: 'tenant-1',
      username: 'user-1',
      idpUserId: 'idp-1',
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
})
