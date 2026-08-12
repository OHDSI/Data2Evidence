/**
 * Mutation-path stamping coverage for the D2E issue 2410 freshness gate.
 *
 * `authz-freshness_test.ts` proves the comparison and
 * `middlewares/add-user-object-to-req_test.ts` proves the middleware acts on it.
 * Neither is worth anything unless `authz_changed_at` actually gets written when
 * a user's authorization changes — that write is what the whole feature reads.
 *
 * Two properties are load-bearing here and neither is obvious from the call
 * sites, which is why they are pinned:
 *
 *  1. **Argument order.** `Repository.update` is
 *     `(field, criteria, user, trx)` — field FIRST. Passing `({ id }, { ... })`
 *     type-checks (both are plain object literals under this service's
 *     `strict: false` config) and would silently write `id` into every row's
 *     column set while filtering on `authz_changed_at`. There is no runtime
 *     error to catch it; only an assertion on the call shape.
 *
 *  2. **The transaction is forwarded.** A stamp that commits outside the
 *     surrounding transaction can survive a rolled-back change (forcing a
 *     pointless renewal) or, worse, be lost while the change commits — which is
 *     precisely the bug this feature exists to prevent.
 *
 * Run: deno test --allow-env --no-check src/services/authz-stamping_test.ts
 *
 * `--no-check` matches the sibling middleware test: the service import graph has
 * pre-existing type errors (e.g. `Buffer` in UserGroupService.ts) unrelated to
 * anything asserted here.
 */
import { assertEquals } from '@std/assert'

// Must be set before the service modules are evaluated: env.ts captures
// USER_MGMT__IDP_SUBJECT_PROP into a module-level const at import time.
Deno.env.set('USER_MGMT__IDP_SUBJECT_PROP', 'sub')

const { Container } = await import('typedi')
const { CONTAINER_KEY } = await import('../const.ts')
const { UserService } = await import('./UserService.ts')
const { UserGroupService } = await import('./UserGroupService.ts')

const USER_ID = 'db-user-1'
const GROUP_ID = 'group-1'
const ACTING_USER = { userId: 'admin-1', idpUserId: 'idp-admin-1' }

/** A sentinel standing in for a knex transaction; only identity is asserted. */
const TRX = { __trx: true } as any

type UpdateCall = { field: any; criteria: any; user: any; trx: any }

/** A UserRepository stand-in that records how `update` was called. */
const makeUserRepo = () => {
  const updates: UpdateCall[] = []
  return {
    updates,
    update: (field: any, criteria: any, user: any, trx: any) => {
      updates.push({ field, criteria, user, trx })
      return Promise.resolve({})
    }
  }
}

const makeUserService = () => {
  const userRepo = makeUserRepo()
  // Constructed directly rather than through the container: UserService's only
  // dependency is the repository, so this needs no DI graph and no database.
  const service = new (UserService as any)(userRepo)
  return { service, userRepo }
}

const withCurrentUser = async (fn: () => Promise<void>) => {
  const had = Container.has(CONTAINER_KEY.CURRENT_USER)
  const previous = had ? Container.get(CONTAINER_KEY.CURRENT_USER) : undefined
  Container.set(CONTAINER_KEY.CURRENT_USER, ACTING_USER)
  try {
    await fn()
  } finally {
    if (had) Container.set(CONTAINER_KEY.CURRENT_USER, previous)
    else Container.remove(CONTAINER_KEY.CURRENT_USER)
  }
}

Deno.test('touchAuthzChangedAt writes authz_changed_at, filtered by id', async () => {
  const { service, userRepo } = makeUserService()

  await withCurrentUser(async () => {
    await service.touchAuthzChangedAt(USER_ID)
  })

  assertEquals(userRepo.updates.length, 1)
  const [call] = userRepo.updates

  // Argument 1 is the FIELD set: the column being written.
  assertEquals(Object.keys(call.field), ['authz_changed_at'])
  assertEquals(call.field.authz_changed_at instanceof Date, true)

  // Argument 2 is the CRITERIA: which row. Reversing these two would filter on
  // authz_changed_at and write the id — a silent, total corruption of the table.
  assertEquals(call.criteria, { id: USER_ID })

  // Argument 3 carries the audit columns, exactly as updateUser does.
  assertEquals(call.user, ACTING_USER)
})

Deno.test('touchAuthzChangedAt forwards the surrounding transaction', async () => {
  const { service, userRepo } = makeUserService()

  await withCurrentUser(async () => {
    await service.touchAuthzChangedAt(USER_ID, TRX)
  })

  // The stamp must land atomically with the change it records.
  assertEquals(userRepo.updates[0].trx, TRX)
})

Deno.test('touchAuthzChangedAt stamps a time at or after the call', async () => {
  const { service, userRepo } = makeUserService()
  const before = Date.now()

  await withCurrentUser(async () => {
    await service.touchAuthzChangedAt(USER_ID)
  })

  const stamped = userRepo.updates[0].field.authz_changed_at.getTime()
  assertEquals(stamped >= before, true)
  assertEquals(stamped <= Date.now(), true)
})

