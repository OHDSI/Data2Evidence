# Authorization Freshness Enforcement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use devx:subagent-driven-development (recommended) or devx:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Revision 2 (2026-08-12) — scope narrowed.** The team confirmed that enforcement belongs in
`plugins/functions/alp-usermgmt/src/middlewares/add-user-object-to-req.ts` and that this is sufficient.
Revision 1 of this file also enforced in the portal Danet function and therefore needed an `AuthzRouter`,
a portal-side freshness service and a global high-water-mark cache. **All of that is removed** — see
"Design revisions" below for why, and what is deferred rather than cancelled.

**Goal:** Make authorization changes take effect on a signed-in user's *next* user-management request instead of up to an hour later, by rejecting access tokens issued before that user's last authorization change and having the portal silently renew once and retry.

**Architecture:** Persist `usermgmt.user.authz_changed_at`. Every mutation that changes a user's authorization stamps it. `addUserObjToReq` — which already loads the user row on every request — compares the token's `iat` against that column and returns `401` + `X-D2E-Authz-Stale: 1` when the token predates the change. The portal's axios layer renews the token once and retries the request. Withdrawal and deletion additionally invalidate the user's Logto session so a removal cannot be outlived by an issued token.

**Tech Stack:** Deno + Express + TypeDI + Knex (`plugins/functions/alp-usermgmt`), knex migrations (`plugins/functions/alp-usermgmt-init`), React + `@axa-fr/react-oidc` 6.10.9 + axios (`plugins/ui/apps/portal`), Playwright (`tests/e2e`), Logto 1.40.1 Management API.

**Issue:** <https://github.com/OHDSI/Data2Evidence/issues/2410>
**Approved design:** `trex/specs/2026-08-12-access-token-freshness-design.md`

---

## Blocking gate — do not start Task 8 until both are answered

**G1. Refresh-token claim behaviour.** A `refresh_token` grant against the deployed Logto fork must re-run the custom-JWT script and return **current** `roles` with a **new, later `iat`**. If `iat` does not advance on renewal, the silent-renewal half of this design fails and every flow falls back to forced re-login. Requires a test user's credentials or an authorized session — **team input needed**.

**G2. `@axa-fr/react-oidc` 6.10.9 force-renew symbol.** `plugins/ui/apps/portal/node_modules` is not installed in this worktree and the package is not vendored, so the exact method that forces a renewal independent of expiry could not be read from source. Task 8 Step 1 resolves it; the unknown is confined to one function body.

Tasks 1–7 (schema, comparison, enforcement, stale-reapplication guard, stamping, session revocation) do **not** depend on G1 or G2 and can proceed.

---

## Design revisions vs. Revision 1 and the approved spec

The team scoped enforcement to `add-user-object-to-req.ts`. Two consequences, both verified in code:

1. **`authz_changed_at` arrives with the existing user load — no extra query.**
   `Repository.getOne` (`plugins/functions/alp-usermgmt/src/repositories/Repository.ts:23–35`) builds
   `(trx || this.db)(this.tableName).select()` — `.select()` with **no column list**, i.e. `SELECT *`.
   `UserService.getUserByIdpUserId` (`services/UserService.ts:24–26`) calls it, and `addUserObjToReq`
   already calls that on **every** request (`middlewares/add-user-object-to-req.ts:43`). A new column on
   `usermgmt.user` is therefore already in the row being fetched. The only work is to carry it through
   `UserField` (`repositories/UserRepository.ts:12–17`), the `reducer` (`:25–32`) and the `User` entity
   (`entities/User.ts`). **Zero added round-trips on normal traffic.**

2. **The global high-water-mark cache is dropped.** It existed only to spare a DB read in services that do
   *not* already load the user — principally the portal Danet function
   (`plugins/functions/portal/src/common/request-context.middleware.ts:9`, which decodes the token at `:17`
   and performs no user load). With enforcement scoped to `alp-usermgmt` there is no read to spare, and a
   cache would actively *weaken* the guarantee: a cached mark older than the true mark makes a stale token
   look fresh, and every replica would need convergence handling. **Deferred, not cancelled** — it becomes
   required the day enforcement extends to the portal function (see Non-Goals).

**Multi-instance consistency:** because each replica reads `authz_changed_at` from the row it already
fetches inside the request, there is no shared cache to invalidate and no convergence window. Enforcement
is exact on every replica from the first request after the mutating transaction commits. There is no cache
invalidation problem *in this scope* — that is a direct consequence of narrowing it.

---

## File structure

**Create**

| Path | Responsibility |
|---|---|
| `plugins/functions/alp-usermgmt-init/src/db/migrations/20260812000000_alter_user_table_5.ts` | Adds `authz_changed_at` to `usermgmt.user` |
| `plugins/functions/alp-usermgmt/src/authz-freshness.ts` | Pure comparison logic — no DI, no DB, unit-testable in isolation |
| `plugins/functions/alp-usermgmt/src/authz-freshness_test.ts` | Deno unit tests for the above |
| `tests/e2e/tests/02-users/authz-freshness.spec.ts` | Two-actor end-to-end coverage |

**Modify**

| Path | Change |
|---|---|
| `plugins/functions/alp-usermgmt/deno.json` | Add `@std/assert` import + module-map entry for the new file |
| `plugins/functions/alp-usermgmt/src/entities/User.ts` | Carry `authzChangedAt` |
| `plugins/functions/alp-usermgmt/src/repositories/UserRepository.ts` | `UserField.authz_changed_at` + reducer |
| `plugins/functions/alp-usermgmt/src/services/UserService.ts` | `touchAuthzChangedAt()` |
| `plugins/functions/alp-usermgmt/src/types.ts` | `IAppRequest.isAuthzTokenFresh` |
| `plugins/functions/alp-usermgmt/src/env.ts` | Feature flag + skew config |
| `plugins/functions/alp-usermgmt/src/middlewares/add-user-object-to-req.ts` | **The** enforcement point |
| `plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts` | Skip reconciliation on a stale token |
| `plugins/functions/alp-usermgmt/src/services/UserGroupService.ts` | Stamp on register/withdraw; revoke session on withdraw |
| `plugins/functions/alp-usermgmt/src/services/MemberService.ts` | Stamp on create; revoke session on delete |
| `plugins/functions/alp-usermgmt/src/api/LogtoAPI.ts` | `getUserSessions` / `revokeUserSession` |
| `docker-compose.yml` | Surface the two new env vars |
| `plugins/ui/apps/portal/src/containers/auth/oidc/oidc.ts` | `forceRenewOidcToken()` |
| `plugins/ui/apps/portal/src/axios/request.ts` | Detect the stale signal, renew once, retry once |

