import { assertEquals } from '@std/assert'
import { runIdpMigration, type MigrationConfig, type MigrationStore } from './run.ts'
import type { FederationAdmin, LinkOutcome } from './federation-admin.ts'
import type { GroupRow, LogtoUserRow, UsermgmtUserRow } from './types.ts'

const cfg: MigrationConfig = {
  mode: 'logto-federated', logtoIssuer: 'https://logto.internal:3001/oidc', clientId: 'cid', clientSecret: 'sec',
  publicOrigin: 'https://d2e.test', userDomain: 'd2e.local'
}

function fakes(opts: {
  users?: UsermgmtUserRow[]; logto?: LogtoUserRow[]; groups?: GroupRow[]
  logtoAvailable?: boolean; link?: (email: string) => LinkOutcome
}) {
  const steps: Array<[string, string, Record<string, number>]> = []
  const rekeys: Array<[string, string | null, string]> = []
  const roles: Array<[string, string]> = []
  const providers: Array<[string, unknown]> = []
  const enabled: Array<[string, boolean]> = []
  const store: MigrationStore = {
    logtoAvailable: () => Promise.resolve(opts.logtoAvailable ?? true),
    usermgmtUsers: () => Promise.resolve(opts.users ?? []),
    logtoUsers: () => Promise.resolve(opts.logto ?? []),
    subjectHistory: () => Promise.resolve([]),
    groups: () => Promise.resolve(opts.groups ?? []),
    rekey: (id, from, to) => { rekeys.push([id, from, to]); return Promise.resolve() },
    recordStep: (step, status, counts) => { steps.push([step, status, counts]); return Promise.resolve() }
  }
  const admin: FederationAdmin = {
    upsertProvider: (id, body) => { providers.push([id, body]); return Promise.resolve() },
    setProviderEnabled: (id, on) => { enabled.push([id, on]); return Promise.resolve('ok') },
    link: req => Promise.resolve(opts.link ? opts.link(req.email) : { userId: `trex-${req.accountId}`, outcome: 'created' }),
    assignRole: (userId, role) => { roles.push([userId, role]); return Promise.resolve() }
  }
  return { store, admin, steps, rekeys, roles, providers, enabled }
}

Deno.test('trex mode only disables the Logto provider', async () => {
  const f = fakes({})
  await runIdpMigration({ ...cfg, mode: 'trex' }, f.store, f.admin, () => {})
  assertEquals(f.enabled, [['logto', false]])
  assertEquals(f.providers, [])
  assertEquals(f.steps, [])
})

Deno.test('without a Logto schema nothing is written and the reason is recorded', async () => {
  const f = fakes({ logtoAvailable: false })
  await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(f.providers, [])
  assertEquals(f.steps.map(s => [s[0], s[1]]), [['provider', 'skipped']])
})

Deno.test('federated mode registers Logto with the browser-facing authorize URL', async () => {
  const f = fakes({})
  await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(f.providers, [['logto', {
    displayName: 'Logto', clientId: 'cid', clientSecret: 'sec', issuer: 'https://logto.internal:3001/oidc',
    authorizationEndpoint: 'https://d2e.test/oidc/auth', scopes: 'openid profile email',
    groupsSource: 'none', autoProvision: false, enabled: true
  }]])
})

Deno.test('a linked user gets their roles in trex and their subject re-keyed', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'admin', idpUserId: 'l1' }],
    logto: [{ id: 'l1', username: 'admin', primaryEmail: null, name: null, isSuspended: false }],
    groups: [{ userId: 'u1', role: 'ALP_SYSTEM_ADMIN', studyId: null, tokenDatasetCode: null, datasetType: null }]
  })
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(f.roles, [['trex-l1', 'role.systemadmin'], ['trex-l1', 'admin']])
  assertEquals(f.rekeys, [['u1', 'l1', 'trex-l1']])
  assertEquals([summary.created, summary.rolesAssigned, summary.rekeyed], [1, 2, 1])
  assertEquals(f.steps.map(s => [s[0], s[1]]), [['provider', 'ok'], ['link', 'ok'], ['roles', 'ok'], ['rekey', 'ok']])
})

Deno.test('a row already holding its trex subject is not re-keyed again', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'admin', idpUserId: 'l1' }],
    logto: [{ id: 'l1', username: 'admin', primaryEmail: null, name: null, isSuspended: false }],
    link: () => ({ userId: 'l1', outcome: 'already_linked' })
  })
  await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(f.rekeys, [])
})

Deno.test('a conflicting email is skipped and reported; other users continue', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'a', idpUserId: 'l1' }, { id: 'u2', username: 'b', idpUserId: 'l2' }],
    logto: [
      { id: 'l1', username: 'a', primaryEmail: null, name: null, isSuspended: false },
      { id: 'l2', username: 'b', primaryEmail: null, name: null, isSuspended: false }
    ],
    link: email => email === 'a@d2e.local' ? { conflict: true, userId: 'tx' } : { userId: 'trex-b', outcome: 'linked' }
  })
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(summary.skipped.map(s => [s.usermgmtId, s.reason]), [['u1', 'email_linked_elsewhere']])
  assertEquals(f.rekeys, [['u2', 'l2', 'trex-b']])
  assertEquals(f.steps.find(s => s[0] === 'link')?.[1], 'partial')
})

Deno.test('missing upstream client configuration fails the provider step and stops', async () => {
  const f = fakes({})
  await runIdpMigration({ ...cfg, clientSecret: '' }, f.store, f.admin, () => {})
  assertEquals(f.providers, [])
  assertEquals(f.steps.map(s => [s[0], s[1]]), [['provider', 'failed']])
})
