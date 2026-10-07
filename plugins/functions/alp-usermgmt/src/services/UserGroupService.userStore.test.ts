import { assertEquals } from '@std/assert'
import { resolveRoleStore, resolveUserStore } from './UserGroupService.ts'

/**
 * Account operations follow where people authenticate, not where roles live.
 *
 * IDP__ROLE_STORE is pinned to `trex` in docker-compose.yml, so before this the
 * whole account lifecycle went to trex even in logto-federated mode — where
 * trex refuses the password grant, so the created account could never sign in.
 */
Deno.test('logto-federated with native password login off creates accounts in Logto', () => {
  assertEquals(resolveUserStore('logto-federated', 'false', 'trex'), 'logto')
  assertEquals(resolveUserStore('logto-federated', undefined, 'trex'), 'logto')
})

Deno.test('re-enabling native password login keeps accounts with the role store', () => {
  // The documented escape hatch for letting a trex-native admin in while Logto
  // is unavailable; such an account has to exist in trex to be usable.
  assertEquals(resolveUserStore('logto-federated', 'true', 'trex'), 'trex')
})

Deno.test('trex mode is unaffected, whatever the password flag says', () => {
  assertEquals(resolveUserStore('trex', 'false', 'trex'), 'trex')
  assertEquals(resolveUserStore(undefined, 'false', undefined), 'trex')
})

Deno.test('an explicit logto role store still selects Logto outside federation', () => {
  assertEquals(resolveUserStore('trex', 'true', 'logto'), 'logto')
})

Deno.test('the role store itself is untouched by the federation mode', () => {
  // Roles live in trex after the migration; only the account moves.
  assertEquals(resolveRoleStore('trex'), 'trex')
  assertEquals(resolveRoleStore('logto'), 'logto')
})
