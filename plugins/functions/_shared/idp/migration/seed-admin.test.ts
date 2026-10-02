import { assertEquals, assertRejects } from '@std/assert'
import type { FederationAdmin } from './federation-admin.ts'
import { ensureSeedAdmin, HttpSeedAccounts, SEED_ADMIN_ROLES, type SeedAccounts } from './seed-admin.ts'

const SEED_USER = JSON.stringify({ username: 'admin', initialPassword: 'Initial123!' })

class FakeAdmin implements FederationAdmin {
  assigned: Array<[string, string]> = []
  failFor = new Set<string>()
  upsertProvider(): Promise<void> { throw new Error('unexpected') }
  setProviderEnabled(): Promise<'ok' | 'unknown_provider'> { throw new Error('unexpected') }
  link(): never { throw new Error('unexpected') }
  assignRole(userId: string, role: string): Promise<void> {
    if (this.failFor.has(role)) return Promise.reject(new Error(`assign ${role} failed: 500`))
    this.assigned.push([userId, role])
    return Promise.resolve()
  }
}

const accounts = (over: Partial<SeedAccounts> = {}): SeedAccounts & { calls: string[] } => {
  const calls: string[] = []
  return {
    calls,
    signIn: (email, password) => {
      calls.push(`signIn ${email} ${password}`)
      return over.signIn ? over.signIn(email, password) : Promise.resolve('sub-1')
    },
    create: (email, password) => {
      calls.push(`create ${email} ${password}`)
      return over.create ? over.create(email, password) : Promise.resolve('sub-new')
    }
  }
}

const silent = () => {}

Deno.test('the seed admin is granted the system and user admin roles', () => {
  assertEquals(SEED_ADMIN_ROLES, ['role.systemadmin', 'admin', 'role.useradmin'])
})

Deno.test('an existing seed account is resolved by signing in and granted every admin role', async () => {
  const admin = new FakeAdmin()
  const acc = accounts()
  const userId = await ensureSeedAdmin({ seedUser: SEED_USER, userDomain: 'd2e.local' }, acc, admin, silent)
  assertEquals(userId, 'sub-1')
  assertEquals(acc.calls, ['signIn admin@d2e.local Initial123!'])
  assertEquals(admin.assigned, SEED_ADMIN_ROLES.map(r => ['sub-1', r]))
})

Deno.test('a missing seed account is created and then granted its roles', async () => {
  const admin = new FakeAdmin()
  const acc = accounts({ signIn: () => Promise.resolve(undefined) })
  const userId = await ensureSeedAdmin({ seedUser: SEED_USER, userDomain: 'd2e.local' }, acc, admin, silent)
  assertEquals(userId, 'sub-new')
  assertEquals(acc.calls[1], 'create admin@d2e.local Initial123!')
  assertEquals(admin.assigned.map(([u]) => u), SEED_ADMIN_ROLES.map(() => 'sub-new'))
})

Deno.test('an email username is used as is', async () => {
  const acc = accounts()
  await ensureSeedAdmin(
    { seedUser: JSON.stringify({ username: 'root@example.org', initialPassword: 'pw' }), userDomain: 'd2e.local' },
    acc, new FakeAdmin(), silent
  )
  assertEquals(acc.calls, ['signIn root@example.org pw'])
})

Deno.test('an account whose subject cannot be resolved is logged and left alone', async () => {
  const admin = new FakeAdmin()
  const logs: string[] = []
  const acc = accounts({ signIn: () => Promise.resolve(undefined), create: () => Promise.resolve('exists') })
  assertEquals(await ensureSeedAdmin({ seedUser: SEED_USER, userDomain: 'd2e.local' }, acc, admin, m => logs.push(m)), undefined)
  assertEquals(admin.assigned, [])
  assertEquals(logs.length, 1)
})

Deno.test('an account whose password changed is resolved from its usermgmt subject', async () => {
  const admin = new FakeAdmin()
  const lookedUp: string[] = []
  const acc = accounts({ signIn: () => Promise.resolve(undefined), create: () => Promise.resolve('exists') })
  const userId = await ensureSeedAdmin(
    {
      seedUser: SEED_USER,
      userDomain: 'd2e.local',
      storedSubject: email => {
        lookedUp.push(email)
        return Promise.resolve('sub-stored')
      }
    },
    acc, admin, silent
  )
  assertEquals(userId, 'sub-stored')
  assertEquals(lookedUp, ['admin@d2e.local'])
  assertEquals(admin.assigned, SEED_ADMIN_ROLES.map(r => ['sub-stored', r]))
})

