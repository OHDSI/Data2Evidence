# Authorization changes are not enforced until the user's access token expires (up to 1 hour) or they log out

Replacement issue for [OHDSI/Data2Evidence#2410](https://github.com/OHDSI/Data2Evidence/issues/2410)
("Permission - User access not applied until relogin", opened 2026-05-05 by CodyHuynh-QA, milestone
v0.18-beta). Supersedes the earlier draft at this path.

Evidence base: repository worktree at commit `6c5b88f36`; the Logto instance deployed in this stack
(`alp-logto`), read live; and <https://openapi.logto.io/>.

---

## Context

D2E carries the user's authorization in the `roles` claim of a Logto-issued JWT access token. The claim is
computed once, when the token is minted, and the token is valid for one hour. Administrative authorization
changes update the portal database and Logto, but they do not affect the token the user's browser is already
holding. The user therefore keeps their old permissions until the token expires or they sign out and back
in.

### How the claim is produced (confirmed)

- `docker-compose.yml:975` — `LOGTO__CUSTOM_JWT` defines `getCustomJwtClaims`, which iterates
  `context.user.roles[].scopes[]` and returns them as the `roles` claim (plus `username`, `name`,
  `preferred_username`, `email`, PhysioNet passthrough tokens). It runs during access-token generation, so
  the claim is a snapshot of Logto role/scope state at that moment.
- `docker-compose.yml:979` — `LOGTO__RESOURCE: {"name":"alp-default","indicator":"https://alp-default","accessTokenTtl":3600}`.
- `services/alp-logto/post-init/src/main.ts:201` — the bootstrapper sets the same `accessTokenTtl: 3600`.
- `docker-compose.yml:978` — the `alp-app` client is configured with `refreshTokenTtlInDays: 14`,
  `alwaysIssueRefreshToken: true`, `rotateRefreshToken: true`. The browser session therefore long outlives
  any single access token.
- `services/alp-logto/Dockerfile:1` — Logto runs from a digest-pinned D2E fork
  (`ghcr.io/data2evidence/logto-with-logto-schema@sha256:dde8283c…`).
  `services/alp-logto/to-replace/core/src/libraries/jwt-customizer.ts` is a patched core file.

### How the claim is consumed (confirmed)

- `plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts:35` decodes the bearer token;
  line 52 destructures `{ scope, roles, email }`.
- On a request with `req.body.sync` truthy (gate at line 25, re-checked at line 122), the middleware
  **reconciles the portal database to match the token**: system roles at lines 130–132, per-dataset
  researcher roles at lines 142–153, through `grantOrRevokeSystemRole` / `grantOrRevokeResearcherRole`
  (lines 194–237) which call `addUserToGroup` / `removeUserFromGroup` (lines 239–254).
- Consequence: a stale token is not only "not yet upgraded" — on a sync request it can write the *old*
  permission set back over a change an administrator just made. The code already acknowledges one instance
  of this hazard in a comment at lines 135–136 (PhysioNet-managed datasets are excluded so that "token-scope
  sync revokes researcher roles it just granted").

### 1. Precise current-code mapping of the five administrative changes

| # | Change | Route (alp-usermgmt) | Service path | Logto Management API call | Session/token effect |
|---|---|---|---|---|---|
| 1 | Add user | `POST /` — `routes/UserRouter.ts:55` (bulk assign: `routes/UserGroupRouter.ts:365`) | `services/MemberService.ts:54` `createUser`, then `:67` `syncRoleToLogto(...,'assign')` after commit | `POST /api/users` (`api/LogtoAPI.ts:118`), then role assign | none |
| 2 | Delete user | `DELETE /:id` — `routes/UserRouter.ts:79` | `services/MemberService.ts:92` | `DELETE /api/users/{id}` (`api/LogtoAPI.ts:133`) | none — existing tokens keep working until `exp` |
| 3 | Edit user roles | `POST /register-tenant-roles` (`routes/UserGroupRouter.ts:125`), `POST /withdraw-tenant-roles` (`:253`), `POST /register-study-roles` (`:184`), `POST /withdraw-study-roles` (`:365`) | `services/UserGroupService.ts:127` `registerUserToGroup` → `:239` `syncRoleToLogto`; `:171` `withdrawUserFromGroup` → `:239` | `POST /api/users/{id}/roles` (`api/LogtoAPI.ts:247`), `DELETE /api/users/{id}/roles/{roleId}` (`:264`), scope ensure at `:28`–`:48` | none |
| 4 | Grant / revoke dataset researcher access | same `register-study-roles` / `withdraw-study-roles` routes; dataset role provisioning `POST` in `routes/DatasetRoleRouter.ts:29`, backfill `:85` | `services/UserGroupService.ts:127` / `:171` | `ensureDatasetRole` (`api/LogtoAPI.ts:271`), `removeDatasetRole` (`:296`), `assignRoleToUser` (`:223`), `removeRoleFromUser` (`:254`) | none |
| 5 | Approve access request | `PUT /:action` (`approve` \| `reject`) — `routes/StudyAccessRequestRouter.ts:89` | `services/StudyAccessRequestService.ts:58` `handleRequest` → `:83` `registerUserToGroup` → `syncRoleToLogto` | same as #3/#4 | none |

Supporting facts:

- `plugins/functions/alp-usermgmt/src/api/LogtoAPI.ts` is the complete inventory of Logto Management API
  calls D2E makes: `getUser` (`:77`), `getUserSsoIdentities` (`:92`), `createUser` (`:118`), `deleteUser`
  (`:133`), `activateUser` (`:141`), `updatePassword` (`:151`), `getUsers` (`:171`), `getRoles` (`:178`),
  `createRole` (`:197`), `getUserRoles` (`:218`), `assignRoleToUser` (`:223`), `removeRoleFromUser` (`:254`),
  `ensureDatasetRole` (`:271`), `removeDatasetRole` (`:296`).
- **No code path in the repository calls any session, grant, or token revocation endpoint.** A repo-wide
  grep across `plugins/`, `services/` and `internal/` for `sessions`, `grants`, `revoke`,
  `revokeGrantsTarget` and `/oidc/token/revocation` returns no matches.
- Client side: the portal uses `@axa-fr/react-oidc` 6.10.9 (`plugins/ui/apps/portal/package.json:21`).
  - `containers/auth/oidc/OidcApp.tsx:56` already listens for the `token_aquired` / `token_renewed` events
    and re-broadcasts the new access token as a `oidc:token_refreshed` window event (`:78`–`:87`).
  - `containers/auth/oidc/oidc.ts:4` `getOidcToken` calls `oidc.getValidTokenAsync()`; `:31` `oidcLogout`
    calls `oidc.logoutAsync()`.
  - `containers/auth/oidc/OidcLoginSilent.tsx:42`–`:53` already contains a **precedent for exactly this
    problem**: when the freshly minted token carries no `roles`, the portal triggers a full
    `login()` redirect once per session (guarded by the `d2e_first_login_role_refresh` sessionStorage key)
    to obtain claims. That is today's only claim-refresh mechanism, and it is a visible re-login.
  - The OIDC client configuration itself is injected at runtime via `REACT_APP_IDP_OIDC_CONFIG`
    (`OidcApp.tsx:22`); the same value is consumed by the Atlas login bridge
    (`plugins/atlas/login-bridge/bridge.js:30`), so portal and Atlas share one client.

### 2. Verified Logto API surface and compatibility caveats

Read live from the deployed instance's own OpenAPI document (`http://alp-logto:3001/api/swagger.json`,
HTTP 200, 739 406 bytes, 226 paths), and cross-checked against <https://openapi.logto.io/>. Descriptions
below are quoted from the deployed spec.

| Method | Path | Summary / behaviour (verbatim from the deployed spec) | Responses |
|---|---|---|---|
| `GET` | `/api/users/{userId}/sessions` | "Get user active sessions" — "Retrieve all non-expired sessions for the user, including session metadata and interaction details when available." | 200, 400, 401, 403, 500 |
| `GET` | `/api/users/{userId}/sessions/{sessionId}` | Get user active session | — |
| `DELETE` | `/api/users/{userId}/sessions/{sessionId}` | "Revoke a user session" — "Revoke a specific user session by its ID, optionally revoking associated target grants and tokens." Optional query param `revokeGrantsTarget`, enum `all` \| `firstParty`: "'all' revokes grants for every application authorized by this session. 'firstParty' revokes only first-party app grants; third-party app grants remain active." | 204, 400, 401, 403, 404, 500 |
| `GET` | `/api/users/{userId}/grants` | "Get user active grants" — "Retrieve all non-expired grants of the user." Optional `appType` filter, enum `firstParty` \| `thirdParty`. | 200, 400, 401, 403, 500 |
| `DELETE` | `/api/users/{userId}/grants/{grantId}` | "Revoke a user grant" — "Revoke a specific grant and its associated token chain by grant ID. Also removes the matching session authorization entry for this grant from the related active session. The grant must belong to the user." | 204, 400, 401, 403, 404, 500 |
| `PATCH` | `/api/resources/{id}` | Body includes `accessTokenTtl` — "The updated access token TTL in seconds". | — |
| `GET`/`PATCH` | `/api/configs/oidc/session` | "Update the OIDC session configuration for the tenant. This method performs a partial update." | 200, 400, 401, 403 |
| `GET`/`PUT`/`PATCH`/`DELETE` | `/api/configs/jwt-customizer/{tokenTypePath}` | JWT customizer management (the mechanism that produces the `roles` claim). | — |

The deployed spec declares `security: [{"OAuth2": ["all"]}]` — the Management API is reached with an M2M
client credential, which D2E already provisions (`alp-svc`, `docker-compose.yml:978`).

OIDC discovery on the same instance (`http://alp-logto:3001/oidc/.well-known/openid-configuration`)
confirms:

- `revocation_endpoint`: `http://alp-logto:3001/oidc/token/revocation` (RFC 7009; client-presented token,
  not an admin operation)
- `end_session_endpoint`: `http://alp-logto:3001/oidc/session/end` (RP-initiated logout)
- `introspection_endpoint`: `http://alp-logto:3001/oidc/token/introspection`
- `grant_types_supported` includes `refresh_token`
- `scopes_supported` includes `urn:logto:scope:sessions`; `claims_supported` includes `roles`

Upstream provenance: the admin session endpoints (`GET /users/:userId/sessions`,
`GET /users/:userId/sessions/:sessionId`, `DELETE /users/:userId/sessions/:sessionId`), the
`urn:logto:scope:sessions` scope and configurable OIDC session TTL were introduced in Logto **v1.38.0**
(2026-03-31). **v1.40.0** (2026-05-29) added `isCurrent` to `GET /api/my-account/sessions` and states "The
admin user-sessions endpoints are unchanged". **v1.40.1** (2026-05-29) is a `@logto/core-kit` version-bump
patch only, with no API change.

**Compatibility caveats**

1. The deployed spec self-reports `info.version: "Cloud"`, and `GET /api/status` returns `204` with no body.
   The running build's exact Logto version could not be read off the instance; 1.40.1 is the reported
   figure. What *is* directly verified is that the deployed instance's own spec already contains the session
   and grant operations above — which is the operative fact.
2. The image is a D2E fork with patched core files, including `jwt-customizer.ts`. The fork's effect on
   session/grant handling has not been reviewed.
3. There is **no bulk "revoke all sessions for a user" operation** in the deployed spec — only per-session
   and per-grant deletes. Enforcing a change means listing first, then deleting each entry.
4. `firstParty` vs `thirdParty` matters here: the portal and the Atlas login bridge share one client
   (`REACT_APP_IDP_OIDC_CONFIG`), so the choice of `revokeGrantsTarget` determines whether Atlas/WebAPI
   sessions are torn down alongside the portal's.
5. Revoking a *grant* explicitly kills "its associated token chain", i.e. the refresh token as well —
   the user cannot silently recover and must reauthenticate.
6. Whether the `alp-svc` M2M role carries the permissions needed for the sessions/grants operations is not
   verified.

### 3. Recommended behaviour, with tradeoffs

**Recommendation: make a fresh token the trigger, not a logout.** Concretely, the behaviour to aim for is —

1. The server records that a user's authorization changed (an authorization version / change marker written
   wherever the five mutations are applied).