**Deleted from Revision 1 (do not create):** `src/services/AuthzChangeService.ts`, `src/routes/AuthzRouter.ts`,
`plugins/functions/portal/src/common/authz-freshness.service.ts` and their tests, and
`plugins/ui/apps/portal/src/containers/auth/oidc/force-renew.ts` (folded into the existing `oidc.ts`).

---

## Task 1: Schema — `authz_changed_at` column

**Files:**
- Create: `plugins/functions/alp-usermgmt-init/src/db/migrations/20260812000000_alter_user_table_5.ts`
- Modify: `plugins/functions/alp-usermgmt/src/entities/User.ts`
- Modify: `plugins/functions/alp-usermgmt/src/repositories/UserRepository.ts:12-32`

- [ ] **Step 1: Write the migration**

Create `plugins/functions/alp-usermgmt-init/src/db/migrations/20260812000000_alter_user_table_5.ts`:

```ts
import type { Knex } from '../types'

export async function up(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user', (table: Knex.TableBuilder) => {
    table.timestamp('authz_changed_at', { useTz: false }).nullable()
  })
}

export async function down(knex: Knex): Promise<void> {
  return knex.schema.withSchema('usermgmt').alterTable('user', (table: Knex.TableBuilder) => {
    table.dropColumn('authz_changed_at')
  })
}
```

**Backfill policy — deliberate.** The column stays `NULL` for every existing row. `NULL` means "no
authorization change has been recorded", which the comparison treats as *fresh*. This is what makes the
rollout non-disruptive: nobody is logged out or force-renewed by deploying the migration. Do **not**
backfill with `now()` — that would invalidate every access token in circulation at deploy time.

- [ ] **Step 2: Carry the column on the entity**

Replace the whole of `plugins/functions/alp-usermgmt/src/entities/User.ts`:

```ts
export class User {
  public id: string
  public username: string
  public idpUserId: string
  public active: boolean
  public authzChangedAt?: Date | null

  constructor({ id, username, idpUserId, active, authzChangedAt }: User) {
    this.id = id
    this.username = username
    this.idpUserId = idpUserId
    this.active = active
    this.authzChangedAt = authzChangedAt ?? null
  }
}
```

- [ ] **Step 3: Carry the column through the repository**

In `plugins/functions/alp-usermgmt/src/repositories/UserRepository.ts`, replace lines 12–32:

```ts
export interface UserField {
  id: string
  username: string
  idp_user_id: string
  active: boolean
  authz_changed_at: Date | null
}

@Service()
export class UserRepository extends Repository<User, UserCriteria> {
  constructor(@Inject('DB_CONNECTION') public readonly db: Knex) {
    super(db)
  }

  reducer({ id, username, idp_user_id, active, authz_changed_at }: UserField) {
    return new User({
      id,
      username,
      idpUserId: idp_user_id,
      active,
      authzChangedAt: authz_changed_at ?? null
    })
  }
}
```

- [ ] **Step 4: Verify the migration applies**

Run: `npm run start` then `npm run local -- logs alp-usermgmt-init | tail -40`
Expected: `20260812000000_alter_user_table_5` appears in the applied list with no error.

- [ ] **Step 5: Commit**

```bash
git add plugins/functions/alp-usermgmt-init/src/db/migrations/20260812000000_alter_user_table_5.ts \
        plugins/functions/alp-usermgmt/src/entities/User.ts \
        plugins/functions/alp-usermgmt/src/repositories/UserRepository.ts
git commit -m "feat(usermgmt): add authz_changed_at to user table"
```

---

## Task 2: Pure freshness comparison + unit tests

Kept as a standalone module with **no** typedi/knex/express imports, so it can be unit-tested without
booting the DI container. `alp-usermgmt` has no test runner today; this task introduces the smallest
possible one (`deno test` + `@std/assert`), which is why the logic must be import-light.

**Files:**
- Create: `plugins/functions/alp-usermgmt/src/authz-freshness.ts`
- Create: `plugins/functions/alp-usermgmt/src/authz-freshness_test.ts`
- Modify: `plugins/functions/alp-usermgmt/deno.json`

- [ ] **Step 1: Add the assertion library and module entry to `deno.json`**

In `plugins/functions/alp-usermgmt/deno.json`, add these two entries to the `"imports"` object:

```json
    "@std/assert": "jsr:@std/assert@^1.0.6",
    "./src/authz-freshness": "./src/authz-freshness.ts",
```

- [ ] **Step 2: Write the failing test**

Create `plugins/functions/alp-usermgmt/src/authz-freshness_test.ts`:

