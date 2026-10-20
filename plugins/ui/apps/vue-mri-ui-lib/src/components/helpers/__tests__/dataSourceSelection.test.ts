import { describe, expect, it } from 'vitest'
import { builderSwitchStep, fallbackDatasetId, toDataSourceItems } from '../dataSourceSelection'

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

describe('toDataSourceItems', () => {
  it('labels each source by its name and sorts A to Z', () => {
    expect(
      toDataSourceItems([
        { sourceKey: 'k2', sourceName: 'Beta' },
        { sourceKey: 'k1', sourceName: 'alpha' },
      ])
    ).toEqual([
      { label: 'alpha', value: 'k1' },
      { label: 'Beta', value: 'k2' },
    ])
  })

  it('falls back to the source key when a source has no name', () => {
    expect(toDataSourceItems([{ sourceKey: 'k1' }])).toEqual([{ label: 'k1', value: 'k1' }])
  })
})

describe('builderSwitchStep', () => {
  it('ignores an empty choice and the active source', () => {
    expect(builderSwitchStep('a', '', false)).toBe('ignore')
    expect(builderSwitchStep('a', 'a', true)).toBe('ignore')
  })

  it('asks to confirm closing the exploration when nothing is unsaved', () => {
    expect(builderSwitchStep('a', 'b', false)).toBe('confirm')
  })

  it('hands over to the unsaved-changes prompt when there are unsaved changes', () => {
    expect(builderSwitchStep('a', 'b', true)).toBe('guard')
  })
})