2. The client learns that the token it holds predates the current authorization state.
3. The client performs a **silent token renewal** so the next request carries current claims. No visible
   sign-in, no lost work.

Why this is the least-impact option here, on the evidence:

- The client already has the machinery: `@axa-fr/react-oidc` with `refreshTokenTtlInDays: 14`,
  `alwaysIssueRefreshToken: true`, `rotateRefreshToken: true`, plus existing `token_renewed` handling in
  `OidcApp.tsx:78`–`:87`. Renewal is an established path in this codebase, not a new capability.
- It costs a renewal only for the users who were actually changed.
- It is the only option that satisfies "preferably without logout" for the four *additive* cases (add user,
  approve request, grant dataset access, add roles), which are the majority of the reported pain.

**The one fact that must be verified before committing to it:** that a `refresh_token` grant against this
deployment re-runs the custom-JWT script and yields *current* roles rather than replaying the original
claims. Logto documents custom claims as being assembled during access-token generation, which a refresh
performs — but this is a fork, and it must be measured, not assumed. If it turns out that refresh replays
stale claims, the silent-renewal route collapses and the fallback becomes the primary mechanism.

**Fallback, for the revocation direction and account deletion:** revoke the user's session (optionally with
`revokeGrantsTarget`) or the specific grant. This is verified to exist in the deployment and is
unambiguously immediate — at the cost of forcing that user to reauthenticate. This is the correct trade for
"access was withdrawn and must stop working now"; it is the wrong trade for "access was granted".

