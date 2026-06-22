import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { unsavedChangesRegistry, MRI_APP_NAME } from '../unsavedChangesRegistry'

describe('unsavedChangesRegistry', () => {
  beforeEach(() => {
    unsavedChangesRegistry.unregister(MRI_APP_NAME)
    unsavedChangesRegistry.unregister('test-clean')
    unsavedChangesRegistry.unregister('test-dirty')
  })

  afterEach(() => {
    unsavedChangesRegistry.unregister(MRI_APP_NAME)
    unsavedChangesRegistry.unregister('test-clean')
    unsavedChangesRegistry.unregister('test-dirty')
  })

  it('exposes the registry on window', () => {
    expect(window.__d2eUnsavedChangesRegistry).toBe(unsavedChangesRegistry)
  })

  it('tracks dirty state from registered apps', () => {
    expect(unsavedChangesRegistry.hasAnyUnsavedChanges()).toBe(false)

    unsavedChangesRegistry.register('test-clean', { hasUnsavedChanges: () => false })
    unsavedChangesRegistry.register('test-dirty', { hasUnsavedChanges: () => true })

    expect(unsavedChangesRegistry.hasAnyUnsavedChanges()).toBe(true)
    expect(unsavedChangesRegistry.getDirtyApps()).toEqual(['test-dirty'])
  })

  it('removes apps on unregister', () => {
    unsavedChangesRegistry.register('test-dirty', { hasUnsavedChanges: () => true })
    expect(unsavedChangesRegistry.hasAnyUnsavedChanges()).toBe(true)

    unsavedChangesRegistry.unregister('test-dirty')
    expect(unsavedChangesRegistry.hasAnyUnsavedChanges()).toBe(false)
    expect(unsavedChangesRegistry.getDirtyApps()).toEqual([])
  })
})
