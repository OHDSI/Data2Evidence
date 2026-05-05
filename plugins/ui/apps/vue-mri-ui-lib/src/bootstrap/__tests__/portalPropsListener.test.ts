import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it } from 'vitest'
import { createPortalContextStore } from '@/stores/portalContext'
import { installPortalPropsListener } from '../portalPropsListener'

describe('bootstrap/portalPropsListener', () => {
  it('applies matching custom-props-changed payloads to portal context', async () => {
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

    const stop = installPortalPropsListener(portalContext, {
      expectedAppId: 'mri-app',
      expectedContainerId: 'single-spa-application:mri-app',
    })

    window.dispatchEvent(
      new CustomEvent('custom-props-changed', {
        detail: {
          appId: 'mri-app',
          datasetId: 'ds-2',
          releaseId: 'rel-2',
          username: 'user-2',
        },
      })
    )

    expect(portalContext.datasetId).toBe('ds-2')
    expect(portalContext.releaseId).toBe('rel-2')
    expect(portalContext.username).toBe('user-2')

    stop()
  })

  it('ignores updates for other apps', async () => {
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

    const stop = installPortalPropsListener(portalContext, {
      expectedAppId: 'mri-app',
      expectedContainerId: 'single-spa-application:mri-app',
    })

    window.dispatchEvent(
      new CustomEvent('custom-props-changed', {
        detail: {
          appId: 'another-app',
          datasetId: 'ds-9',
        },
      })
    )

    expect(portalContext.datasetId).toBe('ds-1')

    stop()
  })
})