**Security tradeoffs**

- Silent renewal alone leaves a residual enforcement window equal to the detection latency. For revocations
  that window must be stated and accepted, or closed with the revocation fallback.
- A renewal-based design must not let a deleted or fully-revoked account keep re-minting tokens. Delete-user
  in particular should use the revocation path: today `MemberService.ts:92` removes the Logto user but
  leaves outstanding tokens valid until `exp`.
- The stale-token reconciliation in `grant-roles-by-scopes.ts:129`–`153` is itself a security problem
  independent of latency: an old token can revert a new grant. Any accepted design must close this, or the
  fix will be defeated by the platform's own sync path.
- An authorization-change signal exposed to clients must not disclose other users' roles or the existence of
  datasets the caller cannot see.
- Revocation must be scoped to the affected user and must not become a broad session sweep.

**UX tradeoffs**

- Silent renewal must be genuinely silent on the success path; intermittent fallback to a full redirect is
  worse than today's predictable behaviour. Note the existing precedent in `OidcLoginSilent.tsx:46`–`:52` is
  a *visible* redirect guarded by a sessionStorage flag — that pattern should not simply be widened.
- When a forced reauthentication is unavoidable, the user should be told why rather than dropped on a login
  screen mid-task.
- Administrators need feedback that a change has been applied and when it takes effect.
- Portal and Atlas share an OIDC client; a fix that refreshes the portal but strands the user in Atlas is
  not a complete fix.

