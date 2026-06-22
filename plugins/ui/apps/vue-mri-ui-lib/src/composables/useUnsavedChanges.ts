import { ref, computed, ComputedRef, Ref } from 'vue'
import { useStore, Store } from 'vuex'
import { navigateToUrl } from 'single-spa'

type PendingAction = () => void

const showDialog = ref(false)
const pendingUrl = ref<string | null>(null)
const pendingAction = ref<PendingAction | null>(null)
let cachedStore: Store<unknown> | null = null
let bypassNextRoutingEvent = false

const getStore = (): Store<unknown> => {
  if (!cachedStore) {
    cachedStore = useStore()
  }
  return cachedStore
}

const setStore = (store: Store<unknown>): void => {
  cachedStore = store
}

const isDirty: ComputedRef<boolean> = computed(() => {
  const store = getStore()
  const activeBookmark = store?.getters?.getActiveBookmark
  if (!activeBookmark) return false
  return Boolean(activeBookmark.isNew) || Boolean(store.getters.getCurrentBookmarkHasChanges)
})

const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

const handleSingleSpaRouting = (event: Event): void => {
  if (bypassNextRoutingEvent) {
    bypassNextRoutingEvent = false
    return
  }
  if (!isDirty.value) return

  const routingEvent = event as CustomEvent<{ newUrl?: string }>
  routingEvent.preventDefault()
  pendingUrl.value = routingEvent.detail?.newUrl ?? window.location.href
  showDialog.value = true
}

const install = (): void => {
  window.addEventListener('beforeunload', handleBeforeUnload)
  window.addEventListener('single-spa:before-routing-event', handleSingleSpaRouting)
}

const uninstall = (): void => {
  window.removeEventListener('beforeunload', handleBeforeUnload)
  window.removeEventListener('single-spa:before-routing-event', handleSingleSpaRouting)
}

const guard = (action: PendingAction): void => {
  if (!isDirty.value) {
    action()
    return
  }
  pendingAction.value = action
  showDialog.value = true
}

const confirmLeave = (): void => {
  const action = pendingAction.value
  const url = pendingUrl.value
  showDialog.value = false
  pendingAction.value = null
  pendingUrl.value = null

  if (action) {
    action()
    return
  }
  if (url) {
    bypassNextRoutingEvent = true
    navigateToUrl(url)
  }
}

const cancelLeave = (): void => {
  showDialog.value = false
  pendingAction.value = null
  pendingUrl.value = null
}

export interface UnsavedChangesApi {
  isDirty: ComputedRef<boolean>
  showDialog: Ref<boolean>
  pendingUrl: Ref<string | null>
  pendingAction: Ref<PendingAction | null>
  install: () => void
  uninstall: () => void
  guard: (action: PendingAction) => void
  confirmLeave: () => void
  cancelLeave: () => void
}

export function useUnsavedChanges(storeOverride?: Store<unknown>): UnsavedChangesApi {
  if (storeOverride) {
    setStore(storeOverride)
  } else {
    void getStore()
  }
  return {
    isDirty,
    showDialog,
    pendingUrl,
    pendingAction,
    install,
    uninstall,
    guard,
    confirmLeave,
    cancelLeave,
  }
}
