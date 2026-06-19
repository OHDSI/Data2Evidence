import { describe, expect, it } from 'vitest'
import defaultStore, { createStore } from '../index'

describe('store/index', () => {
  it('createStore returns a fresh store instance on each call', () => {
    const storeA = createStore()
    const storeB = createStore()

    expect(storeA).not.toBe(storeB)
  })

  it('default export remains a usable singleton store', () => {
    expect(defaultStore).toBeTruthy()
    expect(defaultStore.state).toBeTypeOf('object')
  })
})