```ts
import { assertEquals } from '@std/assert'
import { isTokenAuthzFresh } from './authz-freshness.ts'

const SKEW_MS = 2000

Deno.test('null authz_changed_at means the token is fresh', () => {
  assertEquals(isTokenAuthzFresh(1_700_000_000, null, SKEW_MS), true)
})

Deno.test('token issued after the change is fresh', () => {
  assertEquals(isTokenAuthzFresh(1_700_000_010, new Date(1_700_000_000_000), SKEW_MS), true)
})

Deno.test('token issued well before the change is stale', () => {
  assertEquals(isTokenAuthzFresh(1_699_999_000, new Date(1_700_000_000_000), SKEW_MS), false)
})

Deno.test('token issued in the same second as the change is stale (iat has second granularity)', () => {
  // change at 1_700_000_000.400s; a token minted at 1_700_000_000.100s also reports iat=1_700_000_000
  assertEquals(isTokenAuthzFresh(1_700_000_000, new Date(1_700_000_000_400), 0), false)
})

Deno.test('clock skew allowance keeps a token minted just before the change fresh', () => {
  assertEquals(isTokenAuthzFresh(1_699_999_999, new Date(1_700_000_001_000), SKEW_MS), true)
})

Deno.test('missing iat is treated as stale when a change is recorded', () => {
  assertEquals(isTokenAuthzFresh(undefined, new Date(1_700_000_000_000), SKEW_MS), false)
})

Deno.test('missing iat with no recorded change is still fresh', () => {
  assertEquals(isTokenAuthzFresh(undefined, null, SKEW_MS), true)
})
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `cd plugins/functions/alp-usermgmt && deno test --allow-env src/authz-freshness_test.ts`
Expected: FAIL — `Module not found "file:///.../src/authz-freshness.ts"`.

- [ ] **Step 4: Write the implementation**

Create `plugins/functions/alp-usermgmt/src/authz-freshness.ts`:

```ts
/**
 * Freshness comparison for D2E issue 2410.
 *
 * A Logto access token carries the user's roles as a claim, computed when the
 * token was minted. `authz_changed_at` records the last time this user's
 * authorization was mutated. A token whose `iat` predates that moment is
 * carrying claims we already know to be out of date.
 *
 * Semantics, deliberately chosen:
 *  - `iat` is in SECONDS (RFC 7519); `authzChangedAt` has millisecond precision.
 *    We compare in seconds and round the change time UP, so a token minted in the
 *    same wall-clock second as the change is treated as STALE. A false "stale"
 *    costs one silent renewal; a false "fresh" is a security miss.
 *  - `skewMs` tolerates clock drift between Logto and this service by moving the
 *    change time slightly earlier. It bounds how long a just-pre-change token is
 *    still accepted, so keep it small.
 *  - A null/undefined `authzChangedAt` means no change has ever been recorded for
 *    this user, so every token is fresh. This is what makes the rollout silent.
 */
export const isTokenAuthzFresh = (
  iatSeconds: number | undefined,
  authzChangedAt: Date | null | undefined,
  skewMs: number
): boolean => {
  if (authzChangedAt == null) {
    return true
  }
  if (typeof iatSeconds !== 'number' || !Number.isFinite(iatSeconds)) {
    return false
  }
  const thresholdSeconds = Math.ceil((authzChangedAt.getTime() - skewMs) / 1000)
  return iatSeconds >= thresholdSeconds
}
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `cd plugins/functions/alp-usermgmt && deno test --allow-env src/authz-freshness_test.ts`
Expected: PASS — `ok | 7 passed | 0 failed`.

- [ ] **Step 6: Commit**

```bash
git add plugins/functions/alp-usermgmt/src/authz-freshness.ts \
        plugins/functions/alp-usermgmt/src/authz-freshness_test.ts \
        plugins/functions/alp-usermgmt/deno.json
git commit -m "feat(usermgmt): add token authorization freshness comparison"
```

---

## Task 3: Configuration flags

**Files:**
- Modify: `plugins/functions/alp-usermgmt/src/env.ts`
- Modify: `docker-compose.yml`

- [ ] **Step 1: Read the existing env module to match its style**

Run: `sed -n '1,60p' plugins/functions/alp-usermgmt/src/env.ts`
Expected: an exported `env` object reading `Deno.env.get(...)` with defaults. Follow whatever accessor pattern is already there.

- [ ] **Step 2: Add the two settings**

Add to the exported `env` object in `plugins/functions/alp-usermgmt/src/env.ts`:

```ts
  // D2E issue 2410. When false the freshness check is evaluated and logged but
  // never rejects, so behaviour can be observed in production before enforcing.
  AUTHZ_FRESHNESS_ENFORCED: Deno.env.get('USER_MGMT_AUTHZ_FRESHNESS_ENFORCED') === 'true',
  // Clock-drift allowance between Logto and this service, in milliseconds.
  AUTHZ_FRESHNESS_SKEW_MS: Number(Deno.env.get('USER_MGMT_AUTHZ_FRESHNESS_SKEW_MS') ?? '2000'),
```

- [ ] **Step 3: Surface the flags in compose**

Run: `grep -n "USER_MGMT_IDP_SUBJECT_PROP" docker-compose.yml` to locate the usermgmt environment block, then add adjacent to it:

```yaml
      USER_MGMT_AUTHZ_FRESHNESS_ENFORCED: ${USER_MGMT_AUTHZ_FRESHNESS_ENFORCED:-false}
      USER_MGMT_AUTHZ_FRESHNESS_SKEW_MS: ${USER_MGMT_AUTHZ_FRESHNESS_SKEW_MS:-2000}
```

- [ ] **Step 4: Verify the flags load**

Run: `npm run start && npm run local -- logs alp-usermgmt | tail -20`
Expected: the service starts with no `undefined` env warnings.

- [ ] **Step 5: Commit**

```bash
git add plugins/functions/alp-usermgmt/src/env.ts docker-compose.yml
git commit -m "feat(usermgmt): add authz freshness feature flags"
```

---

## Task 4: Enforcement in `addUserObjToReq`

**Files:**
- Modify: `plugins/functions/alp-usermgmt/src/middlewares/add-user-object-to-req.ts:1-58`
- Modify: `plugins/functions/alp-usermgmt/src/types.ts`

**Response contract** — referenced by Tasks 8 and 9; do not change it afterwards:

| Field | Value |
|---|---|
| Status | `401` |
| Header | `X-D2E-Authz-Stale: 1` |
| Body | `{ "code": "AUTHZ_STALE_TOKEN", "message": "Authorization changed; token refresh required" }` |

