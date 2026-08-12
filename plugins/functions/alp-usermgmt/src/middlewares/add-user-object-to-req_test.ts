/**
 * Middleware-level coverage for the D2E issue 2410 freshness gate.
 *
 * `authz-freshness_test.ts` proves the comparison. This file proves the
 * middleware *acts* on it: that a fresh token reaches the next handler and a
 * stale one is rejected with the agreed machine-readable 401 and never reaches
 * the next handler at all. `addUserObjToReq` is registered app-wide
 * (`src/main.ts`) ahead of every router, so "next() was not called" is exactly
 * the property that stops a stale token reaching `grant-roles-by-scopes` and
 * having its outdated role claims reconciled back into the database.
 *
 * Run: deno test --allow-env --no-check src/middlewares/add-user-object-to-req_test.ts
 *
 * `--no-check` is required because of pre-existing type errors elsewhere in the
 * service import graph (e.g. `Buffer` in UserGroupService.ts), not because of
 * anything in this file or the middleware.
 */
import { assertEquals } from '@std/assert'

// Must be set before the middleware module is evaluated: it captures
// USER_MGMT__IDP_SUBJECT_PROP into a module-level const at import time.
Deno.env.set('USER_MGMT__IDP_SUBJECT_PROP', 'sub')

const { Container } = await import('typedi')
const { UserService } = await import('../services/UserService.ts')
const { User } = await import('../entities/User.ts')
const { env } = await import('../env.ts')
const { SERVICE_USER_ID } = await import('../const.ts')
const { addUserObjToReq } = await import('./add-user-object-to-req.ts')

const CHANGED_AT = new Date(1_700_000_000_000)
const IAT_BEFORE_CHANGE = 1_699_999_000
const IAT_AFTER_CHANGE = 1_700_000_010
const IDP_USER_ID = 'idp-user-1'
const USER_ID = 'db-user-1'

