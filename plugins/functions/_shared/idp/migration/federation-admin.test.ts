import { assertEquals, assertRejects } from '@std/assert'
import { HttpFederationAdmin } from './federation-admin.ts'

type Call = { url: string; method: string; body: unknown; auth: string | null }

function fakeFetch(responses: Array<Response | Error>) {
  const calls: Call[] = []
  const impl = (async (input: string | URL | Request, init?: RequestInit) => {
    calls.push({
      url: String(input),
      method: init?.method ?? 'GET',
      body: init?.body ? JSON.parse(String(init.body)) : undefined,
      auth: new Headers(init?.headers).get('authorization')
    })
    const next = responses.shift()!
    if (next instanceof Error) throw next
    return next
  }) as typeof fetch
  return { calls, impl }
}

const admin = (impl: typeof fetch) =>
  new HttpFederationAdmin({ federationUrl: 'http://trex/fed', rolesUrl: 'http://trex/roles', serviceRoleKey: 'k', fetchImpl: impl, attempts: 3, delayMs: 0 })

Deno.test('link sends the identity and returns the outcome', async () => {
  const f = fakeFetch([new Response(JSON.stringify({ userId: 't1', outcome: 'created' }), { status: 200 })])
  const out = await admin(f.impl).link({ providerId: 'logto', accountId: 'l1', email: 'a@x.test', name: null, banned: false })
  assertEquals(out, { userId: 't1', outcome: 'created' })
  assertEquals(f.calls[0].method, 'PUT')
  assertEquals(f.calls[0].url, 'http://trex/fed/links')
  assertEquals(f.calls[0].auth, 'Bearer k')
})

Deno.test('link reports a conflict instead of throwing', async () => {
  const f = fakeFetch([new Response(JSON.stringify({ error: 'conflict', userId: 't9' }), { status: 409 })])
  assertEquals(
    await admin(f.impl).link({ providerId: 'logto', accountId: 'l1', email: 'a@x.test', name: null, banned: false }),
    { conflict: true, userId: 't9' }
  )
})

Deno.test('a network error is retried, an HTTP error is not', async () => {
  const f = fakeFetch([new TypeError('fetch failed'), new Response(null, { status: 204 })])
  await admin(f.impl).assignRole('t1', 'role.useradmin')
  assertEquals(f.calls.length, 2)

  const g = fakeFetch([new Response('nope', { status: 500 })])
  await assertRejects(() => admin(g.impl).assignRole('t1', 'x'))
  assertEquals(g.calls.length, 1)
})

Deno.test('disabling an unknown provider is reported, not thrown', async () => {
  const f = fakeFetch([new Response(JSON.stringify({ error: 'unknown_provider' }), { status: 404 })])
  assertEquals(await admin(f.impl).setProviderEnabled('logto', false), 'unknown_provider')
})

Deno.test('a 200 response missing userId is rejected instead of flowing through as undefined', async () => {
  const f = fakeFetch([new Response(JSON.stringify({ outcome: 'created' }), { status: 200 })])
  await assertRejects(() => admin(f.impl).link({ providerId: 'logto', accountId: 'l1', email: 'a@x.test', name: null, banned: false }))
})

Deno.test('no service-role key fails before anything goes on the wire', async () => {
  const f = fakeFetch([])
  const a = new HttpFederationAdmin({ federationUrl: 'http://trex/fed', rolesUrl: 'http://trex/roles', serviceRoleKey: '', fetchImpl: f.impl })
  await assertRejects(() => a.assignRole('t1', 'x'))
  assertEquals(f.calls.length, 0)
})

Deno.test('a 409 response missing userId is rejected instead of returning "undefined"', async () => {
  const f = fakeFetch([new Response(JSON.stringify({ error: 'conflict' }), { status: 409 })])
  await assertRejects(() => admin(f.impl).link({ providerId: 'logto', accountId: 'l1', email: 'a@x.test', name: null, banned: false }))
})

Deno.test('a validation error body is never echoed into the thrown message', async () => {
  const secretBody = JSON.stringify({ error: 'invalid', clientSecret: 'super-secret-value-12345' })
  const f = fakeFetch([new Response(secretBody, { status: 400 })])
  const err = await assertRejects(() => admin(f.impl).upsertProvider('logto', {
    displayName: 'Logto', clientId: 'cid', clientSecret: 'super-secret-value-12345', issuer: 'iss',
    authorizationEndpoint: 'ep', scopes: 'openid', groupsSource: 'none', autoProvision: false, enabled: true
  }))
  assertEquals((err as Error).message.includes('super-secret-value-12345'), false)
})

Deno.test('a long error body is capped rather than growing the error message unbounded', async () => {
  const f = fakeFetch([new Response('x'.repeat(5000), { status: 500 })])
  const err = await assertRejects(() => admin(f.impl).assignRole('t1', 'x'))
  assertEquals((err as Error).message.length < 300, true)
})

Deno.test('setProviderEnabled accepts a per-call attempts budget shorter than the client default', async () => {
  const f = fakeFetch([new TypeError('fetch failed'), new TypeError('fetch failed'), new Response(null, { status: 204 })])
  const a = new HttpFederationAdmin({ federationUrl: 'http://trex/fed', rolesUrl: 'http://trex/roles', serviceRoleKey: 'k', fetchImpl: f.impl, attempts: 10, delayMs: 0 })
  await assertRejects(() => a.setProviderEnabled('logto', false, { attempts: 2 }))
  assertEquals(f.calls.length, 2)
})