The dedicated header exists so the client can distinguish this from an ordinary expired-token `401`
without parsing the body.

- [ ] **Step 1: Replace the middleware**

Replace lines 1–58 of `plugins/functions/alp-usermgmt/src/middlewares/add-user-object-to-req.ts`:

```ts
import { NextFunction, Response } from 'express'
import { createLogger } from '../Logger'
import { IAppRequest, ITokenUser } from '../types'
import jwt from 'jsonwebtoken'
import { CONTAINER_KEY, SERVICE_USER_ID } from '../const'
import { env } from '../env'
import { Container } from 'typedi'
import { UserService } from '../services'
import { isTokenAuthzFresh } from '../authz-freshness'

const subProp = env.USER_MGMT_IDP_SUBJECT_PROP
const logger = createLogger('AddUserObjToReq')

export const addUserObjToReq = async (req: IAppRequest, res: Response, next: NextFunction) => {
  logger.debug('Add user obj to req')

  try {
    const bearerToken = req.headers.authorization as string
    if (!bearerToken) {
      return next()
    }

    const token = jwt.decode(bearerToken.replace(/bearer /i, '')) as jwt.JwtPayload
    if (!(subProp in token)) {
      logger.error(`"${subProp}" is not found in token`)
      return res.status(400).send()
    }

    const { oid } = token
    const sub = token[subProp]
    const idpUserId = oid! || sub!

    // M2M tokens have sub === client_id; skip user lookup but still
    // set a minimal req.user so downstream middleware doesn't crash. Tag the
    // userId with the SERVICE_USER_ID sentinel so authz middleware bypasses
    // checks only for true service tokens — not for unprovisioned end-users
    // (who get an empty userId below and must NOT bypass).
    // Service tokens carry no user roles, so freshness does not apply to them.
    if (sub === token.client_id) {
      req.user = { userId: SERVICE_USER_ID, idpUserId: sub } as ITokenUser
      return next()
    }

    const userService = Container.get(UserService)
    const dbUser = await userService.getUserByIdpUserId(idpUserId)

    // D2E issue 2410: the row above is a SELECT * we already had to make, so
    // authz_changed_at costs no extra query.
    if (dbUser) {
      const isFresh = isTokenAuthzFresh(token.iat, dbUser.authzChangedAt, env.AUTHZ_FRESHNESS_SKEW_MS)
      if (!isFresh) {
        if (env.AUTHZ_FRESHNESS_ENFORCED) {
          logger.info(
            `Rejecting stale token for ${idpUserId}: iat=${token.iat} authz_changed_at=${dbUser.authzChangedAt?.toISOString()}`
          )
          res.setHeader('X-D2E-Authz-Stale', '1')
          return res.status(401).send({
            code: 'AUTHZ_STALE_TOKEN',
            message: 'Authorization changed; token refresh required'
          })
        }
        logger.warn(
          `[shadow] stale token would be rejected for ${idpUserId}: iat=${token.iat} authz_changed_at=${dbUser.authzChangedAt?.toISOString()}`
        )
      }
      req.isAuthzTokenFresh = isFresh
    } else {
      // No usermgmt row yet (first login / auto-provisioning). There is no
      // recorded change for this user to be stale against.
      req.isAuthzTokenFresh = true
    }

    const user: ITokenUser = {
      userId: dbUser?.id || '',
      idpUserId
    }

    req.user = user
    Container.set(CONTAINER_KEY.CURRENT_USER, req.user)

    return next()
  } catch (err) {
    logger.error(`Error when adding user obj to req: ${err}`)
    return res.status(500).send()
  }
}
```

- [ ] **Step 2: Add the request flag to the request type**

In `plugins/functions/alp-usermgmt/src/types.ts`, add to the `IAppRequest` interface:

```ts
  isAuthzTokenFresh?: boolean
```

- [ ] **Step 3: Verify normal traffic is unaffected**

Run: `npm run start && npm run local -- logs alp-usermgmt | grep "\[shadow\]" | wc -l`
Expected: `0` — every existing row has `authz_changed_at = NULL`, so every token is fresh.

- [ ] **Step 4: Commit**

```bash
git add plugins/functions/alp-usermgmt/src/middlewares/add-user-object-to-req.ts \
        plugins/functions/alp-usermgmt/src/types.ts
git commit -m "feat(usermgmt): reject access tokens issued before an authorization change"
```

---

## Task 5: Protect `grant-roles-by-scopes` from stale reapplication

Without this, a stale token can still write the old permission set back into the database and undo the
change that set `authz_changed_at`. The middleware runs *after* `addUserObjToReq`, so
`req.isAuthzTokenFresh` is already populated. The guard applies in shadow mode too — it is a correctness
fix, not an enforcement behaviour.

**Files:**
- Modify: `plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts:117-160`

- [ ] **Step 1: Guard the reconciliation block**

In `plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts`, insert immediately after the
`entitlementsSync.sync(...)` call that ends on line 120 and before the `if (isSync && env.IDP_AUTO_PROVISION_USERS) {`
on line 122:

```ts
    // D2E issue 2410: the block below reconciles the portal database *from* the
    // token. A token minted before the most recent authorization change carries
    // the old permission set, so replaying it here would revert the change an
    // admin just made. Serve the request, but never let a stale token write.
    if (req.isAuthzTokenFresh === false) {
      logger.info(`Skipping role reconciliation for "${sub}": token predates the last authorization change`)
      return next()
    }

```

- [ ] **Step 2: Verify placement**

Run: `sed -n '113,134p' plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts`
Expected: the guard appears after the entitlements sync and before the `isSync` reconciliation block.

- [ ] **Step 3: Commit**

```bash
git add plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts
git commit -m "fix(usermgmt): do not reconcile roles from a token that predates an authz change"
```

---

## Task 6: Stamp `authz_changed_at` at every mutation point

