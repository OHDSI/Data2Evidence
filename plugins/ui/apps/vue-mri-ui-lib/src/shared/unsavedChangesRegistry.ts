/**
 * Cross-app dirty-state registry.
 *
 * Microfrontends register a `hasUnsavedChanges()` callback here so the portal
 * shell can synchronously query whether any mounted app has uncommitted work
 * before allowing React Router navigation.
 *
 * The registry is exposed on `window.__d2eUnsavedChangesRegistry` so that apps
 * built in different frameworks can share it without a common build dependency.
 *
 * Contract:
 *   register(appName: string, api: { hasUnsavedChanges(): boolean }): void
 *   unregister(appName: string): void
 *   hasAnyUnsavedChanges(): boolean
 *   getDirtyApps(): string[]
 */

export interface UnsavedChangesRegistration {
  hasUnsavedChanges: () => boolean
  /**
   * Optional acknowledge hook. Called when the user confirms leaving despite
   * unsaved changes, so the app can reset its dirty state (e.g. re-baseline).
   */
  clearUnsavedChanges?: () => void
}

export interface D2EUnsavedChangesRegistry {
  register: (appName: string, api: UnsavedChangesRegistration) => void
  unregister: (appName: string) => void
  hasAnyUnsavedChanges: () => boolean
  getDirtyApps: () => string[]
  /** Ask every registered app to clear its unsaved-changes state. */
  clearAll: () => void
}

declare global {
  interface Window {
    __d2eUnsavedChangesRegistry?: D2EUnsavedChangesRegistry
  }
}

const registry = new Map<string, UnsavedChangesRegistration>()

function createRegistry(): D2EUnsavedChangesRegistry {
  return {
    register(appName, api) {
      registry.set(appName, api)
    },
    unregister(appName) {
      registry.delete(appName)
    },
    hasAnyUnsavedChanges() {
      for (const api of registry.values()) {
        if (api.hasUnsavedChanges()) {
          return true
        }
      }
      return false
    },
    getDirtyApps() {
      const dirtyApps: string[] = []
      for (const [appName, api] of registry.entries()) {
        if (api.hasUnsavedChanges()) {
          dirtyApps.push(appName)
        }
      }
      return dirtyApps
    },
    clearAll() {
      for (const api of registry.values()) {
        api.clearUnsavedChanges?.()
      }
    },
  }
}

export const MRI_APP_NAME = 'mri'

export const unsavedChangesRegistry: D2EUnsavedChangesRegistry = window.__d2eUnsavedChangesRegistry ?? createRegistry()

if (!window.__d2eUnsavedChangesRegistry) {
  window.__d2eUnsavedChangesRegistry = unsavedChangesRegistry
}
