import { createPinia, setActivePinia } from 'pinia'
import { describe, expect, it, vi } from 'vitest'
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

  it('routes dataset/release changes through guardChange when provided', () => {
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

    const guardChange = vi.fn()
    const stop = installPortalPropsListener(portalContext, { guardChange })

    window.dispatchEvent(
      new CustomEvent('custom-props-changed', {
        detail: { datasetId: 'ds-2' },
      })
    )

    expect(guardChange).toHaveBeenCalledTimes(1)
    expect(portalContext.datasetId).toBe('ds-1')

    const [, applyFn] = guardChange.mock.calls[0]
    applyFn()
    expect(portalContext.datasetId).toBe('ds-2')

    stop()
  })

  it('skips guardChange for non-material updates (e.g. locale)', () => {
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

    const guardChange = vi.fn()
    const stop = installPortalPropsListener(portalContext, { guardChange })

    window.dispatchEvent(
      new CustomEvent('custom-props-changed', {
        detail: { locale: 'de' },
      })
    )

    expect(guardChange).not.toHaveBeenCalled()
    expect(portalContext.locale).toBe('de')

    stop()
  })

  it('skips guardChange when datasetId is unchanged', () => {
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

    const guardChange = vi.fn()
    const stop = installPortalPropsListener(portalContext, { guardChange })

    window.dispatchEvent(
      new CustomEvent('custom-props-changed', {
        detail: { datasetId: 'ds-1' },
      })
    )

    expect(guardChange).not.toHaveBeenCalled()

    stop()
  })
})
