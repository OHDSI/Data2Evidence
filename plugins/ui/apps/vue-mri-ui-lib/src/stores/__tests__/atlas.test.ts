import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAtlasStore } from '../atlas'

describe('stores/atlas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('openAtlas sets atlas visibility and path', () => {
    const store = useAtlasStore()

    store.openAtlas('/#/cohortdefinitions')

    expect(store.showAtlas).toBe(true)
    expect(store.atlasPath).toBe('/#/cohortdefinitions')
  })

  it('closeAtlas resets atlas visibility and path atomically', () => {
    const store = useAtlasStore()
    store.openAtlas('/#/cohortdefinitions')

    store.closeAtlas()

    expect(store.showAtlas).toBe(false)
    expect(store.atlasPath).toBe('')
  })
})
