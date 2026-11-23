import { describe, expect, it } from 'vitest'
import { isOpenable } from '../explorationTableRow'

describe('isOpenable', () => {
  it('opens a row that has a bookmark', () => {
    expect(isOpenable({ bmkId: 'bmk-1' })).toBe(true)
  })

  it('does not open an Atlas-only or materialised-only row', () => {
    expect(isOpenable({ bmkId: null })).toBe(false)
    expect(isOpenable({ bmkId: '' })).toBe(false)
  })
})