Deno.test('a usermgmt lookup that fails is logged rather than thrown', async () => {
  const admin = new FakeAdmin()
  const logs: string[] = []
  const acc = accounts({ signIn: () => Promise.resolve(undefined), create: () => Promise.resolve('exists') })
  const userId = await ensureSeedAdmin(
    { seedUser: SEED_USER, userDomain: 'd2e.local', storedSubject: () => Promise.reject(new Error('db down')) },
    acc, admin, m => logs.push(m)
  )
  assertEquals(userId, undefined)
  assertEquals(admin.assigned, [])
  assertEquals(logs.some(l => l.includes('db down')), true)
})

Deno.test('without a usable seed user nothing is called', async () => {
  for (const seedUser of [undefined, '', 'not json', JSON.stringify({ username: 'admin' })]) {
    const admin = new FakeAdmin()
    const acc = accounts()
    assertEquals(await ensureSeedAdmin({ seedUser, userDomain: 'd2e.local' }, acc, admin, silent), undefined)
    assertEquals(acc.calls, [])
    assertEquals(admin.assigned, [])
  }
})

Deno.test('one failed role does not stop the others and nothing is thrown', async () => {
  const admin = new FakeAdmin()
  admin.failFor.add('admin')
  const logs: string[] = []
  await ensureSeedAdmin({ seedUser: SEED_USER, userDomain: 'd2e.local' }, accounts(), admin, m => logs.push(m))
  assertEquals(admin.assigned, [['sub-1', 'role.systemadmin'], ['sub-1', 'role.useradmin']])
  assertEquals(logs.some(l => l.includes('admin failed')), true)
})

Deno.test('an unreachable trex is logged rather than thrown', async () => {
  const admin = new FakeAdmin()
  const logs: string[] = []
  const acc = accounts({ signIn: () => Promise.reject(new Error('trex unreachable')) })
  assertEquals(await ensureSeedAdmin({ seedUser: SEED_USER, userDomain: 'd2e.local' }, acc, admin, m => logs.push(m)), undefined)
  assertEquals(admin.assigned, [])
  assertEquals(logs.some(l => l.includes('trex unreachable')), true)
})

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

const jwt = (claims: Record<string, unknown>) =>
  `h.${btoa(JSON.stringify(claims)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.s`

const http = (impl: typeof fetch) =>
  new HttpSeedAccounts({ authUrl: 'http://trex/auth/v1', serviceRoleKey: 'k', fetchImpl: impl, attempts: 3, delayMs: 0 })

Deno.test('signIn reads the subject from a password grant', async () => {
  const f = fakeFetch([new Response(JSON.stringify({ access_token: jwt({ sub: 'sub-9' }) }), { status: 200 })])
  assertEquals(await http(f.impl).signIn('a@x.test', 'pw'), 'sub-9')
  assertEquals(f.calls[0].url, 'http://trex/auth/v1/token?grant_type=password')
  assertEquals(f.calls[0].body, { email: 'a@x.test', password: 'pw' })
  assertEquals(f.calls[0].auth, null)
})

Deno.test('a rejected sign-in resolves no subject', async () => {
  const f = fakeFetch([new Response('{"error":"invalid_grant"}', { status: 400 })])
  assertEquals(await http(f.impl).signIn('a@x.test', 'pw'), undefined)
})

Deno.test('create uses the service-role key and reports an existing account', async () => {
  const f = fakeFetch([
    new Response(JSON.stringify({ id: 'sub-2' }), { status: 200 }),
    new Response('{"error":"user_already_exists"}', { status: 422 })
  ])
  const acc = http(f.impl)
  assertEquals(await acc.create('a@x.test', 'pw'), 'sub-2')
  assertEquals(f.calls[0].url, 'http://trex/auth/v1/admin/users')
  assertEquals(f.calls[0].auth, 'Bearer k')
  assertEquals(await acc.create('a@x.test', 'pw'), 'exists')
})

Deno.test('create reports a refused password instead of treating it as an existing account', async () => {
  const f = fakeFetch([
    new Response('{"error":"validation_failed","error_description":"Password must be at least 8 characters"}', { status: 422 })
  ])
  await assertRejects(() => http(f.impl).create('a@x.test', 'pw'), Error, 'Password must be at least 8 characters')
})

Deno.test('network errors are retried a bounded number of times', async () => {
  const f = fakeFetch([new TypeError('fetch failed'), new Response(JSON.stringify({ access_token: jwt({ sub: 's' }) }))])
  assertEquals(await http(f.impl).signIn('a@x.test', 'pw'), 's')
  assertEquals(f.calls.length, 2)

  const g = fakeFetch([new TypeError('a'), new TypeError('b'), new TypeError('c'), new TypeError('d')])
  await assertRejects(() => http(g.impl).signIn('a@x.test', 'pw'), Error, 'trex unreachable')
  assertEquals(g.calls.length, 3)
})
