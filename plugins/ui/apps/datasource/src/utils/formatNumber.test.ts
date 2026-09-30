import { describe, it, expect } from 'vitest'
import { formatNumber } from './formatNumber'

describe('formatNumber', () => {
  it('adds thousands separators to a numeric string', () => {
    expect(formatNumber('1223234')).toBe('1,223,234')
  })

  it('passes a plain (non-numeric) string through unchanged', () => {
    expect(formatNumber('omop5-4')).toBe('omop5-4')
  })

  it('returns an empty string for null, undefined, or empty input', () => {
    expect(formatNumber(null)).toBe('')
    expect(formatNumber(undefined)).toBe('')
    expect(formatNumber('')).toBe('')
  })

  it('accepts a number directly', () => {
    expect(formatNumber(2694)).toBe('2,694')
  })
})
