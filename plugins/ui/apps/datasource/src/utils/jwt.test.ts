import { describe, it, expect } from 'vitest'
import { getIdpUserId } from './jwt'

function fakeJwt(payload: Record<string, unknown>): string {
  const header = btoa(JSON.stringify({ alg: 'none', typ: 'JWT' }))
  const body = btoa(JSON.stringify(payload))
  return `${header}.${body}.`
}

describe('getIdpUserId', () => {
  it('extracts the sub claim from a valid JWT', () => {
    const token = fakeJwt({ sub: 'idp-user-123', exp: 9999999999 })
    expect(getIdpUserId(token)).toBe('idp-user-123')
  })

  it('returns null for a null token', () => {
    expect(getIdpUserId(null)).toBeNull()
  })

  it('returns null for a malformed token', () => {
    expect(getIdpUserId('not-a-jwt')).toBeNull()
  })

  it('returns null when sub is missing', () => {
    const token = fakeJwt({ exp: 9999999999 })
    expect(getIdpUserId(token)).toBeNull()
  })
})
