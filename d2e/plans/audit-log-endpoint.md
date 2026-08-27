# Disclaimer audit endpoint and logout-flow plan

## Goal

Replace the portal's upstream `POST /trex/log` disclaimer audit request with a D2E-owned `POST /system-portal/audit/log` endpoint. Preserve disclaimer audit recording for authenticated tenant viewers while ensuring that audit failures never prevent either disclaimer acceptance or OIDC logout.

## Current flow and cause

`plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.tsx` currently sends `{ response: "ACCEPTED" | "DECLINED" }` through `api.trex.logResponse()`, which posts to `trex/log`. Both handlers await this optional audit request. In `handleLogout`, navigation to the portal's existing `/logout` route happens only after the await, so a failed request prevents the OIDC logout route from mounting.

The current `/logout` route is the established path to `oidcLogout()` and its configured OIDC end-session endpoint. It should remain the logout mechanism.

## 1. Add a D2E-owned portal audit endpoint

### New files

Create `plugins/functions/portal/src/audit/` with:

- `audit.controller.ts`
  - Use `@Middleware(RequestContextMiddleware)` and `@Controller("system-portal/audit")`.
  - Add `@Post("log")` accepting a body with a `response` limited to `ACCEPTED` or `DECLINED`.
  - Obtain the authenticated subject from `RequestContextService.getAuthToken()?.sub`; do not accept a user identifier from the browser payload.
  - Delegate the audit write to `AuditService.logDisclaimerResponse(userId, response)`.
  - Return a successful response once the audit record is persisted.

- `audit.service.ts`
  - Provide `logDisclaimerResponse(userId, response)`.
  - Use the portal database conventions and an explicit persistence model to record the authenticated user, response value, and creation time.
  - Follow the existing request-context pattern used by portal services: derive the user identity from the decoded token subject (`sub`).

- `audit.module.ts`
  - Register `AuditController`, `AuditService`, and `RequestContextService`.
  - Import the database and transaction modules required by the chosen persistence implementation, mirroring feature modules such as `src/feature/feature.module.ts`.

### Application registration

Update `plugins/functions/portal/src/app.module.ts`:

- Import `AuditModule`.
- Add it to the root module `imports` list.

### Data model and migration

Before implementation, inspect the portal database migration/entity conventions and create the smallest dedicated audit persistence model required for disclaimer responses. The record must be keyed by authenticated user ID and contain the response value and timestamp. It must not reuse the upstream Trex endpoint or accept caller-supplied identity data.

## 2. Authorize the new endpoint

Update `plugins/functions/package.json` in both authorization structures:

1. Add `portal.audit.log` to the `TENANT_VIEWER` role's granted scopes.
2. Add a route-scope entry:

```json
{
  "path": "^/system-portal/audit/log$",
  "scopes": ["portal.audit.log"],
  "httpMethods": ["POST"]
}
```

This follows the functions gateway model: scopes are enforced from the manifest rather than by role decorators in the Danet controller. Tenant viewers, including the deployment's appropriately mapped authenticated portal users, receive only this narrowly scoped audit permission.

## 3. Move the portal client to the new endpoint

### System Portal API client

Update `plugins/ui/apps/portal/src/axios/system-portal.ts`:

- Import `LogResponseType` from the portal constants.
- Add `logAuditResponse(response: LogResponseType)` to `SystemPortal`.
- Send `POST` with `{ response }` to `system-portal/audit/log` using the existing `SYSTEM_PORTAL_URL` base URL.

### Remove the Trex client dependency

Update `plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.tsx`:

- Change `logUserResponse()` to call `api.systemPortal.logAuditResponse(logResponse)` rather than `api.trex.logResponse(logResponse)`.
- Preserve the existing feature flag behavior (`REACT_APP_LOG_DISCLAIMER`) unless tests establish that it is obsolete.
- Catch and report audit-request failures within `logUserResponse()` without rethrowing, so audit remains best-effort.
- Remove the now-unused `api.trex.logResponse()` path from this dialog. Once all repository references are confirmed absent, remove the obsolete `Trex.logResponse` method and its `LogResponseType` import from `plugins/ui/apps/portal/src/axios/trex.ts`.

## 4. Guarantee logout routing

In `DisclaimerDialog.tsx`:

- Keep `handleAccept` responsible for updating disclaimer state and local storage, then make its audit submission best-effort.
- Make `handleLogout` initiate the declined-response audit without allowing an audit error to interrupt control flow, then unconditionally execute:

```ts
navigate(config.ROUTES.logout);
```

The resulting route remains `/logout` -> `Logout` -> `oidcLogout()` -> the deployment's configured OIDC end-session endpoint. No direct Azure-specific endpoint construction is required.

## 5. Tests and verification

### Backend

- Add controller/service tests in `plugins/functions/portal/src/audit/` covering accepted and declined payloads, authenticated subject propagation, and audit persistence.
- Verify the route is registered at `POST /system-portal/audit/log`.
- Verify the function authorization manifest grants `portal.audit.log` to `TENANT_VIEWER` and requires it only for POST to the exact audit path.
- Exercise the endpoint through the running D2E edge runtime as an authenticated tenant viewer, confirming success and persisted/logged audit data; verify an unauthenticated request is rejected.

### Portal UI

- Add or update a focused `DisclaimerDialog` test to verify Accept submits `ACCEPTED` to `api.systemPortal.logAuditResponse` and continues when it rejects.
- Verify Logout submits `DECLINED`, navigates to `config.ROUTES.logout` when the audit request succeeds, rejects, and remains unresolved, and never invokes `api.trex.logResponse`.
- Run the portal type check and relevant unit tests.
- Build the portal, deploy the built resources to the served D2E route, and verify the real disclaimer flow: Accept closes the disclaimer; Logout reaches the OIDC session-end redirect even if the audit endpoint is unavailable.

## Files expected to change

- `plugins/functions/package.json`
- `plugins/functions/portal/src/app.module.ts`
- `plugins/functions/portal/src/audit/audit.controller.ts` (new)
- `plugins/functions/portal/src/audit/audit.service.ts` (new)
- `plugins/functions/portal/src/audit/audit.module.ts` (new)
- Portal audit DTO/entity/repository/migration files determined by the existing portal persistence conventions
- `plugins/ui/apps/portal/src/axios/system-portal.ts`
- `plugins/ui/apps/portal/src/axios/trex.ts` if it has no remaining `logResponse` callers
- `plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.tsx`
- Corresponding backend and portal tests