The five flows from the issue funnel through exactly two services. Every stamp happens inside the same
transaction as the change wherever one exists, so the stamp cannot be lost while the change lands.

**Files:**
- Modify: `plugins/functions/alp-usermgmt/src/services/UserService.ts`
- Modify: `plugins/functions/alp-usermgmt/src/services/UserGroupService.ts:110-175`
- Modify: `plugins/functions/alp-usermgmt/src/services/MemberService.ts:45-70`

- [ ] **Step 1: Confirm the repository update signature**

Run: `grep -n "async update" -A 8 plugins/functions/alp-usermgmt/src/repositories/Repository.ts`
Expected: reveals whether the signature is `update(criteria, fields, trx)` or
`update(criteria, fields, tokenUser, trx)`. Use exactly what is there — mirror how `UserService.updateUser`
(`services/UserService.ts:57`) calls it, including its `Container.get<ITokenUser>(CONTAINER_KEY.CURRENT_USER)`
argument if present.

- [ ] **Step 2: Add the stamping method to `UserService`**

Append to the `UserService` class in `plugins/functions/alp-usermgmt/src/services/UserService.ts`,
adjusting the `update` arguments to match Step 1:

```ts
  /**
   * D2E issue 2410. Records that this user's authorization changed, so access
   * tokens minted before now are rejected by addUserObjToReq. Pass the
   * surrounding transaction wherever one exists, so the stamp lands atomically
   * with the change itself.
   */
  async touchAuthzChangedAt(id: string, trx?: Knex) {
    this.logger.info(`Stamp authz_changed_at for user ${id}`)
    await this.userRepo.update({ id }, { authz_changed_at: new Date() }, trx)
  }
```

- [ ] **Step 3: Stamp on group registration (roles up, dataset grant, request approval)**

In `plugins/functions/alp-usermgmt/src/services/UserGroupService.ts`, in `registerUserToGroup`, replace
lines 126–128:

```ts
    await this.addUserToGroup(userId, groupId, trx)
    await this.syncRoleToLogto(userId, groupId, 'assign')
```

with:

```ts
    await this.addUserToGroup(userId, groupId, trx)
    await this.userService.touchAuthzChangedAt(userId, trx)
    await this.syncRoleToLogto(userId, groupId, 'assign')
```

- [ ] **Step 4: Stamp on group withdrawal (roles down, dataset revoke)**

In the same file, in `withdrawUserFromGroup`, replace lines 169–171:

```ts
    await this.userGroupRepo.delete({ user_id: userId, b2c_group_id: groupId }, trx)
    await this.syncRoleToLogto(userId, groupId, 'remove')
```

with:

```ts
    await this.userGroupRepo.delete({ user_id: userId, b2c_group_id: groupId }, trx)
    await this.userService.touchAuthzChangedAt(userId, trx)
    await this.syncRoleToLogto(userId, groupId, 'remove')
```

- [ ] **Step 5: Stamp on user creation**

In `plugins/functions/alp-usermgmt/src/services/MemberService.ts`, in `createUser`, immediately after
`await this.userService.updateUser(updateFields, trx)` (line 58) add:

```ts
      await this.userService.touchAuthzChangedAt(newUser.id!, trx)
```

A no-op in practice — a brand-new user holds no token — but it keeps the invariant "every authorization
mutation stamps" true, so a future reader cannot mistake its absence for a decision.

- [ ] **Step 6: Verify every one of the five issue flows is covered**

Run:
```bash
grep -rn "touchAuthzChangedAt" plugins/functions/alp-usermgmt/src
grep -rn "registerUserToGroup\|withdrawUserFromGroup" plugins/functions/alp-usermgmt/src --include="*.ts" | grep -v "UserGroupService.ts"
```
Expected: `services/StudyAccessRequestService.ts:83` (approve request) and the `UserGroupRouter` routes
reach a stamp via `registerUserToGroup` / `withdrawUserFromGroup`; `MemberService` covers add and delete.
No mutation path reaches the Logto role sync without passing a stamp.

- [ ] **Step 7: Commit**

```bash
git add plugins/functions/alp-usermgmt/src/services/UserService.ts \
        plugins/functions/alp-usermgmt/src/services/UserGroupService.ts \
        plugins/functions/alp-usermgmt/src/services/MemberService.ts
git commit -m "feat(usermgmt): stamp authz_changed_at on every authorization mutation"
```

---

## Task 7: Logto session invalidation for revoke and delete

Stamping stops D2E honouring a stale token; it does not stop that token being presented to WebAPI. For
withdrawals and deletions the session itself is revoked. The endpoints below were read from the deployed
instance's own OpenAPI document (`http://alp-logto:3001/api/swagger.json`).

**Files:**
- Modify: `plugins/functions/alp-usermgmt/src/api/LogtoAPI.ts`
- Modify: `plugins/functions/alp-usermgmt/src/services/UserGroupService.ts`
- Modify: `plugins/functions/alp-usermgmt/src/services/MemberService.ts:78-100`

- [ ] **Step 1: Confirm the M2M client may call the session endpoints**

Run:
```bash
curl -s -o /dev/null -w "%{http_code}\n" -H "Authorization: Bearer $M2M_TOKEN" \
  "http://alp-logto:3001/api/users/<a-real-idp-user-id>/sessions"
```
Expected: `200`. If `403`, **stop and escalate** — the `alp-svc` M2M role needs the sessions permission
granted in Logto before this task can be completed. Do not work around it.

- [ ] **Step 2: Add the two API methods**

Run first: `grep -n "getRequestOptions\|const options =\|fetchAllPages" plugins/functions/alp-usermgmt/src/api/LogtoAPI.ts | head -8`
and mirror whatever helper that file already uses for auth headers.

Append to the `LogtoAPI` class in `plugins/functions/alp-usermgmt/src/api/LogtoAPI.ts`:

