import { assertEquals } from '@std/assert'
import { runIdpMigration, type MigrationConfig, type MigrationStore, type TablesWait } from './run.ts'
import type { FederationAdmin, LinkOutcome } from './federation-admin.ts'
import type { GroupRow, LogtoUserRow, UsermgmtUserRow } from './types.ts'

const cfg: MigrationConfig = {
  mode: 'logto-federated', logtoIssuer: 'https://logto.internal:3001/oidc', clientId: 'cid', clientSecret: 'sec',
  publicOrigin: 'https://d2e.test', userDomain: 'd2e.local'
}

function fakes(opts: {
  users?: UsermgmtUserRow[]; logto?: LogtoUserRow[]; groups?: GroupRow[]
  logtoAvailable?: boolean; link?: (email: string) => LinkOutcome
  assignRole?: (userId: string, role: string) => void
  rekey?: (id: string, from: string | null, to: string) => void
  logtoAvailableThrows?: Error
  groupsThrows?: Error
  upsertProviderThrows?: Error
  setProviderEnabledThrows?: Error
  /** Called once per poll of the bookkeeping tables; may throw. */
  migrationTablesExist?: () => boolean
}) {
  const steps: Array<[string, string, Record<string, number>, unknown]> = []
  const rekeys: Array<[string, string | null, string]> = []
  const roles: Array<[string, string]> = []
  const providers: Array<[string, unknown]> = []
  const enabled: Array<[string, boolean]> = []
  const store: MigrationStore = {
    migrationTablesExist: () => {
      try {
        return Promise.resolve(opts.migrationTablesExist ? opts.migrationTablesExist() : true)
      } catch (err) {
        return Promise.reject(err)
      }
    },
    logtoAvailable: () => opts.logtoAvailableThrows ? Promise.reject(opts.logtoAvailableThrows) : Promise.resolve(opts.logtoAvailable ?? true),
    usermgmtUsers: () => Promise.resolve(opts.users ?? []),
    logtoUsers: () => Promise.resolve(opts.logto ?? []),
    subjectHistory: () => Promise.resolve([]),
    groups: () => opts.groupsThrows ? Promise.reject(opts.groupsThrows) : Promise.resolve(opts.groups ?? []),
    rekey: (id, from, to) => {
      try {
        opts.rekey?.(id, from, to)
      } catch (err) {
        return Promise.reject(err)
      }
      rekeys.push([id, from, to])
      return Promise.resolve()
    },
    recordStep: (step, status, counts, detail) => { steps.push([step, status, counts, detail]); return Promise.resolve() }
  }
  const admin: FederationAdmin = {
    upsertProvider: (id, body) => {
      if (opts.upsertProviderThrows) return Promise.reject(opts.upsertProviderThrows)
      providers.push([id, body])
      return Promise.resolve()
    },
    setProviderEnabled: (id, on) => {
      if (opts.setProviderEnabledThrows) return Promise.reject(opts.setProviderEnabledThrows)
      enabled.push([id, on])
      return Promise.resolve('ok')
    },
    link: req => {
      try {
        return Promise.resolve(opts.link ? opts.link(req.email) : { userId: `trex-${req.accountId}`, outcome: 'created' })
      } catch (err) {
        return Promise.reject(err)
      }
    },
    assignRole: (userId, role) => {
      try {
        opts.assignRole?.(userId, role)
      } catch (err) {
        return Promise.reject(err)
      }
      roles.push([userId, role])
      return Promise.resolve()
    }
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

Deno.test('trex mode makes no admin call on a fresh install with no Logto data', async () => {
  const f = fakes({ logtoAvailable: false })
  await runIdpMigration({ ...cfg, mode: 'trex' }, f.store, f.admin, () => {})
  assertEquals(f.enabled, [])
  assertEquals(f.providers, [])
  assertEquals(f.steps, [])
})

Deno.test('trex mode still disables the provider when there is Logto data to clean up', async () => {
  const f = fakes({ logtoAvailable: true })
  await runIdpMigration({ ...cfg, mode: 'trex' }, f.store, f.admin, () => {})
  assertEquals(f.enabled, [['logto', false]])
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

Deno.test('a transport failure linking one user is recorded and the run continues', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'a', idpUserId: 'l1' }, { id: 'u2', username: 'b', idpUserId: 'l2' }],
    logto: [
      { id: 'l1', username: 'a', primaryEmail: null, name: null, isSuspended: false },
      { id: 'l2', username: 'b', primaryEmail: null, name: null, isSuspended: false }
    ],
    link: email => {
      if (email === 'a@d2e.local') throw new Error('trex unreachable')
      return { userId: 'trex-b', outcome: 'linked' }
    }
  })
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(summary.skipped.map(s => [s.usermgmtId, s.reason]), [['u1', 'link_failed']])
  assertEquals(f.rekeys, [['u2', 'l2', 'trex-b']])
  assertEquals(f.steps.find(s => s[0] === 'link')?.[1], 'partial')
})

