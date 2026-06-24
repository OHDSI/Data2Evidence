import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useAtlasStore } from '../atlas'

describe('stores/atlas', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('openAtlas maps the cohort definitions list path to the Atlas3 route', () => {
    const store = useAtlasStore()

    store.openAtlas('/#/cohortdefinitions')

    expect(store.showAtlas).toBe(true)
    expect(store.atlasPath).toBe('/#/cohorts')
  })

  it('openAtlas maps a specific cohort definition path to the Atlas3 route', () => {
    const store = useAtlasStore()

    store.openAtlas('/#/cohortdefinition/123')

    expect(store.showAtlas).toBe(true)
    expect(store.atlasPath).toBe('/#/cohorts/123')
  })

  it('openAtlas passes through paths that are already Atlas3 routes', () => {
    const store = useAtlasStore()

    store.openAtlas('/#/cohorts/9')

    expect(store.atlasPath).toBe('/#/cohorts/9')
  })

  it('openAtlas defaults an empty path to the cohorts list', () => {
    const store = useAtlasStore()

    store.openAtlas('')

    expect(store.atlasPath).toBe('/#/cohorts')
  })

  it('closeAtlas resets atlas visibility and path atomically', () => {
    const store = useAtlasStore()
    store.openAtlas('/#/cohortdefinitions')

    store.closeAtlas()

    expect(store.showAtlas).toBe(false)
    expect(store.atlasPath).toBe('')
  })
})