```ts
  // D2E issue 2410. Logto 1.38.0+ exposes admin session management; verified
  // present in the deployed instance's OpenAPI document.
  async getUserSessions(idpUserId: string): Promise<{ id: string }[]> {
    return this.fetchAllPages<{ id: string }>(`/api/users/${idpUserId}/sessions`)
  }

  /**
   * Revokes one session. `revokeGrantsTarget=firstParty` also drops the
   * first-party app grants and their token chains, which is what forces the
   * user to reauthenticate. Third-party grants are left alone.
   */
  async revokeUserSession(idpUserId: string, sessionId: string): Promise<void> {
    const options = await this.getRequestOptions()
    const url = `${this.baseUrl}/api/users/${idpUserId}/sessions/${sessionId}?revokeGrantsTarget=firstParty`
    await del(url, options)
  }
```

- [ ] **Step 3: Add a best-effort revocation helper**

Append to the `UserGroupService` class in `plugins/functions/alp-usermgmt/src/services/UserGroupService.ts`:

```ts
  /**
   * D2E issue 2410. Best-effort: the database change and the stamp have already
   * committed, so a failure here degrades to "enforced by D2E, still valid at
   * WebAPI until exp" — never to a lost authorization change.
   */
  async revokeIdpSessions(idpUserId: string): Promise<{ revoked: number; failed: number }> {
    let revoked = 0
    let failed = 0
    try {
      const sessions = await this.logtoAPI.getUserSessions(idpUserId)
      for (const session of sessions) {
        try {
          await this.logtoAPI.revokeUserSession(idpUserId, session.id)
          revoked++
        } catch (err) {
          failed++
          this.logger.warn(`Failed to revoke session ${session.id} for ${idpUserId}: ${err}`)
        }
      }
    } catch (err) {
      this.logger.warn(`Failed to list sessions for ${idpUserId}: ${err}`)
      failed++
    }
    this.logger.info(`Session revocation for ${idpUserId}: revoked=${revoked} failed=${failed}`)
    return { revoked, failed }
  }
```

- [ ] **Step 4: Call it on withdrawal**

In `withdrawUserFromGroup`, after the `syncRoleToLogto(userId, groupId, 'remove')` line from Task 6, add:

```ts
    const user = await this.userService.getUser(userId, trx)
    if (user?.idpUserId) {
      await this.revokeIdpSessions(user.idpUserId)
    }
```

- [ ] **Step 5: Call it on delete**

In `plugins/functions/alp-usermgmt/src/services/MemberService.ts`, in `deleteUser`, replace lines 89–92:

```ts
      await this.userService.deleteUser(userId, trx)
      if (user.idpUserId) {
        await this.logtoApi.deleteUser(user.idpUserId)
      }
```

with:

```ts
      await this.userService.deleteUser(userId, trx)
      if (user.idpUserId) {
        // Revoke first: once the Logto user is deleted the session endpoints no
        // longer resolve, and the outstanding token would survive to exp.
        await this.userGroupService.revokeIdpSessions(user.idpUserId)
        await this.logtoApi.deleteUser(user.idpUserId)
      }
```

`MemberService` already holds a `userGroupService` reference — see `services/MemberService.ts:67`
(`this.userGroupService.syncRoleToLogto`). No new injection is needed.

- [ ] **Step 6: Verify against the live stack**

Run: sign in as a test researcher, revoke a dataset role as admin, then
`npm run local -- logs alp-usermgmt | grep "Session revocation"`
Expected: a line with `revoked>=1 failed=0`, and the researcher's next request returns `401` with
`X-D2E-Authz-Stale: 1`.

- [ ] **Step 7: Commit**

```bash
git add plugins/functions/alp-usermgmt/src/api/LogtoAPI.ts \
        plugins/functions/alp-usermgmt/src/services/UserGroupService.ts \
        plugins/functions/alp-usermgmt/src/services/MemberService.ts
git commit -m "feat(usermgmt): revoke Logto sessions on role withdrawal and user deletion"
```

---

## Task 8: Portal client — silent renewal and single retry

**Depends on gate G2.**

**Files:**
- Modify: `plugins/ui/apps/portal/src/containers/auth/oidc/oidc.ts`
- Modify: `plugins/ui/apps/portal/src/axios/request.ts:1-47`

- [ ] **Step 1: Resolve the renewal API of the installed OIDC library**

Run:
```bash
cd plugins/ui/apps/portal && npm ci
grep -rn "renewTokens\|refreshTokens\|forceRefresh" node_modules/@axa-fr/react-oidc/dist/vanilla/vanillaOidc.d.ts
```
Expected: one of `renewTokensAsync`, `refreshTokensAsync`, or a `getValidTokenAsync(..., forceRefresh)`
overload. Use whichever exists. If none exists, **stop and escalate** — the fallback is a guarded full
`login()` redirect (the pattern already at `containers/auth/oidc/OidcLoginSilent.tsx:46-52`), which is a
UX regression the team must approve.

- [ ] **Step 2: Add the force-renew helper**

Append to `plugins/ui/apps/portal/src/containers/auth/oidc/oidc.ts`, substituting the symbol confirmed in
Step 1 for `renewTokensAsync`:

```ts
/**
 * D2E issue 2410. Forces a new access token so that role claims minted before an
 * authorization change are replaced. Returns the new token, or undefined when
 * renewal is not possible (expired or revoked refresh token).
 */
export const forceRenewOidcToken = async (): Promise<string | void> => {
  const oidc = VanillaOidc.get();

  try {
    await oidc.renewTokensAsync();
    const token = await oidc.getValidTokenAsync();
    return token?.tokens?.accessToken;
  } catch (err) {
    console.error("[forceRenewOidcToken]", err);
  }
};
```

- [ ] **Step 3: Detect the stale signal and retry once**

In `plugins/ui/apps/portal/src/axios/request.ts`, replace the import on line 4:

```ts
import { forceRenewOidcToken, isOidcAuthenticated } from "../containers/auth/oidc/oidc";
```

and replace the response interceptor at lines 27–47:

