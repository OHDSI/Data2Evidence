import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { createPortalContextStore, usePortalContextStore } from '../portalContext'
import { usePortalContext } from '@/composables/usePortalContext'
import type { PortalContextState } from '@/types/portal-props'

const makeProps = (): PortalContextState => ({
  getToken: async () => 'token',
  datasetId: 'dataset-a',
  releaseId: 'release-a',
  tenantId: 'tenant-a',
  username: 'user-a',
  idpUserId: 'idp-a',
  locale: 'en',
  features: [{ feature: 'wizards', isEnabled: true }],
  featuresLoading: false,
  qeSvcUrl: 'https://example.test',
  REACT_APP_PUBLIC_WEBAPI_PROXY_URL: '/proxy',
  REACT_APP_USE_PUBLIC_WEBAPI_PROXY: 'true',
  REACT_APP_PUBLIC_WEBAPI_DATASOURCE: 'atlas',
  debug: false,
})

describe('stores/portalContext', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('seeds portal context state from initial props', async () => {
    const props = makeProps()

    const store = createPortalContextStore(props)

    expect(await store.getToken()).toBe('token')
    expect(store.datasetId).toBe('dataset-a')
    expect(store.releaseId).toBe('release-a')
    expect(store.locale).toBe('en')
    expect(store.features).toEqual([{ feature: 'wizards', isEnabled: true }])
  })

  it('applyProps updates only provided keys and preserves existing values', () => {
    const store = createPortalContextStore(makeProps())

    store.applyProps({
      datasetId: 'dataset-b',
      featuresLoading: true,
      qeSvcUrl: undefined,
    })

    expect(store.datasetId).toBe('dataset-b')
    expect(store.featuresLoading).toBe(true)
    expect(store.qeSvcUrl).toBe('https://example.test')
    expect(store.releaseId).toBe('release-a')
    expect(store.username).toBe('user-a')
  })

  it('applies updates reactively for active store consumers', () => {
    createPortalContextStore(makeProps())
    const composableStore = usePortalContext()
    const directStore = usePortalContextStore()

    directStore.applyProps({ datasetId: 'dataset-reactive' })

    expect(composableStore.datasetId).toBe('dataset-reactive')
  })
})
