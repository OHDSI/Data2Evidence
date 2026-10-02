import { describe, expect, it } from 'vitest'
import { sortByLabel } from '../sortByLabel'

describe('sortByLabel', () => {
  it('orders items A to Z by label', () => {
    const items = [
      { label: 'Dummy C', value: 'c' },
      { label: 'Demo dataset', value: 'demo' },
      { label: 'Dummy A', value: 'a' },
    ]
    expect(sortByLabel(items).map(item => item.value)).toEqual(['demo', 'a', 'c'])
  })

  it('ignores case', () => {
    const items = [
      { label: 'dataloadtest', value: 'lower' },
      { label: 'Demo dataset', value: 'upper' },
      { label: 'AWS', value: 'aws' },
    ]
    expect(sortByLabel(items).map(item => item.value)).toEqual(['aws', 'lower', 'upper'])
  })

  it('orders numbers inside labels by value', () => {
    const items = [
      { label: 'data 20', value: '20' },
      { label: 'data 1408', value: '1408' },
      { label: 'data 3', value: '3' },
    ]
    expect(sortByLabel(items).map(item => item.value)).toEqual(['3', '20', '1408'])
  })

  it('returns a new array and leaves the input unchanged', () => {
    const items = [
      { label: 'B', value: 'b' },
      { label: 'A', value: 'a' },
    ]
    const sorted = sortByLabel(items)
    expect(sorted).not.toBe(items)
    expect(items.map(item => item.value)).toEqual(['b', 'a'])
  })
})
