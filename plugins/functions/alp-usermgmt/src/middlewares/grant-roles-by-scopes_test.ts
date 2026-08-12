/**
 * Stale-reapplication coverage for the D2E issue 2410 freshness gate.
 *
 * `grant-roles-by-scopes` reconciles the portal database *from* the access
 * token's role claims. That makes it the one place where a stale token does
 * real damage: replaying an outdated claim set overwrites the change an admin
 * just made, silently reverting it. Rejecting the request in `addUserObjToReq`
 * covers this only while enforcement is ON — in shadow mode the request is
 * served, so this guard is the only thing standing between a stale token and a
 * reverted grant. That is why it is asserted independently of the flag.
 *
 * The second property pinned here is the `skipAuthzStamp` wiring. This
 * reconciliation writes the token's OWN claims, so it must NOT stamp
 * `authz_changed_at` — doing so would mark the caller's own token stale for a
 * change it supplied, forcing a renewal that returns identical claims. That
 * bug would be invisible in production except as unexplained re-login churn on
 * every first login, so it is asserted at the call boundary.
 *
 * Run: deno test --allow-env --no-check src/middlewares/grant-roles-by-scopes_test.ts
 */
import { assertEquals } from '@std/assert'

// Must be set before the module is evaluated: grant-roles-by-scopes captures
// USER_MGMT__IDP_SUBJECT_PROP into a module-level const at import time.
Deno.env.set('USER_MGMT__IDP_SUBJECT_PROP', 'sub')

const { Container } = await import('typedi')
const { CONTAINER_KEY, IDP_SCOPE_ROLE } = await import('../const.ts')
const { env } = await import('../env.ts')
const { UserService } = await import('../services/UserService.ts')
const { UserGroupService } = await import('../services/UserGroupService.ts')
const { B2cGroupService } = await import('../services/B2cGroupService.ts')
const { EntitlementsSyncService } = await import('../services/EntitlementsSyncService.ts')
const { LogtoAPI } = await import('../api/LogtoAPI.ts')
const { grantRolesByScopes } = await import('./grant-roles-by-scopes.ts')

const IDP_USER_ID = 'idp-user-1'
const USER_ID = 'db-user-1'

const base64url = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** An unsigned JWT: the middleware only calls jwt.decode, it does not verify. */
const makeBearer = (payload: Record<string, unknown>) =>
  `Bearer ${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.signature`

type GroupCall = { method: 'register' | 'withdraw'; userId: string; options: any }

/**
 * Replaces every collaborator the reconciliation reaches, and records the calls
 * that matter. Nothing here touches a database or Logto.
 */
const installStubs = () => {
  const groupCalls: GroupCall[] = []
  const rawQueries: string[] = []

  Container.set(LogtoAPI, { getUser: () => Promise.resolve(null), deleteUser: () => Promise.resolve() })
  Container.set(UserService, {
    getUserByIdpUserId: () => Promise.resolve({ id: USER_ID, idpUserId: IDP_USER_ID }),
    getUserByUsername: () => Promise.resolve({ id: USER_ID, idpUserId: IDP_USER_ID })
  })
  Container.set(EntitlementsSyncService, {
    sync: () => Promise.resolve(),
    getManagedDatasetCodes: () => Promise.resolve(new Set<string>())
  })
  Container.set(B2cGroupService, {
    getGroupBySystemRole: (_system: string, role: string) => Promise.resolve({ id: `group-for-${role}` }),
    getGroupByStudyRole: () => Promise.resolve({ id: 'group-study' }),
    createGroup: () => Promise.resolve()
  })
  Container.set(UserGroupService, {
    getUserGroup: () => Promise.resolve({ id: 'ug-1' }),
    registerUserToGroup: (userId: string, _g: string, _trx: any, options: any) => {
      groupCalls.push({ method: 'register', userId, options })
      return Promise.resolve()
    },
    withdrawUserFromGroup: (userId: string, _g: string, _trx: any, options: any) => {
      groupCalls.push({ method: 'withdraw', userId, options })
      return Promise.resolve()
    }
  })
  Container.set(CONTAINER_KEY.DB_CONNECTION, {
    raw: (sql: string) => {
      rawQueries.push(sql)
      return Promise.resolve({ rows: [] })
    }
  })

  return { groupCalls, rawQueries }
}

/**
 * Sets the env this middleware branches on, and restores it afterwards. These
 * are properties of the exported `env` object, read at call time.
 */