---

## Scope

In scope:

- All five administrative changes listed in the mapping table.
- The propagation mechanism from "change applied server-side" to "user's requests carry current
  authorization".
- The stale-token reconciliation hazard in `grant-roles-by-scopes.ts` when a token predates an applied
  change.
- The immediate-enforcement path for revocations and account deletion.
- Portal and any component sharing the same OIDC client (Atlas login bridge / WebAPI).

Out of scope for this issue: the concrete design and code. This issue defines the behaviour, the evidence,
and the open questions; the mechanism is settled in design review after the validation tasks below close.

## Acceptance criteria

1. After any of the five administrative changes, the target user's effective permissions match the new state
   on their next request, and in no case later than an agreed bounded interval that is documented per
   environment.
2. For additive changes (add user, edit roles upward, grant dataset access, approve access request) the user
   is **not** forced to reauthenticate and does not lose in-progress work.
3. For revocations and account deletion, there is a documented, deployable way to make the withdrawal
   effective immediately; where that path forces reauthentication, the user is told why.
4. A request bearing a token that predates an applied change can no longer cause the portal database to be
   reverted to the token's stale permission set.
5. No authorization decision anywhere in the platform is made from claims older than the agreed interval.
6. An administrator can see from the product that a change has been applied and when it becomes effective.
7. Behaviour is verified for portal **and** for a component sharing the OIDC client (Atlas/WebAPI).
8. The worst-case enforcement window is documented, including what happens if renewal fails or the identity
   provider is unavailable.

