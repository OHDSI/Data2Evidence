import { vi, describe, expect, it, beforeEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'

/**
 * The native Atlas entry has to supply a feature list the host never sends,
 * and then not lose it.
 *
 * Analyze is gated on the `wizards` feature. Atlas3 passes no `features` at
 * all, so the entry fetches the list the portal is given. The subtle part is
 * `update()`: Atlas calls it on every prop change, including a data source
 * switch, and it still sends no features. Re-deriving a list there would hand
 * the app an empty one and turn Analyze back off.
 *
 * The entry relies on `applyProps` skipping `undefined` rather than holding
 * the list itself. These tests pin both halves of that.
 */
const mountSpy = vi.fn()
const updateSpy = vi.fn()

vi.mock('../lifecycles', () => ({
  bootstrap: vi.fn(),
  mount: (props: unknown) => {
    mountSpy(props)
    return Promise.resolve('mounted')
  },
  unmount: vi.fn().mockResolvedValue(undefined),
  update: (props: unknown) => {
    updateSpy(props)
    return Promise.resolve('updated')
  },
}))
vi.mock('../stores/notifications', () => ({
  useNotificationStore: () => ({ setAlertMessage: vi.fn(), setToastMessage: vi.fn() }),
}))

import { mount, update } from '../atlas-lifecycles'
import { usePortalContextStore } from '../stores/portalContext'

const FEATURES = [{ feature: 'wizards', isEnabled: true }]
const USERNAME = 'brandan'

// The entry fetches two unrelated things on mount, so the stub answers by URL
// rather than returning one body to both.
const stubFetch = () =>
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string) =>
      url === '/usermgmt/api/me'
        ? ({ ok: true, json: async () => ({ id: 'u1', username: USERNAME }) } as unknown as Response)
        : ({ ok: true, json: async () => FEATURES } as unknown as Response)
    )
  )

describe('atlas-lifecycles: the feature list', () => {
  beforeEach(() => {
    mountSpy.mockClear()
    updateSpy.mockClear()
    setActivePinia(createPinia())
    stubFetch()
  })

  it('fetches the feature list on mount, because the host sends none', async () => {
    await mount({ getToken: async () => 'tok', domElement: null })

    expect(fetch).toHaveBeenCalledWith('/system-portal/feature/list', {
      headers: { Authorization: 'Bearer tok' },
    })
    expect(mountSpy.mock.calls[0][0].features).toEqual(FEATURES)
  })

  it('keeps the host-supplied list when there is one', async () => {
    const hostFeatures = [{ feature: 'wizards', isEnabled: false }]
    // username too, or the entry still calls out for that half alone.
    await mount({ getToken: async () => 'tok', features: hostFeatures, username: USERNAME, domElement: null })

    expect(fetch).not.toHaveBeenCalled()
    expect(mountSpy.mock.calls[0][0].features).toEqual(hostFeatures)
  })

  it('mounts with an empty list when the fetch fails, rather than failing the mount', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('401')))

    await expect(mount({ getToken: async () => 'tok', domElement: null })).resolves.toBe('mounted')
    expect(mountSpy.mock.calls[0][0].features).toEqual([])
  })

  it('leaves features undefined on update, so applyProps cannot overwrite them', async () => {
    // This is the whole reason the entry holds no state of its own.
    await update({ datasetId: 'ds-2' })

    const passed = updateSpy.mock.calls[0][0]
    expect(passed.features).toBeUndefined()
    expect(passed.datasetId).toBe('ds-2')
  })

  it('an update therefore does not clear a feature list already in the store', async () => {
    // The real proof: drive the store the way mount then update would, and
    // confirm wizards survives. Before this, a source switch turned it off.
    const store = usePortalContextStore()
    store.applyProps({ features: FEATURES } as never)
    expect(store.features).toEqual(FEATURES)

    store.applyProps({ datasetId: 'ds-2', features: undefined } as never)

    expect(store.features).toEqual(FEATURES)
    expect(store.datasetId).toBe('ds-2')
  })
})

/**
 * The owner key for saved work, which the host never sends either.
 *
 * Every ownership test in this app compares `username` to a stored `user_id`
 * that bookmark-svc wrote from its own GET /me. Left empty, those comparisons
 * all fail and a user's own saved cohorts are reported as none — which is
 * exactly what the native Atlas mount did: the bookmark request returned rows
 * and the list rendered nothing.
 */
describe('atlas-lifecycles: the username', () => {
  beforeEach(() => {
    mountSpy.mockClear()
    updateSpy.mockClear()
    setActivePinia(createPinia())
    stubFetch()
  })

  it('resolves the username from usermgmt on mount, because the host sends none', async () => {
    await mount({ getToken: async () => 'tok', domElement: null })

    expect(fetch).toHaveBeenCalledWith('/usermgmt/api/me', {
      headers: { Authorization: 'Bearer tok' },
    })
    expect(mountSpy.mock.calls[0][0].username).toBe(USERNAME)
  })

  it('keeps the host-supplied username when there is one', async () => {
    await mount({ getToken: async () => 'tok', features: FEATURES, username: 'someone-else', domElement: null })

    expect(mountSpy.mock.calls[0][0].username).toBe('someone-else')
  })

  it('leaves the username undefined when the lookup fails, never a substitute', async () => {
    // Showing one user another's saved work is worse than showing none.
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('401')))

    await expect(mount({ getToken: async () => 'tok', domElement: null })).resolves.toBe('mounted')
    expect(mountSpy.mock.calls[0][0].username).toBeUndefined()
  })

  it('leaves the username undefined on update, so applyProps cannot overwrite it', async () => {
    await update({ datasetId: 'ds-2' })

    expect(updateSpy.mock.calls[0][0].username).toBeUndefined()
  })

  it('an update therefore does not clear a username already in the store', async () => {
    const store = usePortalContextStore()
    store.applyProps({ username: USERNAME } as never)
    expect(store.username).toBe(USERNAME)

    store.applyProps({ datasetId: 'ds-2', username: undefined } as never)

    expect(store.username).toBe(USERNAME)
    expect(store.datasetId).toBe('ds-2')
  })
})
