import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { nextTick } from 'vue'

vi.mock('single-spa', () => ({
  navigateToUrl: vi.fn(),
}))

const mockStore = {
  getters: {
    getActiveBookmark: null as { isNew: boolean; bookmarkname?: string } | null,
    getCurrentBookmarkHasChanges: false,
  },
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
    vi.clearAllMocks()
  })

  afterEach(() => {
    window.addEventListener = originalAddEventListener
    window.removeEventListener = originalRemoveEventListener
  })

  const fireEvent = (name: string, detail?: unknown): Event => {
    const event = new CustomEvent(name, { detail, cancelable: true })
    eventListeners[name]?.forEach(handler => handler(event))
    return event
  }

  it('isDirty=false when no active bookmark', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { isDirty, showDialog } = useUnsavedChanges()

    expect(isDirty.value).toBe(false)
    expect(showDialog.value).toBe(false)
  })

  it('isDirty=true when active bookmark is new', async () => {
    mockStore.getters.getActiveBookmark = { isNew: true, bookmarkname: 'Untitled' }

    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { isDirty } = useUnsavedChanges()

    expect(isDirty.value).toBe(true)
  })

  it('isDirty=true when current bookmark has changes', async () => {
    mockStore.getters.getActiveBookmark = { isNew: false, bookmarkname: 'Saved' }
    mockStore.getters.getCurrentBookmarkHasChanges = true

    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { isDirty } = useUnsavedChanges()

    expect(isDirty.value).toBe(true)
  })

  it('registers beforeunload and single-spa:before-routing-event listeners on install', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install } = useUnsavedChanges()

    install()

    expect(eventListeners.beforeunload).toBeDefined()
    expect(eventListeners.beforeunload.length).toBe(1)
    expect(eventListeners['single-spa:before-routing-event']).toBeDefined()
    expect(eventListeners['single-spa:before-routing-event'].length).toBe(1)
  })

  it('uninstall removes the listeners', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install, uninstall } = useUnsavedChanges()

    install()
    uninstall()

    expect(eventListeners.beforeunload?.length ?? 0).toBe(0)
    expect(eventListeners['single-spa:before-routing-event']?.length ?? 0).toBe(0)
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
    mockStore.getters.getActiveBookmark = { isNew: true }
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { guard, showDialog } = useUnsavedChanges()

    const action = vi.fn()
    guard(action)

    expect(action).not.toHaveBeenCalled()
    expect(showDialog.value).toBe(true)
  })

  it('confirmLeave runs the queued pendingAction and closes the dialog', async () => {
    mockStore.getters.getActiveBookmark = { isNew: true }
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
    mockStore.getters.getActiveBookmark = { isNew: true }
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { guard, cancelLeave, showDialog } = useUnsavedChanges()

    const action = vi.fn()
    guard(action)

    cancelLeave()
    await nextTick()

    expect(action).not.toHaveBeenCalled()
    expect(showDialog.value).toBe(false)
  })

  it('single-spa:before-routing-event opens dialog when dirty', async () => {
    mockStore.getters.getActiveBookmark = { isNew: true }
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install, showDialog, pendingUrl } = useUnsavedChanges()
    install()

    fireEvent('single-spa:before-routing-event', { newUrl: 'http://localhost:3000/another-app' })

    expect(showDialog.value).toBe(true)
    expect(pendingUrl.value).toBe('http://localhost:3000/another-app')
  })

  it('single-spa:before-routing-event does nothing when not dirty', async () => {
    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install, showDialog } = useUnsavedChanges()
    install()

    fireEvent('single-spa:before-routing-event', { newUrl: 'http://localhost:3000/another-app' })

    expect(showDialog.value).toBe(false)
  })

  it('confirmLeave after routing event navigates via single-spa', async () => {
    const { navigateToUrl } = await import('single-spa')
    mockStore.getters.getActiveBookmark = { isNew: true }

    const { useUnsavedChanges } = await import('../useUnsavedChanges')
    const { install, confirmLeave } = useUnsavedChanges()
    install()

    fireEvent('single-spa:before-routing-event', { newUrl: 'http://localhost:3000/another-app' })
    confirmLeave()
    await nextTick()

    expect(navigateToUrl).toHaveBeenCalledWith('http://localhost:3000/another-app')
  })

  it('beforeunload preventDefault when dirty', async () => {
    mockStore.getters.getActiveBookmark = { isNew: true }
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