## Non-goals

- Redesigning the D2E role or permission model.
- Migrating off Logto or changing the token format.
- Removing `roles` from the access token, or changing how third-party components consume it (worth
  recording as the long-term direction: as long as `roles` is a JWKS-verified JWT claim, *some* staleness
  window is structural — but that is a separate, much larger change).
- Building an administrator-facing session-management console.
- Changing the sign-in experience for users whose authorization did not change.
- Lowering `accessTokenTtl` as the fix. It shrinks the window, never closes it, and taxes every user
  regardless of whether anything changed. Acceptable only as an interim mitigation.
- Per-request token introspection. Introspection is documented for opaque tokens; D2E's access tokens are
  self-contained JWTs verified offline against JWKS.

## Implementation notes (constraints, not a design)

These are facts an implementer must work within; they are deliberately not a plan.

- The `roles` claim is produced by the Logto-side custom JWT script configured through `LOGTO__CUSTOM_JWT`
  (`docker-compose.yml:975`) and manageable via `/api/configs/jwt-customizer/{tokenTypePath}`. Changing what
  goes into the claim is a Logto configuration change, not an application change.
- All five mutations already funnel through two chokepoints —
  `UserGroupService.syncRoleToLogto` (`services/UserGroupService.ts:239`) and
  `MemberService` (`:54`, `:92`) — which is where a change marker would naturally be observable.
- `grant-roles-by-scopes.ts` currently treats the token as the source of truth for the database. Any fix
  that leaves this intact risks being silently undone.
- The Management API is M2M-authenticated (`security: [{"OAuth2": ["all"]}]`); D2E already holds an M2M
  client. Whether its role covers sessions/grants is unverified.
- There is no bulk session-revocation operation; enforcement means list-then-delete.
- `DELETE …/grants/{grantId}` destroys the token chain, so it always implies reauthentication.
  `DELETE …/sessions/{sessionId}` without `revokeGrantsTarget` is the narrower instrument.
- The portal's OIDC client config arrives at runtime through `REACT_APP_IDP_OIDC_CONFIG` and is shared with
  the Atlas login bridge, so client-side changes must be evaluated against both.

## Test cases

Each case is run with an administrator session and a separately signed-in target user, with the target
user's session left open throughout. "Effective" means observed through the product, and confirmed by
decoding the access token actually being sent.

1. **Grant dataset researcher access.** Admin grants access to a dataset. Target user, without logging out,
   opens the dataset. Expected: access is available within the bounded interval; token in use carries the
   new dataset scope; no sign-in prompt.
2. **Revoke dataset researcher access.** Admin revokes. Target user, without logging out, attempts to open
   the dataset. Expected: denied within the bounded interval; if the immediate-enforcement path is used, the
   reauthentication is explained rather than silent.
