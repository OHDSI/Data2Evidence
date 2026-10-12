import { describe, expect, it } from 'vitest'
import { fallbackDatasetId } from '../dataSourceSelection'

describe('fallbackDatasetId', () => {
  it('returns the first accessible source when the active one is not accessible', () => {
    expect(fallbackDatasetId('c', ['a', 'b'])).toBe('a')
  })

  it('keeps the active source when it is accessible', () => {
    expect(fallbackDatasetId('b', ['a', 'b'])).toBeUndefined()
  })

  it('does nothing while the list is empty or not yet loaded', () => {
    expect(fallbackDatasetId('c', [])).toBeUndefined()
  })
})
