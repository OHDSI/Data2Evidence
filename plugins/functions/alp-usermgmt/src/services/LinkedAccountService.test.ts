import { assertEquals, assertRejects, assertExists } from 'jsr:@std/assert'
import { Buffer } from 'buffer'
import { LinkedAccountService } from './LinkedAccountService.ts'
import { generateKey, encryptToken, decryptToken } from '../utils/crypto.ts'

const encryptionKey = generateKey()
const cfg = { encryptionKey, stateTtlSeconds: 600, refreshSkewSeconds: 60 }

function fakeApi(overrides: Partial<any> = {}) {
  return {
    buildAuthorizeUrl: ({ state, codeChallenge }: any) =>
      `https://phn.example/oauth/authorize/?state=${state}&code_challenge=${codeChallenge}`,
    exchangeCode: async (_p: any) => ({ accessToken: 'AT', refreshToken: 'RT', expiresIn: 3600, scope: 'credentialing:read' }),
    refresh: async (_rt: any) => ({ accessToken: 'AT2', refreshToken: 'RT2', expiresIn: 3600, scope: 'credentialing:read' }),
    userinfo: async (_at: any) => ({ sub: 'phn-1', username: 'alice' }),
    revoke: async (_t: any) => {},
    ...overrides,
  }
}

function fakeStateRepo() {
  const rows = new Map<string, any>()
  return {
    create: async (r: any) => { rows.set(r.state, r) },
    consume: async (s: string) => { const r = rows.get(s); rows.delete(s); return r ?? null },
    deleteExpired: async () => 0,
    _peek: (s: string) => rows.get(s),
  }
}

function fakeLinkedRepo() {
  const byUserProvider = new Map<string, any>()
  const byId = new Map<string, any>()
  return {
    upsert: async (f: any) => {
      const key = `${f.user_id}|${f.provider}`
      const existing = byUserProvider.get(key)
      const row = {
        id: existing?.id ?? f.id,
        userId: f.user_id,
        provider: f.provider,
        providerSubject: f.provider_subject,
        providerUsername: f.provider_username,
        accessTokenEnc: f.access_token_enc,
        refreshTokenEnc: f.refresh_token_enc,
        accessTokenExpires: f.access_token_expires,
        scopes: f.scopes,
        linkedAt: existing?.linkedAt ?? new Date(),
        updatedAt: new Date(),
        lastSyncedAt: existing?.lastSyncedAt ?? null,
        lastSyncError: existing?.lastSyncError ?? null,
      }
      byUserProvider.set(key, row)
      byId.set(row.id, row)
      return row
    },
    findByUserAndProvider: async (u: string, p: string) => byUserProvider.get(`${u}|${p}`) ?? null,
    updateSyncStatus: async (id: string, syncedAt: Date | null, err: string | null) => {
      const r = byId.get(id); if (r) { r.lastSyncedAt = syncedAt; r.lastSyncError = err }
    },
    deleteById: async (id: string) => {
      const r = byId.get(id); if (r) { byUserProvider.delete(`${r.userId}|${r.provider}`); byId.delete(id) }
    },
  }
}

Deno.test('startLink stores state + verifier and returns an authorize url with PKCE', async () => {
  const api = fakeApi(); const stateRepo = fakeStateRepo(); const linkedRepo = fakeLinkedRepo()
  const svc = new LinkedAccountService(api as any, stateRepo as any, linkedRepo as any, cfg)
  const { url } = await svc.startLink('user-1', 'physionet')
  const parsed = new URL(url)
  const state = parsed.searchParams.get('state')!
  assertExists(state)
  assertExists(parsed.searchParams.get('code_challenge'))
  const stored = stateRepo._peek(state)
  assertEquals(stored.userId, 'user-1')
  assertExists(stored.codeVerifier)
})

Deno.test('handleCallback rejects unknown state', async () => {
  const svc = new LinkedAccountService(fakeApi() as any, fakeStateRepo() as any, fakeLinkedRepo() as any, cfg)
  await assertRejects(() => svc.handleCallback({ state: 'nope', code: 'c' }), Error, 'invalid state')
})

Deno.test('handleCallback exchanges code + stores encrypted tokens', async () => {
  const api = fakeApi(); const stateRepo = fakeStateRepo(); const linkedRepo = fakeLinkedRepo()
  const svc = new LinkedAccountService(api as any, stateRepo as any, linkedRepo as any, cfg)
  const { url } = await svc.startLink('user-1', 'physionet')
  const state = new URL(url).searchParams.get('state')!
  const r = await svc.handleCallback({ state, code: 'authcode' })
  assertEquals(r.userId, 'user-1')
  assertEquals(r.providerSubject, 'phn-1')
  assertEquals(r.providerUsername, 'alice')
  // Stored ciphertext must decrypt back to 'AT'
  const at = decryptToken(r.accessTokenEnc.toString('base64'), encryptionKey)
  assertEquals(at, 'AT')
})

