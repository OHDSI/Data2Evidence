import { describe, expect, it } from 'vitest'
import { isValidHttpUrl } from '../urlUtils'

describe('isValidHttpUrl', () => {
  it('accepts http URLs', () => {
    expect(isValidHttpUrl('http://example.com')).toBe(true)
  })

  it('accepts https URLs', () => {
    expect(isValidHttpUrl('https://viewer.local:8042/ohif/viewer?StudyInstanceUIDs=1.2.3')).toBe(true)
  })

  it('rejects non-http(s) schemes', () => {
    expect(isValidHttpUrl('javascript:alert(1)')).toBe(false)
    expect(isValidHttpUrl('data:text/html,<script>alert(1)</script>')).toBe(false)
    expect(isValidHttpUrl('ftp://example.com/file')).toBe(false)
    expect(isValidHttpUrl('file:///etc/passwd')).toBe(false)
  })

  it('rejects empty, whitespace, and null-ish values', () => {
    expect(isValidHttpUrl('')).toBe(false)
    expect(isValidHttpUrl('   ')).toBe(false)
    expect(isValidHttpUrl(null)).toBe(false)
    expect(isValidHttpUrl(undefined)).toBe(false)
  })

  it('rejects non-string values', () => {
    expect(isValidHttpUrl(123)).toBe(false)
    expect(isValidHttpUrl({})).toBe(false)
    expect(isValidHttpUrl(['http://example.com'])).toBe(false)
  })

  it('rejects malformed URLs', () => {
    expect(isValidHttpUrl('not a url')).toBe(false)
    expect(isValidHttpUrl('http://')).toBe(false)
    expect(isValidHttpUrl('://missing-scheme')).toBe(false)
  })

  it('trims surrounding whitespace before validating', () => {
    expect(isValidHttpUrl('  https://example.com  ')).toBe(true)
  })
})
