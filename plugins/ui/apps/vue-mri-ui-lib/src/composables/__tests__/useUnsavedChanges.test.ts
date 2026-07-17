import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'
import { MRI_APP_NAME } from '../../shared/unsavedChangesRegistry'

const mockStore = {
  getters: {
    getActiveBookmark: null as { isNew: boolean; bookmarkname?: string } | null,
    getCurrentBookmarkHasChanges: false,
    getIsRestoringBookmark: false,
    getBookmarksData: { filter: {} } as Record<string, unknown>,
  },
  commit: vi.fn(),
}

vi.mock('vuex', () => ({
  useStore: () => mockStore,
}))

describe('useUnsavedChanges', () => {
  const eventListeners: Record<string, Function[]> = {}
  let originalAddEventListener: typeof window.addEventListener
  let originalRemoveEventListener: typeof window.removeEventListener

  beforeEach(() => {
    Object.keys(eventListeners).forEach(k => delete eventListeners[k])
    vi.resetModules()

    originalAddEventListener = window.addEventListener
    originalRemoveEventListener = window.removeEventListener

    window.addEventListener = vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
      if (!eventListeners[event]) eventListeners[event] = []
      eventListeners[event].push(handler as Function)
    }) as typeof window.addEventListener

    window.removeEventListener = vi.fn((event: string, handler: EventListenerOrEventListenerObject) => {
      const list = eventListeners[event]
      if (!list) return
      const idx = list.indexOf(handler as Function)
      if (idx > -1) list.splice(idx, 1)
    }) as typeof window.removeEventListener

    mockStore.getters.getActiveBookmark = null
    mockStore.getters.getCurrentBookmarkHasChanges = false
    mockStore.getters.getIsRestoringBookmark = false
    mockStore.getters.getBookmarksData = { filter: {} }
    mockStore.commit = vi.fn()
    window.__d2eUnsavedChangesRegistry?.unregister(MRI_APP_NAME)
    vi.clearAllMocks()
  })

  afterEach(() => {
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
    window.__d2eUnsavedChangesRegistry?.unregister(MRI_APP_NAME)
  })

  it('isDirty=false when no active bookmark', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { isDirty, showDialog } = useUnsavedChanges()

    expect(isDirty.value).toBe(false)
    expect(showDialog.value).toBe(false)
  })

  it('isDirty=false when active bookmark is new but no actual changes', async () => {
    mockStore.getters.getActiveBookmark = { isNew: true, bookmarkname: 'Untitled' }
    mockStore.getters.getCurrentBookmarkHasChanges = false

    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { isDirty } = useUnsavedChanges()

    expect(isDirty.value).toBe(false)
  })

  it('isDirty=false while restoring bookmark', async () => {
    mockStore.getters.getActiveBookmark = { isNew: true, bookmarkname: 'Untitled' }
    mockStore.getters.getCurrentBookmarkHasChanges = true
    mockStore.getters.getIsRestoringBookmark = true

    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { isDirty } = useUnsavedChanges()

    expect(isDirty.value).toBe(false)
  })

  it('isDirty=true when current bookmark has changes', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved' }
    mockStore.getters.getCurrentBookmarkHasChanges = true

    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { isDirty } = useUnsavedChanges()

    expect(isDirty.value).toBe(true)
  })

  it('isDirty=false when saved bookmark has no changes', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved', bookmark: '{"filter":{}}' }
    mockStore.getters.getCurrentBookmarkHasChanges = false

    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { isDirty } = useUnsavedChanges()

    expect(isDirty.value).toBe(false)
  })

  it('install registers with the global unsaved-changes registry', async () => {
    mockStore.getters.getActiveBookmark = null
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install } = useUnsavedChanges()

    install()

    expect(window.__d2eUnsavedChangesRegistry?.hasAnyUnsavedChanges()).toBe(false)
  })

  it('uninstall unregisters from the global unsaved-changes registry', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved' }
    mockStore.getters.getCurrentBookmarkHasChanges = true
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install, uninstall } = useUnsavedChanges()

    install()
    expect(window.__d2eUnsavedChangesRegistry?.hasAnyUnsavedChanges()).toBe(true)

    uninstall()
    expect(window.__d2eUnsavedChangesRegistry?.hasAnyUnsavedChanges()).toBe(false)
  })

  it('install is idempotent', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install } = useUnsavedChanges()

    install()
    install()

    expect(eventListeners.beforeunload.length).toBe(1)
  })

  it('registers only the beforeunload listener on install (no cross-app routing listener)', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install } = useUnsavedChanges()

    install()

    expect(eventListeners.beforeunload).toBeDefined()
    expect(eventListeners.beforeunload.length).toBe(1)
    expect(eventListeners['single-spa:before-routing-event']).toBeUndefined()
  })

  it('uninstall removes the listener', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install, uninstall } = useUnsavedChanges()

    install()
    uninstall()

    expect(eventListeners.beforeunload?.length ?? 0).toBe(0)
  })

  it('guard executes pendingAction immediately when not dirty', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { guard, showDialog } = useUnsavedChanges()

    const action = vi.fn()
    guard(action)

    expect(action).toHaveBeenCalledTimes(1)
    expect(showDialog.value).toBe(false)
  })

  it('guard queues pendingAction and shows dialog when dirty', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved' }
    mockStore.getters.getCurrentBookmarkHasChanges = true
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { guard, showDialog } = useUnsavedChanges()

    const action = vi.fn()
    guard(action)

    expect(action).not.toHaveBeenCalled()
    expect(showDialog.value).toBe(true)
  })

  it('guard ignores subsequent calls while dialog is open', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved' }
    mockStore.getters.getCurrentBookmarkHasChanges = true
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { guard, showDialog, pendingAction } = useUnsavedChanges()

    const firstAction = vi.fn()
    const secondAction = vi.fn()
    guard(firstAction)
    guard(secondAction)

    expect(showDialog.value).toBe(true)
    expect(pendingAction.value).toBe(firstAction)
  })

  it('confirmLeave runs the queued pendingAction and closes the dialog', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved' }
    mockStore.getters.getCurrentBookmarkHasChanges = true
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { guard, confirmLeave, showDialog } = useUnsavedChanges()

    const action = vi.fn()
    guard(action)
    expect(showDialog.value).toBe(true)

    confirmLeave()
    await nextTick()

    expect(action).toHaveBeenCalledTimes(1)
    expect(showDialog.value).toBe(false)
  })

  it('cancelLeave clears pending state and closes dialog without running action', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved' }
    mockStore.getters.getCurrentBookmarkHasChanges = true
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { guard, cancelLeave, showDialog } = useUnsavedChanges()

    const action = vi.fn()
    guard(action)

    cancelLeave()
    await nextTick()

    expect(action).not.toHaveBeenCalled()
    expect(showDialog.value).toBe(false)
  })

  it('registers clearUnsavedChanges that re-baselines the dirty state', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved' }
    mockStore.getters.getCurrentBookmarkHasChanges = true
    mockStore.getters.getBookmarksData = { filter: { foo: 'bar' } }
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install } = useUnsavedChanges()
    install()

    // Portal confirms "Leave" -> asks every app to clear via clearAll().
    window.__d2eUnsavedChangesRegistry?.clearAll()

    expect(mockStore.commit).toHaveBeenCalledWith('SET_ACTIVE_BOOKMARK_BASELINE', { filter: { foo: 'bar' } })
  })

  it('clearUnsavedChanges is a no-op when there is no active bookmark', async () => {
    mockStore.getters.getActiveBookmark = null
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install } = useUnsavedChanges()
    install()

    window.__d2eUnsavedChangesRegistry?.clearAll()

    expect(mockStore.commit).not.toHaveBeenCalled()
  })

  it('beforeunload preventDefault when dirty', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved' }
    mockStore.getters.getCurrentBookmarkHasChanges = true
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install } = useUnsavedChanges()
    install()

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent
    Object.defineProperty(event, 'returnValue', { value: '', writable: true })
    eventListeners.beforeunload[0](event)

    expect(event.defaultPrevented).toBe(true)
  })

  it('beforeunload does not preventDefault when not dirty', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install } = useUnsavedChanges()
    install()

    const event = new Event('beforeunload', { cancelable: true }) as BeforeUnloadEvent
    Object.defineProperty(event, 'returnValue', { value: '', writable: true })
    eventListeners.beforeunload[0](event)

    expect(event.defaultPrevented).toBe(false)
  })
})
