# Disclaimer Logout and Trex Log Authorization — Implementation Plan

**Goal:** Ensure declining the legal disclaimer always proceeds to the portal's existing OIDC logout flow, and permit any authenticated portal user to record a disclaimer response at `POST /d2e/trex/log`.

**Scope:** Two focused changes: one portal UI handler and one Trex core compatibility-route authorization change. The Trex route is not implemented in this repository: `services/trex/Dockerfile.v2` explicitly states that the D2E compatibility layer is supplied by the pinned `ghcr.io/ohdsi/trexsql` base image. Updating its guard therefore requires the upstream Trex source/package version that owns the route, followed by an image-reference update in this repository.

## Investigation findings

### Portal flow

- `plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.tsx`
  - The Logout button calls `handleLogout`.
  - `handleLogout` currently awaits `logUserResponse(LogResponseType.DECLINED)` and only then calls `navigate(config.ROUTES.logout)`.
  - `logUserResponse` conditionally calls `api.trex.logResponse()` whenever `REACT_APP_LOG_DISCLAIMER` is true.
- `plugins/ui/apps/portal/src/axios/trex.ts`
  - `logResponse` sends `POST trex/log`; under the portal deployment base path this is `/d2e/trex/log`.
- `plugins/ui/apps/portal/src/containers/auth/Logout.tsx` and `containers/auth/oidc/oidc.ts`
  - `/logout` invokes `oidcLogout()`, which invokes `oidc.logoutAsync()`.
  - The configured OIDC end-session endpoint is used by the OIDC library when present.

Thus, the `POST /d2e/trex/log` request is an optional disclaimer audit event, not an OIDC endpoint. Its current 403 rejection aborts `handleLogout` before routing to `/logout`, so the OIDC session-end request never starts.

### Backend route ownership

- The portal only supplies the client request; no `/log` handler or role guard exists in `plugins/functions` or `services/trex` source.
- `services/trex/Dockerfile.v2` documents that Trex core—including its env-gated `D2E_COMPAT` routes—is provided by the pinned `ghcr.io/ohdsi/trexsql` base image, not vendored in D2E.
- The image pin is the `TREXSQL_REF` build argument at the top of `services/trex/Dockerfile.v2`.
- The reporter's `403 Forbidden: admin role required` identifies the upstream compatibility route guard as the second defect. The exact upstream file/symbol must be located in the TrexSQL source before modification; it is unavailable in this checkout.

## File structure

| Path | Change | Purpose |
| --- | --- | --- |
| `plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.tsx` | Modify | Make declined-response logging non-blocking so logout always routes to OIDC logout. |
| `plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.test.tsx` or established colocated test path | Add | Prove Logout navigates when the audit request rejects or never settles. |
| Upstream TrexSQL D2E compatibility route source | Modify upstream | Replace the admin-only guard on `POST /log` with authenticated-user access while retaining authentication. |
| Upstream TrexSQL route test | Add/modify upstream | Prove an authenticated non-admin user can post a disclaimer response and an unauthenticated request remains denied. |
| `services/trex/Dockerfile.v2` | Modify after upstream release | Pin D2E to the TrexSQL image version containing the authorization correction. |

## Task 1: Decouple Logout from optional audit logging

**Files:**
- Modify: `plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.tsx`
- Add or modify: focused test beside the dialog, following the portal test convention

1. Change only the declined-response path in `handleLogout` so it starts `logUserResponse(LogResponseType.DECLINED)` without awaiting it, and explicitly absorbs/report its rejection to avoid an unhandled promise rejection.
2. Call `navigate(config.ROUTES.logout)` immediately after starting the audit request.
3. Keep the Accept path unchanged: its existing accepted-state update, local-storage persistence, and audit behavior are outside the reported issue.
4. Add a focused test that mocks the Trex audit client and router navigation. Cover:
   - audit logging disabled: Logout navigates to `/logout`;
   - audit request rejected with 403: Logout still navigates to `/logout`;
   - audit request left pending: Logout still navigates without waiting.
5. Confirm the test asserts navigation to the existing `/logout` route rather than reimplementing OIDC endpoint construction in the dialog.

## Task 2: Correct the upstream Trex compatibility-route authorization

**Files:** upstream TrexSQL source and its tests; then `services/trex/Dockerfile.v2` in this repository.

1. Obtain the exact TrexSQL source matching the pinned `TREXSQL_REF` (or the next supported release branch) and search its D2E compatibility routes for the `POST /log` registration and the `admin role required` message.
2. Read the adjacent authentication/authorization middleware to distinguish authenticated-user checks from admin-role checks and preserve request identity/audit context.
3. Change this endpoint only from admin-only to authenticated-user access. Do not make it public, and do not broaden guards on unrelated Trex routes.
4. Add upstream route-level coverage for:
   - an authenticated researcher/non-admin token receives success for a valid disclaimer response;
   - an authenticated admin remains permitted;
   - unauthenticated requests remain rejected;
   - invalid request payloads retain their current validation behavior.
5. Release or select a TrexSQL image containing that change, then update `TREXSQL_REF` in `services/trex/Dockerfile.v2` to its immutable tag and digest.

## Task 3: Verification

1. Run the focused portal dialog test and the portal TypeScript check.
2. Build the portal and verify the served UI uses the new Logout behavior through the real D2E route: with disclaimer logging enabled and `POST /d2e/trex/log` forced to return 403, clicking Logout must still start the configured OIDC end-session redirect. Capture the browser result/screenshot.
3. Run the upstream Trex route tests for the authorization change.
4. Build the D2E Trex image from the updated base reference and exercise the running `POST /d2e/trex/log` endpoint using authenticated researcher and unauthenticated requests. Verify researcher success and unauthenticated rejection.
5. Re-run the disclaimer Logout browser flow against the updated stack. Verify both outcomes: the audit POST succeeds for a researcher, and logout redirects through the OIDC end-session endpoint.

## Risks and guardrails

- **Do not await optional audit logging before logout.** A 403, timeout, or network failure must not prevent users from ending their identity-provider session.
- **Do not remove authentication on `/log`.** The intended authorization is any authenticated user, not anonymous callers.
- **Do not alter Accept behavior.** Its behavior was not reported broken and remains intentionally outside the UI fix.
- **Do not duplicate the OIDC URL in the disclaimer component.** The existing `/logout` route and `oidcLogout()` remain the single logout implementation.