const withEnv = async (fn: () => Promise<void>) => {
  const previous = {
    autoProvision: env.IDP_AUTO_PROVISION_USERS,
    tenantId: env.APP_TENANT_ID,
    systemName: env.ALP_SYSTEM_NAME,
    relyingParty: env.IDP_RELYING_PARTY
  }
  env.IDP_AUTO_PROVISION_USERS = true
  env.APP_TENANT_ID = 'tenant-1'
  env.ALP_SYSTEM_NAME = 'alp'
  env.IDP_RELYING_PARTY = 'logto'
  try {
    await fn()
  } finally {
    env.IDP_AUTO_PROVISION_USERS = previous.autoProvision
    env.APP_TENANT_ID = previous.tenantId
    env.ALP_SYSTEM_NAME = previous.systemName
    env.IDP_RELYING_PARTY = previous.relyingParty
  }
}

const run = async (isAuthzTokenFresh: boolean | undefined) => {
  const stubs = installStubs()

  const req: any = {
    body: { sync: true },
    headers: {
      authorization: makeBearer({
        sub: IDP_USER_ID,
        email: 'researcher@d2e.local',
        // A grant and a revoke in the same pass, so both call shapes are seen.
        roles: [IDP_SCOPE_ROLE.SYSTEM_ADMIN]
      })
    },
    isAuthzTokenFresh
  }
  const res: any = {
    statusCode: undefined as number | undefined,
    status(code: number) {
      this.statusCode = code
      return this
    },
    send() {
      return this
    }
  }

  let nextCalled = false
  let nextErr: unknown
  await grantRolesByScopes(req, res, (err?: unknown) => {
    nextCalled = true
    nextErr = err
  })

  return { ...stubs, req, res, nextCalled, nextErr }
}

Deno.test('a stale token is served but never reconciles roles', async () => {
  await withEnv(async () => {
    const { groupCalls, rawQueries, nextCalled, nextErr, res } = await run(false)

    // Served: the guard is not a rejection, it is a refusal to write.
    assertEquals(nextCalled, true)
    assertEquals(nextErr, undefined)
    assertEquals(res.statusCode, undefined)

    // The whole point: no role was granted or revoked from this token's claims,
    // so an admin's just-made change survives.
    assertEquals(groupCalls, [])
    // And the reconciliation never even got as far as loading datasets.
    assertEquals(rawQueries, [])
  })
})

Deno.test('a fresh token does reconcile roles', async () => {
  await withEnv(async () => {
    const { groupCalls, rawQueries, nextCalled, nextErr } = await run(true)

    assertEquals(nextCalled, true)
    assertEquals(nextErr, undefined)

    // The contrast that makes the previous test meaningful: with a fresh token
    // the same request DOES reconcile, so it was the guard that stopped it and
    // not some unrelated early return.
    assertEquals(groupCalls.length > 0, true)
    assertEquals(rawQueries.length, 1)
  })
})

Deno.test('an unset freshness flag reconciles, so unrelated callers are unaffected', async () => {
  await withEnv(async () => {
    // The guard tests `=== false` precisely so that a request which never went
    // through addUserObjToReq (undefined) keeps its existing behaviour.
    const { groupCalls } = await run(undefined)

    assertEquals(groupCalls.length > 0, true)
  })
})

Deno.test('reconciliation never stamps authz_changed_at', async () => {
  await withEnv(async () => {
    const { groupCalls } = await run(true)

    // Every register/withdraw issued by the reconciliation must opt out of
    // stamping. Stamping here would invalidate the very token that supplied the
    // claims, costing a forced renewal on every first login.
    assertEquals(groupCalls.length > 0, true)
    for (const call of groupCalls) {
      assertEquals(call.options?.skipAuthzStamp, true, `${call.method} did not pass skipAuthzStamp`)
    }
  })
})

Deno.test('the reconciliation grants and revokes according to token scopes', async () => {
  await withEnv(async () => {
    const { groupCalls } = await run(true)

    // Sanity: the token carried SYSTEM_ADMIN only, so that role is granted and
    // the other two system roles are revoked. This pins that suppressing the
    // stamp did not suppress the reconciliation itself.
    assertEquals(groupCalls.some(c => c.method === 'register'), true)
    assertEquals(groupCalls.some(c => c.method === 'withdraw'), true)
    assertEquals(groupCalls.every(c => c.userId === USER_ID), true)
  })
})