const base64url = (value: unknown) =>
  btoa(JSON.stringify(value)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

/** An unsigned JWT: the middleware only calls jwt.decode, it does not verify. */
const makeBearer = (payload: Record<string, unknown>) =>
  `Bearer ${base64url({ alg: 'HS256', typ: 'JWT' })}.${base64url(payload)}.signature`

const makeReq = (payload: Record<string, unknown>) =>
  ({ headers: { authorization: makeBearer(payload) } }) as any

const makeRes = () => ({
  statusCode: undefined as number | undefined,
  headers: {} as Record<string, string>,
  body: undefined as any,
  setHeader(name: string, value: string) {
    this.headers[name.toLowerCase()] = value
    return this
  },
  status(code: number) {
    this.statusCode = code
    return this
  },
  send(body?: unknown) {
    this.body = body
    return this
  }
})

/** Replaces the DI-managed UserService so no database connection is needed. */
const stubUser = (user: InstanceType<typeof User> | undefined) => {
  Container.set(UserService, { getUserByIdpUserId: () => Promise.resolve(user) })
}

const dbUser = (authzChangedAt: Date | null) =>
  new User({
    id: USER_ID,
    username: 'researcher@d2e.local',
    idpUserId: IDP_USER_ID,
    active: true,
    authzChangedAt
  } as any)

/** Runs the middleware and reports whether the request was allowed through. */
const run = async (payload: Record<string, unknown>) => {
  const req = makeReq(payload)
  const res = makeRes()
  let nextCalled = false
  await addUserObjToReq(req, res as any, () => {
    nextCalled = true
  })
  return { req, res, nextCalled }
}

const withEnforcement = async (enforced: boolean, fn: () => Promise<void>) => {
  const previous = env.AUTHZ_FRESHNESS_ENFORCED
  env.AUTHZ_FRESHNESS_ENFORCED = enforced
  try {
    await fn()
  } finally {
    env.AUTHZ_FRESHNESS_ENFORCED = previous
  }
}

Deno.test('enforced: a fresh token passes through and populates req.user', async () => {
  stubUser(dbUser(CHANGED_AT))
  await withEnforcement(true, async () => {
    const { req, res, nextCalled } = await run({ sub: IDP_USER_ID, iat: IAT_AFTER_CHANGE })

    assertEquals(nextCalled, true)
    assertEquals(res.statusCode, undefined)
    assertEquals(req.user.userId, USER_ID)
    assertEquals(req.user.idpUserId, IDP_USER_ID)
    assertEquals(req.isAuthzTokenFresh, true)
  })
})

Deno.test('enforced: a stale token is rejected with the machine-readable 401', async () => {
  stubUser(dbUser(CHANGED_AT))
  await withEnforcement(true, async () => {
    const { req, res, nextCalled } = await run({ sub: IDP_USER_ID, iat: IAT_BEFORE_CHANGE })

    assertEquals(res.statusCode, 401)
    assertEquals(res.headers['x-d2e-authz-stale'], '1')
    assertEquals(res.body, {
      code: 'AUTHZ_STALE_TOKEN',
      message: 'Authorization changed; token refresh required'
    })
    // The whole point: no downstream handler runs, so grant-roles-by-scopes
    // never gets to reconcile the database from this token's stale claims.
    assertEquals(nextCalled, false)
    assertEquals(req.user, undefined)
  })
})

Deno.test('enforced: a token with no iat is rejected once a change is recorded', async () => {
  stubUser(dbUser(CHANGED_AT))
  await withEnforcement(true, async () => {
    const { res, nextCalled } = await run({ sub: IDP_USER_ID })

    assertEquals(res.statusCode, 401)
    assertEquals(res.headers['x-d2e-authz-stale'], '1')
    assertEquals(nextCalled, false)
  })
})

Deno.test('enforced: a token with no iat passes when no change is recorded', async () => {
  stubUser(dbUser(null))
  await withEnforcement(true, async () => {
    const { res, nextCalled } = await run({ sub: IDP_USER_ID })

    assertEquals(nextCalled, true)
    assertEquals(res.statusCode, undefined)
  })
})

Deno.test('enforced: a null authz_changed_at passes, so deploying the migration logs nobody out', async () => {
  stubUser(dbUser(null))
  await withEnforcement(true, async () => {
    const { req, res, nextCalled } = await run({ sub: IDP_USER_ID, iat: IAT_BEFORE_CHANGE })

    assertEquals(nextCalled, true)
    assertEquals(res.statusCode, undefined)
    assertEquals(req.isAuthzTokenFresh, true)
  })
})

Deno.test('enforced: a user with no usermgmt row passes (first login / auto-provisioning)', async () => {
  stubUser(undefined)
  await withEnforcement(true, async () => {
    const { req, res, nextCalled } = await run({ sub: IDP_USER_ID, iat: IAT_BEFORE_CHANGE })

    assertEquals(nextCalled, true)
    assertEquals(res.statusCode, undefined)
    assertEquals(req.user.userId, '')
    assertEquals(req.isAuthzTokenFresh, true)
  })
})

Deno.test('enforced: an M2M service token is never subject to the freshness gate', async () => {
  stubUser(dbUser(CHANGED_AT))
  await withEnforcement(true, async () => {
    const { req, res, nextCalled } = await run({
      sub: 'client-abc',
      client_id: 'client-abc',
      iat: IAT_BEFORE_CHANGE
    })

    assertEquals(nextCalled, true)
    assertEquals(res.statusCode, undefined)
    assertEquals(req.user.userId, SERVICE_USER_ID)
  })
})

Deno.test('shadow mode: a stale token is let through but flagged as not fresh', async () => {
  stubUser(dbUser(CHANGED_AT))
  await withEnforcement(false, async () => {
    const { req, res, nextCalled } = await run({ sub: IDP_USER_ID, iat: IAT_BEFORE_CHANGE })

    assertEquals(nextCalled, true)
    assertEquals(res.statusCode, undefined)
    assertEquals(req.isAuthzTokenFresh, false)
  })
})

Deno.test('a request with no authorization header is untouched', async () => {
  stubUser(dbUser(CHANGED_AT))
  await withEnforcement(true, async () => {
    const req = { headers: {} } as any
    const res = makeRes()
    let nextCalled = false
    await addUserObjToReq(req, res as any, () => {
      nextCalled = true
    })

    assertEquals(nextCalled, true)
    assertEquals(res.statusCode, undefined)
  })
})