Deno.test('a role assignment failure is recorded in the roles step detail, and the step is partial', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'admin', idpUserId: 'l1' }],
    logto: [{ id: 'l1', username: 'admin', primaryEmail: null, name: null, isSuspended: false }],
    groups: [{ userId: 'u1', role: 'ALP_SYSTEM_ADMIN', studyId: null, tokenDatasetCode: null, datasetType: null }],
    assignRole: (_userId, role) => { if (role === 'admin') throw new Error('trex down') }
  })
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  const rolesStep = f.steps.find(s => s[0] === 'roles')
  assertEquals(rolesStep?.[1], 'partial')
  const detail = rolesStep?.[3] as { skipped: Array<{ usermgmtId: string; username: string; logtoId: string; reason: string }> }
  assertEquals(detail.skipped.map(s => [s.usermgmtId, s.username, s.logtoId, s.reason]), [['u1', 'admin', 'l1', 'role_failed']])
  assertEquals(summary.rolesAssigned, 1)
})

Deno.test('a rekey failure is recorded and reported', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'admin', idpUserId: 'l1' }],
    logto: [{ id: 'l1', username: 'admin', primaryEmail: null, name: null, isSuspended: false }],
    rekey: () => { throw new Error('db down') }
  })
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(summary.skipped.map(s => [s.usermgmtId, s.reason]), [['u1', 'rekey_failed']])
  assertEquals(f.steps.find(s => s[0] === 'rekey')?.[1], 'failed')
})

Deno.test('an already-linked user resuming under a new trex id is still re-keyed', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'admin', idpUserId: 'l1' }],
    logto: [{ id: 'l1', username: 'admin', primaryEmail: null, name: null, isSuspended: false }],
    link: () => ({ userId: 'trex-existing', outcome: 'already_linked' })
  })
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(f.rekeys, [['u1', 'l1', 'trex-existing']])
  assertEquals(summary.rekeyed, 1)
})

Deno.test('a plan-skips-only run (nothing succeeded) reports the link step as skipped, not failed', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'a', idpUserId: 'l1' }, { id: 'u2', username: 'a', idpUserId: 'l2' }],
    logto: [
      { id: 'l1', username: 'a', primaryEmail: null, name: null, isSuspended: false },
      { id: 'l2', username: 'a', primaryEmail: null, name: null, isSuspended: false }
    ]
  })
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(summary.skipped.map(s => s.reason), ['duplicate_email', 'duplicate_email'])
  assertEquals(f.steps.find(s => s[0] === 'link')?.[1], 'skipped')
})

Deno.test('a run that links most users and skips a few (some succeeded) reports the link step as partial', async () => {
  const f = fakes({
    users: [
      { id: 'u1', username: 'a', idpUserId: 'l1' },
      { id: 'u2', username: 'b', idpUserId: 'l2' },
      { id: 'u3', username: 'c', idpUserId: 'l3' },
      { id: 'u4', username: 'c', idpUserId: 'l4' }
    ],
    logto: [
      { id: 'l1', username: 'a', primaryEmail: null, name: null, isSuspended: false },
      { id: 'l2', username: 'b', primaryEmail: null, name: null, isSuspended: false },
      { id: 'l3', username: 'c', primaryEmail: null, name: null, isSuspended: false },
      { id: 'l4', username: 'c', primaryEmail: null, name: null, isSuspended: false }
    ]
  })
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  // u3/u4 collide on email and are planner-skipped; u1/u2 link successfully.
  assertEquals(summary.skipped.map(s => s.reason), ['duplicate_email', 'duplicate_email'])
  assertEquals(summary.created, 2)
  assertEquals(f.steps.find(s => s[0] === 'link')?.[1], 'partial')
})

Deno.test('an unreachable trex during provider registration records the failure and stops', async () => {
  const f = fakes({ upsertProviderThrows: new Error('trex unreachable') })
  await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(f.steps.map(s => [s[0], s[1]]), [['provider', 'failed']])
  assertEquals(f.providers, [])
})

Deno.test('a store failure resolving Logto availability records the provider step as failed', async () => {
  const f = fakes({ logtoAvailableThrows: new Error('db unreachable') })
  await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(f.steps.map(s => [s[0], s[1]]), [['provider', 'failed']])
})

Deno.test('a groups read failure fails the roles step but the rekey step still runs', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'admin', idpUserId: 'l1' }],
    logto: [{ id: 'l1', username: 'admin', primaryEmail: null, name: null, isSuspended: false }],
    groupsThrows: new Error('db unreachable')
  })
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(f.steps.map(s => [s[0], s[1]]), [['provider', 'ok'], ['link', 'ok'], ['roles', 'failed'], ['rekey', 'ok']])
  assertEquals(f.rekeys, [['u1', 'l1', 'trex-l1']])
  assertEquals(summary.rolesAssigned, 0)
})

Deno.test('trex mode logs but does not crash when disabling the provider fails', async () => {
  const f = fakes({ setProviderEnabledThrows: new Error('trex unreachable') })
  const messages: string[] = []
  const summary = await runIdpMigration({ ...cfg, mode: 'trex' }, f.store, f.admin, m => messages.push(m))
  assertEquals(f.steps, [])
  assertEquals(messages.some(m => m.includes('failed to disable the Logto provider')), true)
  assertEquals(summary.mode, 'trex')
})

