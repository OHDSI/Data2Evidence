# Disclaimer Logout and Audit Removal — Implementation Plan

## Goal

Ensure the disclaimer dialog never calls `POST /d2e/trex/log`, so both its **Accept** and **Logout** actions are independent of the optional audit endpoint. The Logout action must immediately enter the portal's existing OIDC logout path, which resolves the configured provider's end-session endpoint consistently across deployment types.

## Confirmed flow and exact locations

### Disclaimer dialog

**File:** `plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.tsx`

- Lines **5, 11, and 13** import the Trex API, `LogResponseType`, and runtime environment solely for disclaimer-response logging.
- Lines **16–21** define `logUserResponse()`. When `REACT_APP_LOG_DISCLAIMER` is true, it calls `api.trex.logResponse(logResponse)`, which sends the optional audit request.
- Lines **33–39**, `handleAccept`, persist the accepted state to context and local storage, then await `logUserResponse(LogResponseType.ACCEPTED)`.
- Lines **41–44**, `handleLogout`, await `logUserResponse(LogResponseType.DECLINED)` and only then navigate to `config.ROUTES.logout`.
- Lines **88–89** bind the Logout and Accept buttons to those handlers.

The awaited audit request is the cause of the Azure failure: a 403 from `/d2e/trex/log` rejects the handler before the Logout navigation runs.

### Existing OIDC logout path

- `plugins/ui/apps/portal/src/config/index.ts`: `config.ROUTES.logout` is `/logout`.
- `plugins/ui/apps/portal/src/apps/PrivateApp.tsx`, line **63**, maps `/logout` to `Logout`.
- `plugins/ui/apps/portal/src/containers/auth/Logout.tsx`, lines **4–6**, renders `OidcLogout`.
- `plugins/ui/apps/portal/src/containers/auth/oidc/OidcLogout.tsx`, lines **9–17**, clears portal state and calls `oidcLogout()`.
- `plugins/ui/apps/portal/src/containers/auth/oidc/oidc.ts`, lines **44–54**, calls `oidc.logoutAsync(`${window.location.origin}/d2e/portal`)`.

`oidc.logoutAsync()` uses the OIDC provider configuration, including its configured end-session endpoint. The disclaimer component must continue to navigate to this existing route; it must not construct an endpoint itself.

## Planned changes

### 1. Remove disclaimer audit logging completely

**Modify:** `plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.tsx`

1. Delete `logUserResponse()` (current lines 16–21).
2. Delete its now-unused imports: the Trex API client, `LogResponseType`, and `env` (current lines 5, 11, and 13).
3. Make `handleAccept` synchronous. Retain exactly the existing acceptance behavior:
   - clear feedback;
   - set disclaimer acceptance in context;
   - persist acceptance to local storage.
   Do not call `/trex/log`.
4. Make `handleLogout` synchronous and call only:
   ```ts
   navigate(config.ROUTES.logout);
   ```
   Do not call, await, retry, or fire-and-forget `/trex/log`.
5. Leave the dialog rendering, content loading, and button labels unchanged.

### 2. Preserve the established OIDC end-session route

**No change expected:**
- `plugins/ui/apps/portal/src/config/index.ts`
- `plugins/ui/apps/portal/src/apps/PrivateApp.tsx`
- `plugins/ui/apps/portal/src/containers/auth/Logout.tsx`
- `plugins/ui/apps/portal/src/containers/auth/oidc/OidcLogout.tsx`
- `plugins/ui/apps/portal/src/containers/auth/oidc/oidc.ts`

The plan deliberately preserves `/logout` as the single portal entry point for logout. It clears portal state and calls `oidc.logoutAsync()`, allowing every deployment to use its OIDC configuration's end-session URL. This corrects the apparent URL inconsistency by removing the preceding `/d2e/trex/log` request that intercepted the Azure flow.

### 3. Add focused regression coverage

**Add:** a colocated disclaimer-dialog test following the portal's React Testing Library conventions, for example `plugins/ui/apps/portal/src/containers/shared/Legal/DisclaimerDialog.test.tsx`.

Mock the context, translation, router navigation, and dialog/button components as needed. Cover:

1. Clicking **Logout** calls navigation with `/logout` immediately.
2. Clicking **Logout** makes no request through `api.trex.logResponse` (or the Trex API client).
3. Clicking **Accept** sets the accepted context state and persists local acceptance.
4. Clicking **Accept** makes no request through `api.trex.logResponse`.

The tests should prove the removal of the dependency rather than simulate a 403 from an endpoint that is no longer part of this dialog flow.

## Verification

1. Run the new focused dialog test with the portal test command from `plugins/ui/apps/portal`.
2. Run the portal TypeScript check: `npx tsc --noEmit` from `plugins/ui/apps/portal`.
3. Build the portal: `npm run build` from `plugins/ui/apps/portal`.
4. Use the D2E UI verification flow against the served portal route to confirm:
   - Accept closes the disclaimer and persists local acceptance without a `/d2e/trex/log` request.
   - Logout routes through `/logout` and starts the OIDC session-end redirect without a `/d2e/trex/log` request.
5. Inspect the browser network activity or route result to verify that neither action invokes the removed audit endpoint.

## Scope boundaries

- Do **not** modify the upstream TrexSQL `POST /log` authorization guard as part of this change. The portal will no longer call that optional audit route from either disclaimer action.
- Do **not** change the accepted-disclaimer storage behavior.
- Do **not** duplicate or hard-code an OIDC end-session URL in `DisclaimerDialog.tsx`; the existing `/logout` route remains the canonical flow.