```ts
// Retry logic for ERR_NETWORK_CHANGED errors (Docker container restarts during e2e tests)
// and for D2E issue 2410 authorization-stale rejections.
client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config;
    if (!config) return Promise.reject(error);

    // D2E issue 2410: the server rejected this token because the user's
    // authorization changed after it was issued. Renew once, retry once.
    // `__authzRetried` is the loop guard: if the renewed token is rejected too,
    // surface the error rather than renewing again.
    const isAuthzStale =
      error.response?.status === 401 &&
      (error.response?.headers?.["x-d2e-authz-stale"] === "1" ||
        error.response?.data?.code === "AUTHZ_STALE_TOKEN");

    if (isAuthzStale && !config.__authzRetried) {
      config.__authzRetried = true;
      console.info("[Portal API] authorization changed; renewing token and retrying once");
      const token = await forceRenewOidcToken();
      if (!token) {
        console.warn("[Portal API] token renewal failed after an authorization change");
        return Promise.reject(error);
      }
      return client.request(config);
    }

    const isNetworkChanged = error.code === "ERR_NETWORK" || error.message?.includes("ERR_NETWORK_CHANGED");

    if (isNetworkChanged) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < 3) {
        config.__retryCount += 1;
        console.warn(`[Portal API] ERR_NETWORK_CHANGED, retrying in 10s (attempt ${config.__retryCount}/3)...`);
        await new Promise((resolve) => setTimeout(resolve, 10000));
        return client.request(config);
      }
    }

    return Promise.reject(error);
  }
);
```

**Note on the 800 ms memoisation** at line 81: it caches by serialised request options, and the retry
re-enters through `client.request(config)` *inside* the interceptor, below the memoisation layer, so it is
unaffected. Do not move the retry above it.

- [ ] **Step 4: Verify in the browser**

Run: `USER_MGMT_AUTHZ_FRESHNESS_ENFORCED=true npm run start`, sign in as a researcher in one browser
profile and as an admin in another, grant the researcher a dataset, then act as the researcher without
reloading.
Expected: exactly one `authorization changed; renewing token and retrying once` console line, the request
succeeds, and no login screen appears.

- [ ] **Step 5: Commit**

```bash
git add plugins/ui/apps/portal/src/containers/auth/oidc/oidc.ts \
        plugins/ui/apps/portal/src/axios/request.ts
git commit -m "feat(portal): silently renew and retry once when authorization changed"
```

---

## Task 9: End-to-end tests

**Files:**
- Create: `tests/e2e/tests/02-users/authz-freshness.spec.ts`

- [ ] **Step 1: Read an existing two-actor spec for this suite's fixtures**

Run: `sed -n '1,40p' tests/e2e/tests/02-users/grant-user-admin-role.spec.ts`
Expected: the import style, fixtures and login helpers this suite uses. Reuse them verbatim — do not invent
a new harness.

- [ ] **Step 2: Write the failing tests**

Create `tests/e2e/tests/02-users/authz-freshness.spec.ts`, substituting the helpers observed in Step 1:

```ts
import { test, expect } from "@playwright/test";
// Replace these with the helpers observed in Step 1.
import { loginAsAdmin, loginAsResearcher, grantDatasetAccess, revokeDatasetAccess } from "../../utils";

test.describe("D2E issue 2410 - authorization freshness", () => {
  test("granted dataset access applies without logout", async ({ browser }) => {
    const researcherContext = await browser.newContext();
    const researcherPage = await researcherContext.newPage();
    await loginAsResearcher(researcherPage);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);
    await grantDatasetAccess(adminPage, "researcher@d2e.local", "Second datamart synpuf");

    // No re-login: the client must renew silently and retry.
    await researcherPage.reload();
    await expect(researcherPage.getByText("Second datamart synpuf")).toBeVisible({ timeout: 30000 });
    await expect(researcherPage.getByRole("button", { name: /sign in/i })).toHaveCount(0);

    await researcherContext.close();
    await adminContext.close();
  });

  test("revoked dataset access stops working without logout", async ({ browser }) => {
    const researcherContext = await browser.newContext();
    const researcherPage = await researcherContext.newPage();
    await loginAsResearcher(researcherPage);

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);
    await revokeDatasetAccess(adminPage, "researcher@d2e.local", "Second datamart synpuf");

    await researcherPage.reload();
    await expect(researcherPage.getByText("Second datamart synpuf")).toHaveCount(0, { timeout: 30000 });

    await researcherContext.close();
    await adminContext.close();
  });

  test("a stale token cannot revert a fresh grant", async ({ browser, request }) => {
    // Regression guard for grant-roles-by-scopes.ts: drive a sync request with
    // the pre-change token and assert the grant survives.
    const researcherContext = await browser.newContext();
    const researcherPage = await researcherContext.newPage();
    await loginAsResearcher(researcherPage);
    const staleToken = await researcherPage.evaluate(() => localStorage.getItem("bearerToken"));

    const adminContext = await browser.newContext();
    const adminPage = await adminContext.newPage();
    await loginAsAdmin(adminPage);
    await grantDatasetAccess(adminPage, "researcher@d2e.local", "Second datamart synpuf");

    const response = await request.post("/usermgmt/api/user-group/list", {
      headers: { Authorization: `Bearer ${staleToken}` },
      data: { sync: true, userId: "researcher-idp-user-id" }
    });
    expect(response.status()).toBe(401);
    expect(response.headers()["x-d2e-authz-stale"]).toBe("1");

    await researcherPage.reload();
    await expect(researcherPage.getByText("Second datamart synpuf")).toBeVisible({ timeout: 30000 });

    await researcherContext.close();
    await adminContext.close();
  });
});
```

- [ ] **Step 3: Run with the flag off to verify they fail**

Run: `cd tests/e2e && npx playwright test tests/02-users/authz-freshness.spec.ts`
Expected: all three FAIL — the grant/revoke cases because the change is not applied without a re-login, the
third on the `401` assertion, because `USER_MGMT_AUTHZ_FRESHNESS_ENFORCED` defaults to `false`.