/**
 * Builds a UserGroupService with only the collaborators the two mutation methods
 * touch. `Object.create` skips the constructor and the property initialisers, so
 * the logger is supplied explicitly.
 */
const makeUserGroupService = (opts: { existingUserGroup: boolean }) => {
  const stamped: { userId: string; trx: any }[] = []
  const syncCalls: string[] = []

  const service: any = Object.create(UserGroupService.prototype)
  service.logger = { info: () => {}, warn: () => {}, error: () => {}, debug: () => {} }
  service.userService = {
    getUser: () => Promise.resolve({ id: USER_ID }),
    touchAuthzChangedAt: (userId: string, trx: any) => {
      stamped.push({ userId, trx })
      return Promise.resolve()
    }
  }
  service.userGroupRepo = {
    create: () => Promise.resolve({}),
    delete: () => Promise.resolve()
  }
  service.getUserGroup = () => Promise.resolve(opts.existingUserGroup ? { id: 'ug-1' } : undefined)
  service.syncRoleToLogto = (_u: string, _g: string, action: string) => {
    syncCalls.push(action)
    return Promise.resolve({ status: 'synced' })
  }

  return { service, stamped, syncCalls }
}

Deno.test('registerUserToGroup stamps the user inside the transaction', async () => {
  const { service, stamped, syncCalls } = makeUserGroupService({ existingUserGroup: false })

  await withCurrentUser(async () => {
    await service.registerUserToGroup(USER_ID, GROUP_ID, TRX)
  })

  assertEquals(stamped, [{ userId: USER_ID, trx: TRX }])
  // The stamp must not have replaced the Logto sync.
  assertEquals(syncCalls, ['assign'])
})

Deno.test('withdrawUserFromGroup stamps the user inside the transaction', async () => {
  const { service, stamped, syncCalls } = makeUserGroupService({ existingUserGroup: true })

  await withCurrentUser(async () => {
    await service.withdrawUserFromGroup(USER_ID, GROUP_ID, TRX)
  })

  assertEquals(stamped, [{ userId: USER_ID, trx: TRX }])
  assertEquals(syncCalls, ['remove'])
})

Deno.test('registerUserToGroup does not stamp when the membership already exists', async () => {
  const { service, stamped, syncCalls } = makeUserGroupService({ existingUserGroup: true })

  await withCurrentUser(async () => {
    await service.registerUserToGroup(USER_ID, GROUP_ID, TRX)
  })

  // Nothing changed, so nothing may be invalidated. Stamping on a no-op would
  // force a renewal every time a role was re-asserted.
  assertEquals(stamped, [])
  assertEquals(syncCalls, [])
})

Deno.test('withdrawUserFromGroup does not stamp when the user was not a member', async () => {
  const { service, stamped, syncCalls } = makeUserGroupService({ existingUserGroup: false })

  await withCurrentUser(async () => {
    await service.withdrawUserFromGroup(USER_ID, GROUP_ID, TRX)
  })

  assertEquals(stamped, [])
  assertEquals(syncCalls, [])
})

/**
 * The reconciliation exemption. `grant-roles-by-scopes` writes the token's OWN
 * role claims into the database; stamping there would mark the caller's own
 * token stale for a change it supplied, forcing a renewal that returns identical
 * claims. These two tests pin the escape hatch that prevents that churn.
 */
Deno.test('registerUserToGroup honours skipAuthzStamp but still applies the change', async () => {
  const { service, stamped, syncCalls } = makeUserGroupService({ existingUserGroup: false })

  await withCurrentUser(async () => {
    await service.registerUserToGroup(USER_ID, GROUP_ID, undefined, {
      skipUserValidation: true,
      skipAuthzStamp: true
    })
  })

  assertEquals(stamped, [])
  // Suppressing the stamp must not suppress the grant itself.
  assertEquals(syncCalls, ['assign'])
})

Deno.test('withdrawUserFromGroup honours skipAuthzStamp but still applies the change', async () => {
  const { service, stamped, syncCalls } = makeUserGroupService({ existingUserGroup: true })

  await withCurrentUser(async () => {
    await service.withdrawUserFromGroup(USER_ID, GROUP_ID, undefined, { skipAuthzStamp: true })
  })

  assertEquals(stamped, [])
  assertEquals(syncCalls, ['remove'])
})

Deno.test('skipUserValidation alone still stamps', async () => {
  const { service, stamped } = makeUserGroupService({ existingUserGroup: false })

  await withCurrentUser(async () => {
    await service.registerUserToGroup(USER_ID, GROUP_ID, TRX, { skipUserValidation: true })
  })

  // The two options are independent: only the reconciliation path opts out of
  // stamping, and it must do so explicitly.
  assertEquals(stamped, [{ userId: USER_ID, trx: TRX }])
})