Deno.test('a store that cannot persist a step record does not abort the run', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'admin', idpUserId: 'l1' }],
    logto: [{ id: 'l1', username: 'admin', primaryEmail: null, name: null, isSuspended: false }]
  })
  f.store.recordStep = () => Promise.reject(new Error('store unavailable'))
  const summary = await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(summary.rekeyed, 1)
})

Deno.test('a Logto schema that reads as empty while users still carry subjects fails the link step and stops', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'a', idpUserId: 'l1' }, { id: 'u2', username: 'b', idpUserId: 'l2' }],
    logto: []
  })
  const messages: string[] = []
  const summary = await runIdpMigration(cfg, f.store, f.admin, m => messages.push(m))
  assertEquals(f.steps.map(s => [s[0], s[1]]), [['provider', 'ok'], ['link', 'failed']])
  assertEquals(f.steps.find(s => s[0] === 'link')?.[2], { usermgmtWithSubject: 2, logtoUsers: 0 })
  const detail = f.steps.find(s => s[0] === 'link')?.[3] as { reason: string }
  assertEquals(detail.reason.includes('row-level security'), true)
  assertEquals(detail.reason.includes('PG__LOGTO_MANAGER_USER'), true)
  assertEquals(messages.some(m => m.startsWith('[idp-migration] link: failed')), true)
  assertEquals(f.rekeys, [])
  assertEquals(f.roles, [])
  assertEquals([summary.linked, summary.created, summary.rekeyed], [0, 0, 0])
})

Deno.test('an install whose users hold no IdP subject at all still reads as an empty, successful run', async () => {
  const f = fakes({ users: [{ id: 'u1', username: 'a', idpUserId: null }], logto: [] })
  await runIdpMigration(cfg, f.store, f.admin, () => {})
  assertEquals(f.steps.map(s => [s[0], s[1]]), [['provider', 'ok'], ['link', 'ok'], ['roles', 'ok'], ['rekey', 'ok']])
})

Deno.test('a run that links nobody because no subject is a Logto identity says so', async () => {
  const f = fakes({
    users: [{ id: 'u1', username: 'a', idpUserId: 'not-a-logto-id' }],
    logto: [{ id: 'l1', username: 'other', primaryEmail: null, name: null, isSuspended: false }]
  })
  const messages: string[] = []
  await runIdpMigration(cfg, f.store, f.admin, m => messages.push(m))
  assertEquals(f.steps.find(s => s[0] === 'link')?.[2].notLogto, 1)
  assertEquals(messages.some(m => m.includes('nothing was linked')), true)
})

// Five polls, no real waiting: `sleep` only records, so the budget is spent
// in polls rather than elapsed time and the tests stay deterministic.
const fastWait = (sleeps: number[]): TablesWait => ({
  budgetMs: 10, intervalMs: 2, sleep: ms => { sleeps.push(ms); return Promise.resolve() }
})

Deno.test('the bookkeeping tables never appearing aborts the run before the first step', async () => {
  const f = fakes({ migrationTablesExist: () => false })
  const sleeps: number[] = []
  const messages: string[] = []
  await runIdpMigration(cfg, f.store, f.admin, m => messages.push(m), fastWait(sleeps))
  assertEquals(f.steps, [])
  assertEquals(f.providers, [])
  assertEquals(sleeps, [2, 2, 2, 2]) // five polls, four waits between them
  assertEquals(messages.some(m => m.includes('did not appear within 10ms')), true)
})

Deno.test('bookkeeping tables that appear on a later poll let the run proceed', async () => {
  let polls = 0
  const f = fakes({
    users: [{ id: 'u1', username: 'admin', idpUserId: 'l1' }],
    logto: [{ id: 'l1', username: 'admin', primaryEmail: null, name: null, isSuspended: false }],
    migrationTablesExist: () => ++polls >= 3
  })
  const sleeps: number[] = []
  await runIdpMigration(cfg, f.store, f.admin, () => {}, fastWait(sleeps))
  assertEquals(polls, 3)
  assertEquals(sleeps, [2, 2])
  assertEquals(f.steps.map(s => [s[0], s[1]]), [['provider', 'ok'], ['link', 'ok'], ['roles', 'ok'], ['rekey', 'ok']])
})

Deno.test('a probe that keeps erroring aborts and reports the last error', async () => {
  const f = fakes({ migrationTablesExist: () => { throw new Error('db unreachable') } })
  const messages: string[] = []
  await runIdpMigration(cfg, f.store, f.admin, m => messages.push(m), fastWait([]))
  assertEquals(f.steps, [])
  assertEquals(messages.some(m => m.includes('last error: Error: db unreachable')), true)
})

Deno.test('trex mode does not wait for bookkeeping tables it never writes', async () => {
  let polls = 0
  const f = fakes({ migrationTablesExist: () => { polls++; return false } })
  await runIdpMigration({ ...cfg, mode: 'trex' }, f.store, f.admin, () => {}, fastWait([]))
  assertEquals(polls, 0)
  assertEquals(f.enabled, [['logto', false]])
})
