import { assertEquals } from '@std/assert'
import { accountEmail, planLinks } from './plan.ts'
import type { LogtoUserRow, UsermgmtUserRow } from './types.ts'

const logto = (over: Partial<LogtoUserRow> & { id: string }): LogtoUserRow => ({
  username: null, primaryEmail: null, name: null, isSuspended: false, ...over
})
const um = (id: string, username: string, idpUserId: string | null): UsermgmtUserRow => ({ id, username, idpUserId })

Deno.test('accountEmail prefers the Logto email, then qualifies the username', () => {
  assertEquals(accountEmail(logto({ id: 'l1', primaryEmail: ' A@X.test ' }), 'a', 'd2e.local'), 'a@x.test')
  assertEquals(accountEmail(logto({ id: 'l1' }), 'Admin', 'd2e.local'), 'admin@d2e.local')
  assertEquals(accountEmail(logto({ id: 'l1' }), 'b@y.test', 'd2e.local'), 'b@y.test')
  assertEquals(accountEmail(logto({ id: 'l1' }), '', 'd2e.local'), null)
})

Deno.test('a row keyed to a Logto subject is planned for linking, by exact id', () => {
  const plan = planLinks([um('u1', 'admin', 'l1')], [logto({ id: 'l1', username: 'admin', name: 'Admin' })], [], 'd2e.local')
  assertEquals(plan.links, [{
    usermgmtId: 'u1', username: 'admin', logtoId: 'l1', currentIdpUserId: 'l1',
    email: 'admin@d2e.local', name: 'Admin', banned: false
  }])
  assertEquals(plan.skipped, [])
})

Deno.test('a row already re-keyed is still planned, via its subject history', () => {
  const plan = planLinks(
    [um('u1', 'admin', 'trex-1')],
    [logto({ id: 'l1' })],
    [{ userId: 'u1', oldSub: 'l1', newSub: 'trex-1' }],
    'd2e.local'
  )
  assertEquals(plan.links.map(l => [l.logtoId, l.currentIdpUserId]), [['l1', 'trex-1']])
})

Deno.test('rows that are not Logto identities are counted, not linked or reported', () => {
  const plan = planLinks([um('u1', 'x', 'trex-native'), um('u2', 'y', null)], [logto({ id: 'l1' })], [], 'd2e.local')
  assertEquals(plan.links, [])
  assertEquals(plan.skipped, [])
  assertEquals(plan.notLogto, 2)
})

Deno.test('suspended Logto users are planned as banned', () => {
  const plan = planLinks([um('u1', 'a', 'l1')], [logto({ id: 'l1', isSuspended: true })], [], 'd2e.local')
  assertEquals(plan.links[0].banned, true)
})

Deno.test('two rows resolving to one email are both skipped, never merged', () => {
  const plan = planLinks(
    [um('u1', 'a', 'l1'), um('u2', 'b', 'l2')],
    [logto({ id: 'l1', primaryEmail: 'same@x.test' }), logto({ id: 'l2', primaryEmail: 'SAME@x.test' })],
    [],
    'd2e.local'
  )
  assertEquals(plan.links, [])
  assertEquals(plan.skipped.map(s => [s.usermgmtId, s.reason]), [['u1', 'duplicate_email'], ['u2', 'duplicate_email']])
})

Deno.test('a Logto user with neither email nor username is skipped', () => {
  const plan = planLinks([um('u1', '', 'l1')], [logto({ id: 'l1' })], [], 'd2e.local')
  assertEquals(plan.skipped.map(s => s.reason), ['no_email'])
})
