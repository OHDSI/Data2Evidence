# Permission / role changes do not take effect until the user re-logs in (stale `roles` claim in the Logto access token)

Replacement draft for [OHDSI/Data2Evidence#2410](https://github.com/OHDSI/Data2Evidence/issues/2410)
("Permission - User access not applied until relogin", opened 2026-05-05 by CodyHuynh-QA, milestone v0.18-beta).

## Summary

Every authorization decision in D2E is ultimately driven by the `roles` claim that Logto bakes into the
user's JWT **access token at issuance time**. Admin actions write the new state to the portal database and
to Logto, but they do nothing to the tokens the affected user is already holding. The user therefore keeps
the old permission set until their access token expires (**1 hour**, configured) or until they sign out and
back in.

This affects at least:

- add user
- delete user
- edit a user's roles
- grant / revoke a researcher's dataset access
- approve a researcher's dataset access request

Reported against dataset "Second datamart synpuf"; a video (`PermissionNotApply_May05.mp4`) is attached to
the original issue.

## Expected vs. actual

- **Expected:** an authorization change made by an admin is effective for the target user on their next
  request (or at worst after a short, bounded delay), without the user having to log out.
- **Actual:** the change is invisible to the running session until the access token is renewed. Worst case
  is up to the full token lifetime (1 hour), or an explicit logout/login.

## Why this happens (confirmed in this repository)

1. **Roles are materialized into the access token by Logto's custom-JWT script.**
   `docker-compose.yml:975` (`LOGTO__CUSTOM_JWT`) defines `getCustomJwtClaims`, which walks
   `context.user.roles[].scopes[]` and returns them as the token's `roles` claim. The script runs during
   access-token generation, so the claim is a point-in-time snapshot of the user's Logto role/scope
   assignments.

2. **The access token lives for one hour.**
   `docker-compose.yml:979` — `LOGTO__RESOURCE: {"name":"alp-default","indicator":"https://alp-default","accessTokenTtl":3600}`.
   The same value is set by the post-init bootstrapper at
   `services/alp-logto/post-init/src/main.ts:201` (`accessTokenTtl: 3600`).
   The app client is configured with `refreshTokenTtlInDays: 14`, `alwaysIssueRefreshToken: true`,
   `rotateRefreshToken: true` (`docker-compose.yml:978`), so the browser session survives far longer than
   any individual access token.

3. **The backend trusts the token's claim — and syncs the database *from* it.**
   `plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts:35` decodes the bearer token and
   at line 52 reads `{ scope, roles, email }`. On a sync request it then *reconciles the portal database to
   match the token*: system roles at lines 130–132 and per-dataset researcher roles at lines 142–153, via
   `grantOrRevokeSystemRole` / `grantOrRevokeResearcherRole` (which call `addUserToGroup` /
   `removeUserFromGroup`, lines 239–254).
   Consequence: a stale token is not merely "not yet upgraded" — when this path runs it can **revert**
   freshly granted access back to whatever the old token says. (Severity of this second-order effect is
   flagged as a validation item below.)

4. **Admin mutations update Logto, but never touch the user's live session or tokens.**
   `plugins/functions/alp-usermgmt/src/services/UserGroupService.ts:239` (`syncRoleToLogto`) calls
   `assignRoleToUser` (line 263) / `removeRoleFromUser` (line 266). Its callers are the mutation paths in
   question: `UserGroupService.ts:127` (register user to group), `UserGroupService.ts:171` (withdraw user
   from group), `MemberService.ts:67` (add user), `UserGroupRouter.ts:335` (bulk assign).
   User lifecycle goes through `LogtoAPI.createUser` (`api/LogtoAPI.ts:118`), `deleteUser` (line 133),
   `activateUser` (line 141); dataset roles through `ensureDatasetRole` (line 271) / `removeDatasetRole`
   (line 296), called from `routes/DatasetRoleRouter.ts:29` and `:85`.
   **No code path in the repository calls any Logto session-, grant-, or token-revocation endpoint.**
   A repo-wide grep for `sessions`, `grants`, `revoke`, `revokeGrantsTarget`, and `/oidc/token/revocation`
   across `plugins/`, `services/`, and `internal/` returns no matches.

5. **The tokens cannot be invalidated by validation alone.** Logto's guidance is offline JWT validation via
   JWKS (`https://<endpoint>/oidc/jwks`) — see
   [Validate access tokens](https://docs.logto.io/authorization/validate-access-tokens). Introspection is
   documented only for **opaque** tokens
   ([Introspect tokens](https://docs.logto.io/docs/references/openid-connect/introspect-tokens/)), so a
   resource server checking a JWT locally has no way to learn that a role changed mid-lifetime.

Net effect: the change window is *by construction* up to `accessTokenTtl` (3600 s), and nothing in D2E
shortens it.

## What the deployed Logto actually supports (verified against the live instance)

Verified by reading the OpenAPI document served by the running Logto in this stack
(`http://alp-logto:3001/api/swagger.json`, HTTP 200, 226 paths) and cross-checked against
<https://openapi.logto.io/>:

| Method | Path | Summary (verbatim from the deployed spec) |
| --- | --- | --- |
| `GET` | `/api/users/{userId}/sessions` | "Retrieve all non-expired sessions for the user, including session metadata and interaction details when available." |
| `GET` | `/api/users/{userId}/sessions/{sessionId}` | Get user active session |
| `DELETE` | `/api/users/{userId}/sessions/{sessionId}` | "Revoke a specific user session by its ID, optionally revoking associated target grants and tokens." Optional query param `revokeGrantsTarget` with enum `all` \| `firstParty`. |
| `GET` | `/api/users/{userId}/grants` | "Retrieve all non-expired grants of the user." Optional `appType` filter (`firstParty` \| `thirdParty`). |
| `DELETE` | `/api/users/{userId}/grants/{grantId}` | "Revoke a specific grant and its associated token chain by grant ID. Also removes the matching session authorization entry for this grant from the related active session." |
| `PATCH` | `/api/resources/{id}` | Body includes `accessTokenTtl` — "The updated access token TTL in seconds". |
| `PATCH` | `/api/configs/oidc/session` | "Update the OIDC session configuration for the tenant." |

These admin session/grant endpoints were introduced in **Logto v1.38.0** (2026-03-31), whose changelog lists
`GET /users/:userId/sessions`, `GET /users/:userId/sessions/:sessionId`,
`DELETE /users/:userId/sessions/:sessionId`, plus a new `urn:logto:scope:sessions` user scope and
configurable OIDC session TTL. v1.40.0 (2026-05-29) added `isCurrent` to `GET /api/my-account/sessions` and
explicitly notes "The admin user-sessions endpoints are unchanged". v1.40.1 (2026-05-29) is a
`@logto/core-kit` version-bump patch only.

Also confirmed on the live instance's OIDC discovery document
(`http://alp-logto:3001/oidc/.well-known/openid-configuration`):

- `revocation_endpoint`: `http://alp-logto:3001/oidc/token/revocation` (RFC 7009 — client-driven, revokes a
  presented token, not an admin operation)
- `end_session_endpoint`: `http://alp-logto:3001/oidc/session/end` (RP-initiated logout)
- `introspection_endpoint`: `http://alp-logto:3001/oidc/token/introspection`
- `roles` is a supported claim, and `urn:logto:scope:sessions` is present in `scopes_supported`
- `grant_types_supported` includes `refresh_token`

So the platform *does* provide a supported, admin-side way to force the affected user's next request to
carry fresh claims — the capability simply is not wired into D2E today.

## Scope of the fix (what "done" looks like)

Acceptance criteria for closing this issue — deliberately stated as behaviour, not implementation:

1. After an admin performs any of the five mutations, the target user's effective permissions match the new
   state **within a bounded, documented delay** — target: on the user's next request, and in no case longer
   than a single short token refresh cycle.
2. The preferred outcome is **no forced logout**: the user's session survives and only the claims are
   refreshed. A forced re-authentication is an acceptable fallback if a claims-only refresh cannot be made
   reliable.
3. The stale-token reconciliation in `grant-roles-by-scopes.ts` must not undo an authorization change that
   an admin has just made.
4. Behaviour is verified end-to-end for all five mutations (see the repro below), not just for the
   dataset-access case in the original report.

## Reproduction

1. Sign in to the portal as a researcher; keep the session open.
2. As an admin, grant that researcher access to a dataset (e.g. "Second datamart synpuf") — or perform any
   of the other four mutations.
3. Without logging the researcher out, have them navigate to the dataset / retry the action.
4. **Observed:** access is still denied (or, for a revoke, still allowed). Decode the researcher's
   `access_token` — its `roles` claim still reflects the pre-change state, and `exp - iat` is 3600.
5. Log out and back in → the new permission applies immediately.

## Confirmed evidence index

Repository (worktree at commit `6c5b88f36`):

- `docker-compose.yml:975` — `LOGTO__CUSTOM_JWT` / `getCustomJwtClaims` builds the `roles` claim from
  `context.user.roles[].scopes[]`
- `docker-compose.yml:978` — app client: `refreshTokenTtlInDays: 14`, `alwaysIssueRefreshToken: true`,
  `rotateRefreshToken: true`
- `docker-compose.yml:979` — `accessTokenTtl: 3600` for resource `alp-default`
- `services/alp-logto/post-init/src/main.ts:201` — `accessTokenTtl: 3600`
- `plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts:35,52,129–153` — token decoded;
  `roles`/`scope` claims drive DB role grant/revoke
- `plugins/functions/alp-usermgmt/src/services/UserGroupService.ts:127,171,239,263,266` — role sync to Logto
- `plugins/functions/alp-usermgmt/src/services/MemberService.ts:54,67,92` — add/delete user
- `plugins/functions/alp-usermgmt/src/routes/DatasetRoleRouter.ts:29,85` — dataset role provisioning
- `plugins/functions/alp-usermgmt/src/api/LogtoAPI.ts:118,133,141,218–266,271,296` — the complete set of
  Logto Management API calls D2E makes; none of them touch sessions, grants, or token revocation
- `services/alp-logto/Dockerfile:1` — Logto image is a digest-pinned fork
  (`ghcr.io/data2evidence/logto-with-logto-schema@sha256:dde8283c…`)

External / runtime:

- Live deployed Logto OpenAPI: `http://alp-logto:3001/api/swagger.json` (session + grant endpoints present)
- Live OIDC discovery: `http://alp-logto:3001/oidc/.well-known/openid-configuration`
- <https://openapi.logto.io/> — session/grant revocation operations
- <https://docs.logto.io/authorization/validate-access-tokens> — JWKS/offline validation
- <https://docs.logto.io/docs/references/openid-connect/introspect-tokens/> — introspection covers opaque
  tokens
- <https://docs.logto.io/developers/custom-token-claims> — custom claims are merged at access-token
  generation
- Logto changelogs: [v1.38.0](https://github.com/logto-io/logto/releases/tag/v1.38.0),
  [v1.40.0](https://github.com/logto-io/logto/releases/tag/v1.40.0),
  [v1.40.1](https://github.com/logto-io/logto/releases/tag/v1.40.1)

## Open items requiring runtime validation

These are **not** confirmed and must be checked on a running environment before committing to an approach:

1. **Exact Logto version of the deployed image.** The image is digest-pinned
   (`services/alp-logto/Dockerfile:1`) and `/api/status` returns `204` with no version body; 1.40.1 is the
   reported version, not one this investigation could read off the instance. What *is* confirmed is that the
   deployed instance's own OpenAPI document already exposes the session and grant endpoints above — which is
   the operative fact, since those landed in 1.38.0.
2. **Does the D2E fork alter session/grant behaviour?** `services/alp-logto/to-replace/core/src/libraries/jwt-customizer.ts`
   is a patched core file; the fork's effect on session/grant handling was not reviewed.
3. **Refresh-token behaviour on role change.** With `rotateRefreshToken: true`, whether a refresh performed
   after a role change re-runs the custom-JWT script and yields updated `roles` needs to be observed
   directly (decode before/after).
4. **Blast radius of `DELETE /api/users/{userId}/sessions/{sessionId}` with `revokeGrantsTarget`.** Whether
   this forces a visible re-login or is transparent to a session with a live refresh token must be measured,
   including the effect on Atlas/WebAPI, which share the same Logto client.
5. **Whether the reconciliation in `grant-roles-by-scopes.ts` actively reverts new grants**, and under which
   request paths (`req.body.sync` is the gate at line 25). This determines whether the issue is "delayed" or
   "actively undone".
6. **Which of the five mutations, if any, already produce fresh claims by accident** (e.g. add-user, where
   the user has no prior token) — the report should be re-verified per mutation.
7. **Front-end token caching.** Whether the portal/gateway caches decoded claims or role maps in memory for
   longer than the token lifetime was not examined.

## Notes

- Lowering `accessTokenTtl` shrinks the window but does not close it, and trades correctness for token
  traffic; it is a mitigation, not a fix.
- The design constraint worth recording: as long as `roles` is a JWT claim validated offline via JWKS, *any*
  fix must either shorten the claim's lifetime, force new claims to be minted, or stop treating the claim as
  the source of truth for authorization decisions.
