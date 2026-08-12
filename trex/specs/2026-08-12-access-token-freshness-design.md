# Access-token freshness — design spec

**Issue:** [OHDSI/Data2Evidence#2410](https://github.com/OHDSI/Data2Evidence/issues/2410) — authorization
changes do not apply to an already signed-in user until the 1-hour access token expires.
**Selected option:** A — silent renewal as the default; forced re-login for revoke and delete.
**Date:** 2026-08-12 · **Evidence base:** worktree at `6c5b88f36`, live `alp-logto` instance, <https://openapi.logto.io/>
**Status:** approved, and **amended** — the team confirmed request-time **enforcement** rather than
signalling. §3.3 and §5.2 below are updated accordingly. The blocking experiment in
[§11](#11-decisions-still-required) still gates implementation.
**Implementation plan:** `trex/plans/2026-08-12-authz-freshness-enforcement.md`

---

## 1. Problem restated

The `roles` claim is computed by the Logto custom-JWT script at token issuance
(`docker-compose.yml:975`) and the access token is valid for 3600 s
(`docker-compose.yml:979`, `services/alp-logto/post-init/src/main.ts:201`). Administrative changes update
the portal database and Logto roles but leave the user's existing token untouched, so the change is invisible
until expiry or logout. Worse, on requests carrying `sync`, the middleware at
`plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts:129–153` reconciles the portal
database *from* the token, so a stale token can revert a change an administrator just made.

## 2. Design goals

1. Additive changes become effective on the user's next request, silently — no logout, no lost work.
2. Revocations and deletions are enforced immediately, accepting a forced re-login.
3. A token that predates an applied change can never write stale state back into the portal database.
4. No increase in token traffic for users whose authorization did not change.
5. Failure modes are explicit: for revocations the system fails closed.

## 3. Architecture

### 3.1 Freshness is a comparison, not a new claim

Every user gets a server-side **authorization change timestamp** (working name
`usermgmt.user.authz_changed_at`). Services compare it against the standard `iat` claim of the presented
token:

> token is **stale** ⟺ `iat` < `authz_changed_at` (minus a small clock-skew allowance)

This is the core of the design. It deliberately introduces **no new token claim and no change to the Logto
custom-JWT script**, because `iat` is already present on every token D2E issues and the middleware already
decodes the token (`grant-roles-by-scopes.ts:35`). An alternative that embeds an explicit version claim is
recorded in §10 and is not preferred.

### 3.2 Components

| Component | Role in this design |
|---|---|
| `usermgmt.user` (new column) | Holds `authz_changed_at`; the single source of truth for freshness. |
| `UserGroupService.syncRoleToLogto` (`services/UserGroupService.ts:239`) | Existing chokepoint through which roles/dataset flows already pass — the natural place for the stamp. |
| `MemberService` (`services/MemberService.ts:54`, `:92`) | Existing chokepoint for add/delete user. |
| Token-freshness check | **AMENDED (scope narrowed):** exactly one enforcement point — `plugins/functions/alp-usermgmt/src/middlewares/add-user-object-to-req.ts:43`, which already loads the user row. Not a shared utility; see §3.5. |
| `grant-roles-by-scopes` middleware | Must consult freshness *before* its reconciliation block (`:129–153`) and skip reconciliation on a stale token. |
| Stale signal | A response header (working name `X-D2E-Authz-Stale`) set by services when they detect a stale token. Chosen over a new status code so existing error handling is untouched. |
| Portal HTTP client | `plugins/ui/apps/portal/src/axios/request.ts` — request interceptor `:11`, response interceptor `:27`. The response interceptor is the single place the stale signal is observed. |
| Portal OIDC client | `@axa-fr/react-oidc` 6.10.9; renewal reached through `containers/auth/oidc/oidc.ts:4` (`getValidTokenAsync`), renewal events already handled at `OidcApp.tsx:56,78–87`. |
| Logto Management API | Session/grant revocation for the revoke/delete path (§6). |

### 3.3 Happy path (additive change) — AMENDED: enforcement, not signalling

1. Admin performs an additive change. The owning service stamps `authz_changed_at = now` for the target user
   in the same transaction that applies the change, and continues to sync roles to Logto as today.
2. The target user's next **`alp-usermgmt`** request arrives with an older `iat`. The service **rejects**
   it: `401` + `X-D2E-Authz-Stale: 1` + body
   `{"code":"AUTHZ_STALE_TOKEN","message":"Authorization changed; token refresh required"}`. The request is
   never served under stale claims. (Body shape amended to match the plan's response contract; the
   `authzChangedAt` value is deliberately not returned — it leaks admin activity timing to the client.)
3. The portal's response interceptor sees the marker, forces one token renewal, and retries the original
   request once with the new token, guarded by a per-request `__authzRetried` flag.
4. The renewed token carries current roles; the retry succeeds; nothing is visible to the user.

Effective latency: one request plus one renewal round-trip. This is *true immediate enforcement* — a stale
token cannot be used in either direction — so revocations no longer depend on renewal timing.

### 3.5 Scope narrowing (amendment, 2026-08-12)

The team confirmed enforcement belongs **only** in `add-user-object-to-req.ts`, and that this is
sufficient. Two consequences:

- **No extra query — verified.** `Repository.getOne` (`repositories/Repository.ts:23–35`) issues
  `.select()` with no column list, i.e. `SELECT *`, and `add-user-object-to-req.ts:43` already calls it via
  `UserService.getUserByIdpUserId`. `authz_changed_at` therefore arrives inside the row already being
  fetched on every request. Only `UserField` (`repositories/UserRepository.ts:12–17`), the `reducer`
  (`:25–32`) and the `User` entity need to carry it.
- **The global high-water-mark cache is deferred, not cancelled.** It existed solely to spare a DB read in
  services that do *not* already load the user — principally the portal Danet function
  (`plugins/functions/portal/src/common/request-context.middleware.ts:9`, which decodes the token at `:17`
  and performs no user load). In the narrowed scope there is no read to spare, and a cached mark older than
  the true mark would make a stale token look *fresh* — weakening the guarantee for no benefit. It becomes
  required the day enforcement extends to that function.

**Multi-instance consistency.** Because every replica reads the stamp from the row it already fetches
inside the request, there is no shared cache to invalidate and no convergence window. Enforcement is exact
on every replica from the first request after the mutating transaction commits.

**Out of scope as a result:** the portal Danet function, analytics-svc, the trex declarative scope gate,
Atlas/WebAPI and Jupyter websockets. §7 records what that leaves unfixed.

### 3.4 Why the portal does not poll

There is no WebSocket or SSE channel in the portal or in `alp-usermgmt` (verified — no `EventSource`,
`socket.io` or `websocket` usage in either). The stale signal therefore rides on responses the client is
already making. No polling loop is introduced.

## 4. Exact affected flows

| # | Flow | Route / service (current code) | Stamp `authz_changed_at` | Immediate enforcement |
|---|---|---|---|---|
| 1 | **Add user** | `routes/UserRouter.ts:55`; bulk assign `routes/UserGroupRouter.ts:365`; `services/MemberService.ts:54` + `:67` | Yes — but the user has no prior token, so it is a no-op in practice. Stamped for uniformity. | No |
| 2 | **Delete user** | `routes/UserRouter.ts:79`; `services/MemberService.ts:92` (Logto `DELETE /api/users/{id}`, `api/LogtoAPI.ts:133`) | Yes | **Yes** — revoke sessions/grants (§6). Today the deleted user's token keeps working until `exp`. |
| 3 | **Modify roles — upward** | `routes/UserGroupRouter.ts:125` (`/register-tenant-roles`), `:184` (`/register-study-roles`); `services/UserGroupService.ts:127` → `:239` | Yes | No — silent renewal |
| 3b | **Modify roles — downward** | `routes/UserGroupRouter.ts:253` (`/withdraw-tenant-roles`), `:365` (`/withdraw-study-roles`); `services/UserGroupService.ts:171` → `:239` | Yes | **Yes** |
| 4 | **Grant dataset researcher access** | same register routes; dataset role provisioning `routes/DatasetRoleRouter.ts:29`, backfill `:85`; `api/LogtoAPI.ts:271` `ensureDatasetRole` | Yes | No — silent renewal |
| 4b | **Revoke dataset researcher access** | same withdraw routes; `api/LogtoAPI.ts:296` `removeDatasetRole`, `:254` `removeRoleFromUser` | Yes | **Yes** |
| 5 | **Approve access request** | `routes/StudyAccessRequestRouter.ts:89` (`PUT /:action`) → `services/StudyAccessRequestService.ts:58,83` `registerUserToGroup` → `:239` | Yes | No — silent renewal |
| 5b | **Reject access request** | same route, `action = reject` | Yes, only if it withdraws an existing grant | Yes, only in that case |

Because flows 3–5 all funnel through `UserGroupService.registerUserToGroup` / `withdrawUserFromGroup` →
`syncRoleToLogto`, and 1–2 through `MemberService`, the stamp has exactly two homes. Any future mutation
that bypasses both would silently bypass this design — that constraint should be recorded in the code owner's
notes for `UserGroupService`.

### 4.1 Bulk operations

`/register-study-roles` accepts `userIds` (plural, `routes/UserGroupRouter.ts:184`) and
`/sync-roles-to-logto` (`:298`) iterates all users. Each affected user is stamped individually; a bulk
operation must not stamp users it did not change, or it would force a renewal storm across the tenant.

## 5. Token and session handling, and error behaviour

### 5.1 Renewal

- Renewal uses the existing refresh-token grant. Client config today: `refreshTokenTtlInDays: 14`,
  `alwaysIssueRefreshToken: true`, `rotateRefreshToken: true` (`docker-compose.yml:978`).
- The portal renews through its OIDC client; renewal already emits `token_renewed`, which
  `OidcApp.tsx:78–87` re-broadcasts as an `oidc:token_refreshed` window event. Downstream consumers of that
  event continue to work unchanged.
- **At most one renewal + one retry per request.** The retry carries a marker so a second stale response
  cannot start another cycle.

### 5.2 Error behaviour

| Situation | Behaviour |
|---|---|
| Renewal succeeds, retry succeeds | Silent. Nothing shown. |
| Renewal succeeds but the new token is *still* stale (claims did not refresh) | Do not loop. Record once per session, surface a non-blocking notice, and fall back to a guarded single re-login — the pattern already present at `OidcLoginSilent.tsx:42–53` (`d2e_first_login_role_refresh` sessionStorage guard). This is also the runtime symptom that the §11 experiment failed. |
| Renewal fails, change was **additive** | AMENDED for enforcement mode: the original request stays rejected (`401`) and surfaces as a normal error — the client does not retry a second time. The user is not logged out; the next request retries the cycle. |
| Freshness store unreachable **from the portal function** | Not applicable in the narrowed scope (§3.5) — the portal function no longer performs a freshness check. Retained for whenever enforcement is extended there: fail open, since an unreachable usermgmt must not lock every user out. `alp-usermgmt` itself cannot hit this case: it reads the column from the row it already loaded. |
| Renewal fails, change was a **revocation/deletion** | Fail closed: the session is already being revoked server-side (§6); the user is logged out with an explanatory message rather than dropped on a bare login screen. |
| Logto unreachable when stamping | The change still commits. The stamp is in the same transaction as the change, so freshness is never lost even if the Logto role sync fails — note `syncRoleToLogto` already returns `{status:'failed'}` rather than throwing (`UserGroupService.ts:270–274`). |
| Logto unreachable when revoking | The revoke/delete must not silently succeed. Surface the failure to the admin and retry; the DB change stands, so the user's access is at most stale until `exp`, which is today's behaviour. |
| Token has no `iat` | Treat as stale. (Not expected — `iat` is standard.) |
| Clock skew between services and Logto | A bounded allowance is applied to the comparison. The allowance value is a decision in §11. |

### 5.3 The reconciliation hazard

`grant-roles-by-scopes.ts:129–153` currently writes the token's view into the portal database whenever
`req.body.sync` is set. Under this design that block runs **only when the token is fresh**. On a stale token
the middleware serves the request but skips reconciliation entirely. Without this, the fix defeats itself:
the stale token would revert the very grant that set `authz_changed_at`. The existing PhysioNet carve-out at
`:135–140` remains as-is.

## 6. Revoke and delete: immediate enforcement

Verified against the deployed Logto instance's own OpenAPI document
(`http://alp-logto:3001/api/swagger.json`, HTTP 200, 226 paths):

- `GET /api/users/{userId}/sessions` — "Retrieve all non-expired sessions for the user…"
- `DELETE /api/users/{userId}/sessions/{sessionId}` — "Revoke a specific user session by its ID, optionally
  revoking associated target grants and tokens", optional query `revokeGrantsTarget` ∈ {`all`, `firstParty`}
- `GET /api/users/{userId}/grants`, `DELETE /api/users/{userId}/grants/{grantId}` — the latter revokes "a
  specific grant and its associated token chain"
- Management API auth is M2M (`security: [{"OAuth2": ["all"]}]`); D2E already provisions the `alp-svc` M2M
  client (`docker-compose.yml:978`)

Design decisions for this path:

1. **List-then-revoke.** There is no bulk revoke-all-sessions operation in the deployed spec.
2. **Session revocation, not grant revocation, is the default instrument.** Grant revocation explicitly
   destroys the token chain including the refresh token; session revocation is the narrower tool and
   `revokeGrantsTarget` makes the blast radius an explicit choice rather than an implicit one.
3. **Best-effort, non-blocking to the mutation.** The database change and the stamp commit first; revocation
   follows. A revocation failure is reported to the admin, never silently swallowed.
4. **Delete user** additionally has an existing WebAPI cleanup path
   (`api/WebAPI.ts` `deleteUserAccess`) which stays in the flow.
5. The user-visible contract for this path is a forced re-login with an explanation — the team's selected
   trade.

## 7. Scope: Atlas / WebAPI — **in scope, confirmed by code**

This is not optional. Three code facts put Atlas and WebAPI inside the blast radius:

1. **Atlas holds its own Logto token.** `plugins/atlas/login-bridge/bridge.js` performs an independent PKCE
   login against the same OIDC config (`REACT_APP_IDP_OIDC_CONFIG`, `bridge.js:30`), requests
   `offline_access` explicitly (`:38`), and writes the access token to `localStorage.bearerToken` for Atlas3,
   persisting the refresh token as `atlas_refresh_token` (`:125–127`).
2. **Atlas renews independently.** `plugins/atlas/token-keeper/token-keeper.js` runs a timer
   (`:80–91`) that decodes `exp` and performs a `refresh_token` grant before expiry (`:25–72`), rotating the
   stored refresh token. It is injected into Atlas's page head by `plugins/atlas/scripts/postinstall.js:104–109`.
   So Atlas has a *second, independent* renewal path that knows nothing about staleness.
3. **WebAPI's role table is derived from the token.** `api/WebAPI.ts:19–32` `syncUserRoles` calls WebAPI
   `GET /user/me` to "upsert `sec_user_role` from the user's JWT scopes", exposed at
   `routes/MeRouter.ts:192` (`POST /sync-webapi-roles`) and triggered by the portal at
   `OidcLoginSilent.tsx:58`. Consequence: **a renewed token alone does not update WebAPI** — the sync must
   be re-triggered after a renewal, or WebAPI keeps enforcing the old roles.

Design implications:

- After a successful renewal caused by a stale signal, the WebAPI role sync is re-triggered through the
  existing `/sync-webapi-roles` route. This is the only way the fix reaches Atlas's server side.
- Atlas's token-keeper must honour the same staleness signal, or Atlas will lag the portal by up to one hour.
  How that signal reaches a plain-ES script running inside Atlas is a design sub-question flagged in §11.
- For the revoke/delete path, `revokeGrantsTarget` determines whether Atlas's session dies with the portal's.
  Given portal and Atlas share one client, `firstParty` is expected to cover both — **to be confirmed by
  measurement**, not assumed.

## 8. Testing approach

**Blocking experiment (must precede everything).** Against the live stack: capture a user's access token,
apply a role change, force a `refresh_token` grant, decode the new token, and confirm the `roles` claim
reflects the change and `iat` advances. If refresh replays stale claims, this design is invalid as written
and the team must re-decide (§11).

**Unit / service level**

- Freshness comparison: fresh, stale, exact-boundary, missing `iat`, clock-skew allowance, both directions.
- `grant-roles-by-scopes`: reconciliation runs on a fresh token, is skipped on a stale one; PhysioNet
  carve-out unaffected.
- Stamping: each of the five flows stamps exactly the affected users; bulk operations stamp no bystanders;
  the stamp is transactional with the change.

**Integration**

- Stale signal appears on responses to a stale token and is absent for a fresh one.
- Revocation path against a real Logto: list sessions, revoke, confirm subsequent requests fail.
- M2M credentials actually carry permission for the sessions/grants operations.

**End-to-end (two actors, target session left open throughout)** — the ten cases enumerated in the
replacement issue at `docs/issues/2410-token-claim-invalidation-replacement.md`, in particular:
grant → silent; revoke → immediate + explained re-login; approve request → silent; delete user → token stops
working, not at `exp`; the reconciliation regression test (grant, then drive a `sync` request on the stale
token, assert the grant survives); the Atlas/WebAPI convergence case; renewal-failure injection; and a
no-change control asserting no extra prompts or token traffic.

**Non-functional**

- Renewal storm check: a bulk role operation over a large tenant must not renew tokens for unaffected users.
- The 800 ms request memoisation in `axios/request.ts:81` must not mask or duplicate the retry.

## 9. Migrations and configuration

**Migration.** One additive column on `usermgmt.user` (`authz_changed_at`, nullable timestamp) via the
existing knex migration set in `plugins/functions/alp-usermgmt-init/src/db/migrations/`. Nullable and
backward compatible: a null stamp means "never changed", so every existing token is fresh on deploy and no
user is force-renewed by the rollout itself. `UserField` / `UserRepository` gain the field.

**No Logto configuration change is required** in the primary design — `LOGTO__CUSTOM_JWT`,
`accessTokenTtl: 3600` and the refresh-token settings all stay as they are. This is a deliberate property:
the fix does not touch the token contract, so Atlas, WebAPI and any other claim consumer keep working
unchanged.

**Configuration.** Two independent flags are needed so the two halves can be enabled separately:
one for the stale-signal/silent-renewal behaviour, one for immediate revocation. Plus the clock-skew
allowance. Whether the revocation flag is global or per-environment is a §11 decision. The
Management-API credentials for revocation are the existing `alp-svc` M2M client — no new secret, subject to
the permission check in §8.

## 10. Alternative considered and rejected within Option A

**Explicit version claim in the token.** Add an `authz_version` claim via the custom-JWT script, and compare
claim to server value instead of `iat` to timestamp. The script *can* fetch external data — the commented
Entra variant at `docker-compose.yml:974` already performs an outbound `fetch` — so it is feasible.
Rejected because it changes the token contract for every consumer including Atlas and WebAPI, requires a
Logto configuration change and a way to keep the version reachable from the script, and buys nothing over
`iat`, which is already present and already decoded. Recorded here so the trade is not re-litigated silently.

## 11. Decisions still required

Nothing below is assumed anywhere in this spec.

1. **Blocking:** the refresh-token claim experiment (§8). I need either a test user's credentials or an
   authorized session for a test user to run it against the live stack. Until it passes, this design is
   provisional.
2. The **bounded interval** the team will accept for "promptly" in the acceptance criteria, and the
   **clock-skew allowance** for the freshness comparison.
3. **How the staleness signal reaches Atlas.** Atlas's token-keeper is a plain-ES script with its own token
   and its own refresh loop. Options exist (piggyback on the existing WebAPI sync, or have the keeper honour
   the same response header), but the choice affects Atlas packaging (`plugins/atlas/scripts/postinstall.js`)
   and I will not pick it unilaterally.
4. Whether **Atlas convergence ships in the same delivery** as the portal or immediately after.
5. Whether **`alp-svc`'s M2M role** already permits the sessions/grants operations, or whether a Logto role
   change is needed (verifiable by me with existing credentials if you want it closed empirically).
6. Whether forced logout on revoke applies to **Atlas sessions too** (i.e. `revokeGrantsTarget: firstParty`
   vs `all`), which is a product decision as much as a technical one.
7. Confirmation that **this worktree at `6c5b88f36`** is the intended base.

## 12. Non-goals

- Redesigning the D2E role or permission model.
- Changing the token contract: no new claims, no removal of `roles`, no change to how Atlas/WebAPI consume it.
- Lowering `accessTokenTtl` as the fix (mitigation only; it taxes every user and never closes the window).
- Per-request token introspection — D2E access tokens are self-contained JWTs verified offline against JWKS.
- An admin-facing session-management console.
- Any change to the sign-in experience of users whose authorization did not change.
- Moving authorization decisions off the claim entirely (the structural fix). Recorded as the long-term
  direction; explicitly out of scope here.
- Migrating off Logto or altering the deployed fork.

## 13. References

- Replacement issue draft: `docs/issues/2410-token-claim-invalidation-replacement.md`
- Original issue: <https://github.com/OHDSI/Data2Evidence/issues/2410>
- Logto Management API: <https://openapi.logto.io/>; deployed spec `http://alp-logto:3001/api/swagger.json`
- Logto — [validate access tokens](https://docs.logto.io/authorization/validate-access-tokens),
  [custom token claims](https://docs.logto.io/developers/custom-token-claims)
- Session/grant management introduced upstream in
  [Logto v1.38.0](https://github.com/logto-io/logto/releases/tag/v1.38.0); v1.40.0 states the admin
  user-session endpoints are unchanged; v1.40.1 is a `core-kit` bump only