Deno.test('handleCallback rejects expired state', async () => {
  const api = fakeApi(); const stateRepo = fakeStateRepo(); const linkedRepo = fakeLinkedRepo()
  const svc = new LinkedAccountService(api as any, stateRepo as any, linkedRepo as any, cfg)
  const { url } = await svc.startLink('user-1', 'physionet')
  const state = new URL(url).searchParams.get('state')!
  // mutate stored expiry to the past
  stateRepo._peek(state).expiresAt = new Date(Date.now() - 1000)
  await assertRejects(() => svc.handleCallback({ state, code: 'c' }), Error, 'state expired')
})

Deno.test('getDecryptedAccessToken returns the stored token when not near expiry', async () => {
  const api = fakeApi(); const stateRepo = fakeStateRepo(); const linkedRepo = fakeLinkedRepo()
  const svc = new LinkedAccountService(api as any, stateRepo as any, linkedRepo as any, cfg)
  const { url } = await svc.startLink('u', 'physionet')
  const state = new URL(url).searchParams.get('state')!
  await svc.handleCallback({ state, code: 'c' })
  const at = await svc.getDecryptedAccessToken('u', 'physionet')
  assertEquals(at, 'AT')
})

Deno.test('getDecryptedAccessToken refreshes when expired and persists new tokens', async () => {
  const api = fakeApi(); const stateRepo = fakeStateRepo(); const linkedRepo = fakeLinkedRepo()
  const svc = new LinkedAccountService(api as any, stateRepo as any, linkedRepo as any, cfg)
  const { url } = await svc.startLink('u', 'physionet')
  const state = new URL(url).searchParams.get('state')!
  await svc.handleCallback({ state, code: 'c' })
  // Force expired
  const stored = await linkedRepo.findByUserAndProvider('u', 'physionet')
  stored.accessTokenExpires = new Date(Date.now() - 60_000)
  const at = await svc.getDecryptedAccessToken('u', 'physionet')
  assertEquals(at, 'AT2')
  const after = await linkedRepo.findByUserAndProvider('u', 'physionet')
  // New tokens should be encrypted and stored
  assertEquals(decryptToken(after.accessTokenEnc.toString('base64'), encryptionKey), 'AT2')
  assertEquals(decryptToken(after.refreshTokenEnc.toString('base64'), encryptionKey), 'RT2')
})

Deno.test('getDecryptedAccessToken returns null when no link exists', async () => {
  const svc = new LinkedAccountService(fakeApi() as any, fakeStateRepo() as any, fakeLinkedRepo() as any, cfg)
  const at = await svc.getDecryptedAccessToken('nobody', 'physionet')
  assertEquals(at, null)
})

Deno.test('getDecryptedAccessToken returns null when refresh fails', async () => {
  const api = fakeApi({ refresh: async () => { throw new Error('upstream') } })
  const stateRepo = fakeStateRepo(); const linkedRepo = fakeLinkedRepo()
  const svc = new LinkedAccountService(api as any, stateRepo as any, linkedRepo as any, cfg)
  const { url } = await svc.startLink('u', 'physionet')
  const state = new URL(url).searchParams.get('state')!
  await svc.handleCallback({ state, code: 'c' })
  const stored = await linkedRepo.findByUserAndProvider('u', 'physionet')
  stored.accessTokenExpires = new Date(Date.now() - 60_000)
  const at = await svc.getDecryptedAccessToken('u', 'physionet')
  assertEquals(at, null)
})

Deno.test('unlink revokes tokens upstream and deletes the row', async () => {
  let revokedTokens: string[] = []
  const api = fakeApi({ revoke: async (t: string) => { revokedTokens.push(t) } })
  const stateRepo = fakeStateRepo(); const linkedRepo = fakeLinkedRepo()
  const svc = new LinkedAccountService(api as any, stateRepo as any, linkedRepo as any, cfg)
  const { url } = await svc.startLink('u', 'physionet')
  const state = new URL(url).searchParams.get('state')!
  await svc.handleCallback({ state, code: 'c' })
  await svc.unlink('u', 'physionet')
  // Both AT and RT should have been revoked
  assertEquals(revokedTokens.includes('AT'), true)
  assertEquals(revokedTokens.includes('RT'), true)
  assertEquals(await linkedRepo.findByUserAndProvider('u', 'physionet'), null)
})

Deno.test('unlink on unlinked user is a no-op', async () => {
  const svc = new LinkedAccountService(fakeApi() as any, fakeStateRepo() as any, fakeLinkedRepo() as any, cfg)
  await svc.unlink('nobody', 'physionet')
  // no throw, no error
})

Deno.test('list returns empty when no link', async () => {
  const svc = new LinkedAccountService(fakeApi() as any, fakeStateRepo() as any, fakeLinkedRepo() as any, cfg)
  const r = await svc.list('nobody')
  assertEquals(r, [])
})

Deno.test('list returns provider info when linked', async () => {
  const api = fakeApi(); const stateRepo = fakeStateRepo(); const linkedRepo = fakeLinkedRepo()
  const svc = new LinkedAccountService(api as any, stateRepo as any, linkedRepo as any, cfg)
  const { url } = await svc.startLink('u', 'physionet')
  const state = new URL(url).searchParams.get('state')!
  await svc.handleCallback({ state, code: 'c' })
  const r = await svc.list('u')
  assertEquals(r.length, 1)
  assertEquals(r[0].provider, 'physionet')
  assertEquals(r[0].username, 'alice')
})
