import { assertEquals } from '@std/assert'
import { DEFAULT_AUTHZ_FRESHNESS_SKEW_MS, isTokenAuthzFresh, parseSkewMs } from './authz-freshness.ts'

const SKEW_MS = 2000

Deno.test('null authz_changed_at means the token is fresh', () => {
  assertEquals(isTokenAuthzFresh(1_700_000_000, null, SKEW_MS), true)
})

Deno.test('token issued after the change is fresh', () => {
  assertEquals(isTokenAuthzFresh(1_700_000_010, new Date(1_700_000_000_000), SKEW_MS), true)
})

Deno.test('token issued well before the change is stale', () => {
  assertEquals(isTokenAuthzFresh(1_699_999_000, new Date(1_700_000_000_000), SKEW_MS), false)
})

Deno.test('token issued in the same second as the change is stale (iat has second granularity)', () => {
  // change at 1_700_000_000.400s; a token minted at 1_700_000_000.100s also reports iat=1_700_000_000
  assertEquals(isTokenAuthzFresh(1_700_000_000, new Date(1_700_000_000_400), 0), false)
})

Deno.test('clock skew allowance keeps a token minted just before the change fresh', () => {
  assertEquals(isTokenAuthzFresh(1_699_999_999, new Date(1_700_000_001_000), SKEW_MS), true)
})

Deno.test('missing iat is treated as stale when a change is recorded', () => {
  assertEquals(isTokenAuthzFresh(undefined, new Date(1_700_000_000_000), SKEW_MS), false)
})

Deno.test('missing iat with no recorded change is still fresh', () => {
  assertEquals(isTokenAuthzFresh(undefined, null, SKEW_MS), true)
})

Deno.test('an unusable skew degrades to no allowance instead of failing every comparison', () => {
  // A NaN skew must not make a genuinely fresh token look stale — that would
  // lock out every signed-in user at once.
  assertEquals(isTokenAuthzFresh(1_700_000_010, new Date(1_700_000_000_000), NaN), true)
  assertEquals(isTokenAuthzFresh(1_700_000_010, new Date(1_700_000_000_000), Infinity), true)
  // ...and it must not make a genuinely stale token look fresh either.
  assertEquals(isTokenAuthzFresh(1_699_999_000, new Date(1_700_000_000_000), NaN), false)
})

Deno.test('parseSkewMs falls back for unset, empty and blank values', () => {
  assertEquals(parseSkewMs(undefined), DEFAULT_AUTHZ_FRESHNESS_SKEW_MS)
  assertEquals(parseSkewMs(null), DEFAULT_AUTHZ_FRESHNESS_SKEW_MS)
  // compose declaring the var with no value: Number('') is 0, which would
  // silently drop the allowance to zero.
  assertEquals(parseSkewMs(''), DEFAULT_AUTHZ_FRESHNESS_SKEW_MS)
  assertEquals(parseSkewMs('   '), DEFAULT_AUTHZ_FRESHNESS_SKEW_MS)
})

Deno.test('parseSkewMs falls back for non-numeric and negative values', () => {
  // Number('2000ms') is NaN, which would mark every token stale.
  assertEquals(parseSkewMs('2000ms'), DEFAULT_AUTHZ_FRESHNESS_SKEW_MS)
  assertEquals(parseSkewMs('abc'), DEFAULT_AUTHZ_FRESHNESS_SKEW_MS)
  assertEquals(parseSkewMs('-1'), DEFAULT_AUTHZ_FRESHNESS_SKEW_MS)
  assertEquals(parseSkewMs('Infinity'), DEFAULT_AUTHZ_FRESHNESS_SKEW_MS)
})

Deno.test('parseSkewMs honours valid values, including an explicit zero', () => {
  assertEquals(parseSkewMs('5000'), 5000)
  assertEquals(parseSkewMs(' 5000 '), 5000)
  assertEquals(parseSkewMs('0'), 0)
  assertEquals(parseSkewMs('1500.9'), 1500)
})

Deno.test('a misconfigured skew cannot lock out a user with a fresh token', () => {
  // End-to-end of the hardening: the raw env value goes through parseSkewMs
  // before it ever reaches the comparison.
  const changedAt = new Date(1_700_000_000_000)
  for (const raw of ['', '   ', 'abc', '-1', undefined]) {
    assertEquals(isTokenAuthzFresh(1_700_000_010, changedAt, parseSkewMs(raw)), true)
    assertEquals(isTokenAuthzFresh(1_699_999_000, changedAt, parseSkewMs(raw)), false)
  }
})