3. **Approve an access request.** Researcher raises a request; admin approves via `PUT /approve`. Expected:
   same as case 1, exercised through the approval route.
4. **Edit roles upward** (e.g. grant tenant/study admin) and **downward** (withdraw). Expected: the upward
   case is silent; the downward case is enforced within the bounded interval.
5. **Delete user.** Admin deletes a signed-in user. Expected: the deleted user's in-flight token stops
   working within the bounded interval — explicitly not "at `exp`". Verify no further requests succeed and
   no token can be re-minted.
6. **Add user with groups.** New user is created with group assignments and signs in. Expected: first token
   already carries the roles; the `OidcLoginSilent.tsx:46` re-login workaround is not triggered.
7. **Stale-token reconciliation.** Admin grants access; before the target's token refreshes, drive a request
   that reaches `grant-roles-by-scopes` with `sync` set. Expected: the new grant survives; the portal
   database is not reverted to the old token's permission set.
8. **Shared-client blast radius.** Repeat cases 1 and 2 with the user also active in Atlas/WebAPI. Expected:
   both surfaces converge on the same authorization state; neither is left stranded.
9. **Renewal failure.** Simulate the identity provider being unreachable at the moment of a change.
   Expected: documented behaviour — the user is not silently left with elevated permissions, and the failure
   mode is the documented one.
10. **No-change control.** A user whose authorization did not change performs normal work across a token
    expiry boundary. Expected: no extra prompts, no behaviour change, no measurable added token traffic
    beyond the normal renewal.

## Validation tasks (must close before design review)

1. Does a `refresh_token` grant on this deployment re-run the custom-JWT script and return **current**
   roles? Verify by decoding the access token before and after a renewal that follows a role change. This is
   the single item that decides between the primary recommendation and the fallback.
2. Exact Logto version of the deployed fork, and whether the fork alters session/grant handling
   (`services/alp-logto/to-replace/core/src/libraries/jwt-customizer.ts`).
3. Blast radius of `DELETE /api/users/{userId}/sessions/{sessionId}` with and without `revokeGrantsTarget`,
   measured against portal and Atlas/WebAPI.
4. Whether the `alp-svc` M2M role has permission for the sessions/grants operations.
5. The effective `REACT_APP_IDP_OIDC_CONFIG` per environment — scopes (including `offline_access`), silent
   renewal settings, and service-worker configuration.
6. Which request paths actually set `req.body.sync`, and therefore how often the reconciliation in
   `grant-roles-by-scopes.ts` runs in practice.
7. Whether any service caches decoded claims or a derived permission map beyond the token's lifetime.
8. Per-environment `accessTokenTtl` and refresh-token settings, to state the current worst-case window.

## References

- Original issue: <https://github.com/OHDSI/Data2Evidence/issues/2410>
- Logto Management API reference: <https://openapi.logto.io/>
- Deployed instance's own spec: `http://alp-logto:3001/api/swagger.json` (226 paths; the session and grant
  operations quoted above were read from it directly)
- Deployed OIDC discovery: `http://alp-logto:3001/oidc/.well-known/openid-configuration`
- Logto — validate access tokens (JWKS, offline verification):
  <https://docs.logto.io/authorization/validate-access-tokens>
- Logto — custom token claims (claims assembled at access-token generation):
  <https://docs.logto.io/developers/custom-token-claims>
- Logto — introspect tokens (opaque tokens):
  <https://docs.logto.io/docs/references/openid-connect/introspect-tokens/>
- Logto releases: [v1.38.0](https://github.com/logto-io/logto/releases/tag/v1.38.0) (session/grant
  management introduced), [v1.40.0](https://github.com/logto-io/logto/releases/tag/v1.40.0),
  [v1.40.1](https://github.com/logto-io/logto/releases/tag/v1.40.1)
- `@axa-fr/react-oidc` 6.10.9 — the portal's OIDC client (`plugins/ui/apps/portal/package.json:21`)
