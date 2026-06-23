import { ref, computed, ComputedRef, Ref } from 'vue'
import { useStore, Store } from 'vuex'
import { MRI_APP_NAME, unsavedChangesRegistry } from '../shared/unsavedChangesRegistry'

type PendingAction = () => void

const showDialog = ref(false)
const pendingAction = ref<PendingAction | null>(null)
let cachedStore: Store<unknown> | null = null
let installed = false

const getStore = (): Store<unknown> => {
  if (!cachedStore) {
    cachedStore = useStore()
  }
  return cachedStore
}

const setStore = (store: Store<unknown>): void => {
  cachedStore = store
}

const isRestoring = (): boolean => {
  const store = getStore()
  return Boolean(store?.getters?.getIsRestoringBookmark)
}

const isDirty: ComputedRef<boolean> = computed(() => {
  const store = getStore()
  if (isRestoring()) return false
  if (!store?.getters?.getActiveBookmark) return false
  return Boolean(store.getters.getCurrentBookmarkHasChanges)
})

const handleBeforeUnload = (event: BeforeUnloadEvent): void => {
  if (!isDirty.value) return
  event.preventDefault()
  event.returnValue = ''
}

/**
 * Reset the dirty baseline to the current state. Invoked by the portal shell
 * (via the cross-app registry) once the user confirms "Leave" in the portal's
 * dialog, so PA stops reporting dirty and does not re-block subsequent
 * cross-app navigation.
 */
const clearUnsavedChanges = (): void => {
  const store = getStore()
  if (!store?.getters?.getActiveBookmark) return
  store.commit('SET_ACTIVE_BOOKMARK_BASELINE', store.getters.getBookmarksData)
}

const install = (): void => {
  if (installed) return
  installed = true
  unsavedChangesRegistry.register(MRI_APP_NAME, {
    hasUnsavedChanges: () => isDirty.value,
    clearUnsavedChanges,
  })
  window.addEventListener('beforeunload', handleBeforeUnload)
}

const uninstall = (): void => {
  if (!installed) return
  installed = false
  unsavedChangesRegistry.unregister(MRI_APP_NAME)
  window.removeEventListener('beforeunload', handleBeforeUnload)
}

const guard = (action: PendingAction): void => {
  if (showDialog.value) return
  if (!isDirty.value) {
    action()
    return
  }
  pendingAction.value = action
  showDialog.value = true
}

const confirmLeave = (): void => {
  const action = pendingAction.value
  showDialog.value = false
  pendingAction.value = null
  if (action) {
    action()
  }
}

const cancelLeave = (): void => {
  showDialog.value = false
  pendingAction.value = null
}

export interface UnsavedChangesApi {
  isDirty: ComputedRef<boolean>
  showDialog: Ref<boolean>
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
    pendingAction,
    install,
    uninstall,
    guard,
    confirmLeave,
    cancelLeave,
  }
}
