# Cross-App Unsaved-Changes Guard — Integration Guide

This guide explains how any micro-frontend (single-spa app) in the portal can
participate in the shared "unsaved changes" guard, so the user is warned before
navigating away while they have unsaved work.

## How it works

There are three layers. A new app only needs to wire up layers 1–2; the portal
provides layer 3.

1. **Native page exit** (`beforeunload`) — warns on reload / tab close / external
   navigation. Each app registers its own listener. This is the only
   browser-guaranteed layer.
2. **Cross-app registry** (`window.__d2eUnsavedChangesRegistry`) — each app
   publishes a synchronous `hasUnsavedChanges()` callback so the portal can ask
   "is anybody dirty?" before it navigates.
3. **Portal in-app navigation guard** — the portal intercepts React-Router
   `push`/`replace` (link/menu navigation between plugins). If any app is dirty,
   it shows the shared dialog instead of navigating; on "Leave" it calls
   `clearAll()` and proceeds.

> **Not covered:** the browser **Back/Forward** button. This cannot be reliably
> blocked in the current single-spa + declarative-React-Router setup — see
> `UNSAVED_CHANGES_BACK_BUTTON_LIMITATION.md`. Destructive exits (reload/close)
> are still covered by layer 1.

## The registry contract

The registry is exposed on `window.__d2eUnsavedChangesRegistry` (created by the
first app that loads, shared cross-framework). Reference implementation:
`apps/vue-mri-ui-lib/src/shared/unsavedChangesRegistry.ts`.

```ts
interface UnsavedChangesRegistration {
  // Synchronous. Return true while the app has unsaved work.
  hasUnsavedChanges: () => boolean
  // Optional. Called when the user confirms leaving; reset your dirty state so
  // you do not re-block the navigation that is about to happen.
  clearUnsavedChanges?: () => void
}

interface D2EUnsavedChangesRegistry {
  register: (appName: string, api: UnsavedChangesRegistration) => void
  unregister: (appName: string) => void
  hasAnyUnsavedChanges: () => boolean      // used by the portal guard
  getDirtyApps: () => string[]
  clearAll: () => void                     // calls every app's clearUnsavedChanges
}

declare global {
  interface Window {
    __d2eUnsavedChangesRegistry?: D2EUnsavedChangesRegistry
  }
}
```

`hasUnsavedChanges` **must be synchronous and cheap** — the portal calls it
during navigation.

## Integrating a new app

### 1. On mount: register + add `beforeunload`

```ts
const APP_NAME = 'my-app'

const isDirty = (): boolean => {
  // however your app computes it (store getter, form state, etc.)
  return store.hasUnsavedChanges
}

const handleBeforeUnload = (e: BeforeUnloadEvent): void => {
  if (!isDirty()) return
  e.preventDefault()
  e.returnValue = ''
}

function install() {
  window.__d2eUnsavedChangesRegistry?.register(APP_NAME, {
    hasUnsavedChanges: isDirty,
    clearUnsavedChanges: () => {
      // Make the app report not-dirty (e.g. re-baseline or discard the draft)
      store.discardUnsavedChanges()
    },
  })
  window.addEventListener('beforeunload', handleBeforeUnload)
}
```

> If the registry may not exist yet, guard with `?.` (as above) or create it from
> the shared module. Importing `unsavedChangesRegistry` from
> `apps/vue-mri-ui-lib/src/shared/unsavedChangesRegistry.ts` both creates and
> returns the singleton.

### 2. On unmount: unregister + clean up

```ts
function uninstall() {
  window.__d2eUnsavedChangesRegistry?.unregister(APP_NAME)
  window.removeEventListener('beforeunload', handleBeforeUnload)
}
```

Always `unregister` on unmount — single-spa keeps module state alive, and a stale
registration would make the portal think your (unmounted) app is still dirty.

### 3. (Optional) Guard your own in-app actions

For navigations the portal can't see (e.g. switching a sub-view, loading a draft
over the current one), gate them yourself:

```ts
function guard(action: () => void) {
  if (!isDirty()) return action()
  showYourDialog().then(confirmed => confirmed && action())
}
```

## Reference implementation (Vue / PA)

The Patient Analytics app wires all of this in
`apps/vue-mri-ui-lib/src/composables/useUnsavedChanges.ts`:

- `install()` registers `{ hasUnsavedChanges, clearUnsavedChanges }` and the
  `beforeunload` listener (called from `App.vue` `onMounted`).
- `uninstall()` reverses it (`onBeforeUnmount`).
- `guard(action)` covers in-app flows (dataset switch, deep-link, Atlas load).
- Dirty state comes from the Vuex getter `getCurrentBookmarkHasChanges`.

The portal side lives in
`apps/portal/src/components/NavigationGuardRouter/` (the history-wrapping router)
and `apps/portal/src/components/UnsavedChangesDialog/` (the shared dialog).

## Checklist for a new app

- [ ] `register(appName, { hasUnsavedChanges, clearUnsavedChanges })` on mount
- [ ] `hasUnsavedChanges()` is synchronous and cheap
- [ ] `beforeunload` listener added on mount
- [ ] `unregister(appName)` + listener removed on unmount
- [ ] `clearUnsavedChanges()` makes the app report not-dirty
- [ ] (optional) in-app `guard()` for navigations the portal can't intercept