- [ ] **Step 4: Enable enforcement and re-run**

Run:
```bash
USER_MGMT_AUTHZ_FRESHNESS_ENFORCED=true npm run start
cd tests/e2e && npx playwright test tests/02-users/authz-freshness.spec.ts
```
Expected: `3 passed`.

- [ ] **Step 5: Run the neighbouring suites for regressions**

Run: `cd tests/e2e && npx playwright test tests/02-users tests/03-researcher`
Expected: no new failures against the pre-change baseline. Capture that baseline first if you do not have one.

- [ ] **Step 6: Commit**

```bash
git add tests/e2e/tests/02-users/authz-freshness.spec.ts
git commit -m "test(e2e): cover authorization freshness for grant, revoke and stale reapplication"
```

---

## Task 10: Rollout and observability

- [ ] **Step 1: Deploy with enforcement off**

Deploy Tasks 1–9 with `USER_MGMT_AUTHZ_FRESHNESS_ENFORCED=false`. The migration lands, stamping starts, and
the middleware logs `[shadow] stale token would be rejected …` without rejecting anything. The Task 5 guard
is active regardless of the flag — it is a correctness fix.

- [ ] **Step 2: Observe for one full token lifetime**

Run: `npm run local -- logs alp-usermgmt | grep -c "\[shadow\]"`
Expected: a non-zero count appearing only after administrative changes. A steady background rate with no
admin activity means the stamp is firing where it should not — investigate before enabling.

- [ ] **Step 3: Enable in staging**

Set `USER_MGMT_AUTHZ_FRESHNESS_ENFORCED=true`, run the Task 9 suite, and watch `Rejecting stale token`
volume. Each rejection should be followed within seconds by a successful retry from the same user.

- [ ] **Step 4: Enable in production; rollback is the flag**

Rollback is `USER_MGMT_AUTHZ_FRESHNESS_ENFORCED=false` — no redeploy, no migration reversal. The column and
the stamps are harmless while the flag is off.

- [ ] **Step 5: Commit any config changes**

```bash
git add -A && git commit -m "chore: enable authz freshness enforcement"
```

---

## Error behaviour summary

| Situation | Behaviour |
|---|---|
| `authz_changed_at` is `NULL` | Fresh. Every pre-existing user on deploy day. |
| `iat` ≥ stamp (with skew) | Fresh. Normal path — no extra work, no extra query. |
| `iat` < stamp, flag off | `[shadow]` log, request proceeds, reconciliation still skipped. |
| `iat` < stamp, flag on | `401` + `X-D2E-Authz-Stale: 1` + `AUTHZ_STALE_TOKEN`. |
| Token has no `iat` | Stale (fail closed) when a change is recorded; fresh when none is. |
| M2M / service token (`sub === token.client_id`) | Bypassed before the check; carries no user roles. |
| No `usermgmt.user` row (first login) | Fresh — nothing to be stale against; auto-provisioning unchanged. |
| Client renewal succeeds | One transparent retry; user sees nothing. |
| Client renewal fails | Error surfaces to the caller; no retry loop (`__authzRetried`). |
| Renewed token still stale | Second `401` is not retried. This is the runtime symptom that refresh is not re-minting claims — see gate G1. |
| Logto session revocation fails | Logged with counts; DB change and stamp already committed, so D2E still enforces. Degrades to "valid at WebAPI until `exp`". |

---

## Scope

`plugins/functions/alp-usermgmt` (enforcement, stamping, session revocation), the `usermgmt.user`
migration, the portal browser client's renew-and-retry, and Playwright coverage.

## Non-goals

- **The portal Danet function** (`plugins/functions/portal/src/common/request-context.middleware.ts`). It
  only decodes the token (`:17`) and performs no user load, so enforcement there would add a per-request
  lookup and *would* need the deferred high-water-mark cache. Separate work.
- **analytics-svc** (`plugins/functions/_shared/alp-base-utils/src/GetUser.ts` consumers). It reads identity
  from the token, not roles.
- **The trex declarative scope gate** (`plugins/functions/package.json` → `trex.functions[].scopes`).
  Enforced by the trex runtime, whose source is not in this repository.
- Lowering `accessTokenTtl`, changing the token contract, or adding claims.
- Any change to the D2E role or permission model.

## Known limitations — separate work required

- **Atlas / WebAPI are not fixed by this plan.** Atlas performs its own PKCE login
  (`plugins/atlas/login-bridge/bridge.js:125-127`) and refreshes on its own timer
  (`plugins/atlas/token-keeper/token-keeper.js:80-91`); WebAPI derives `sec_user_role` *from the JWT scopes*
  via `GET /user/me` (`plugins/functions/alp-usermgmt/src/api/WebAPI.ts:19-32`). No D2E middleware sits in
  that path. Task 7's session revocation is the only lever that reaches Atlas, and only for
  withdrawal/deletion. Making *additive* changes converge in Atlas requires re-triggering
  `POST /usermgmt/api/me/sync-webapi-roles` (`routes/MeRouter.ts:192`) after a renewal — separate work.
- **Jupyter websockets are authenticated once, at upgrade.** Caddy forward-auths to
  `/usermgmt/api/me/is_token_valid_internal` (`docker-compose.yml:672`, handler `routes/MeRouter.ts:207`).
  An established socket is never re-checked, so a revocation does not terminate a live notebook session.
  Terminating live sockets is a product decision and separate work.
- **Running dataflow / Strategus jobs** started under prior authorization are unaffected.

## Open items needing team input

1. **Gate G1** — the refresh-token claim experiment (credentials or an authorized session for a test user).
2. **Gate G2** — resolved by Task 8 Step 1, but escalate if the symbol does not exist.
3. **Logto M2M permission** for the sessions endpoints — resolved by Task 7 Step 1; a `403` needs a Logto
   role change by whoever administers the tenant.
4. Confirmation that this worktree at `6c5b88f36` is the intended base branch.
