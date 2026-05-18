## How to switch from Basic to Entra External ID Authentication on D2E

- In the Microsoft Entra admin center (External tenant)
  - Create or pick a "Sign-up and sign-in" user flow under **External Identities → User flows**.
  - On the user flow, **Application claims** → tick **Email Addresses** (without this, the id_token won't contain `email` and provisioning skips).
  - Register an application; redirect URI = `https://<fqdn>/callback/9mf50ajua2ye7pydd2nxk`.

- Set the following env values, then restart services:

  ```
  LOGTO__CONNECTOR_CONFIG=...                    # uncomment the entra-external-id-alp entry in docker-compose.yml
  IDP__AUTO_PROVISION_USERS=true
  AUTO_GRANT_RESEARCHER_BY_DATASET_CODES=demo_dm_Demo_dataset
  ENTRA_EXTID__CLIENT_ID=<application-client-id>
  ENTRA_EXTID__CLIENT_SECRET=<client-secret-value>
  ENTRA_EXTID__TENANT_SUBDOMAIN=<subdomain>      # e.g. contoso (becomes contoso.ciamlogin.com)
  ENTRA_EXTID__TENANT_ID=<directory-tenant-id-guid>
  ```

  - `LOGTO__CONNECTOR_CONFIG` seeds the connector via `services/alp-logto/post-init` — no admin-console action required.
  - `IDP__AUTO_PROVISION_USERS=true` lets user-mgmt create the user record on first sign-in (see [`grant-roles-by-scopes.ts`](../../../plugins/functions/alp-usermgmt/src/middlewares/grant-roles-by-scopes.ts)).
  - `AUTO_GRANT_RESEARCHER_BY_DATASET_CODES` (comma-separated) auto-grants researcher access on first sign-in and also implies `TENANT_VIEWER`.

- Granting additional roles
  - System roles (`ALP_SYSTEM_ADMIN`, `ALP_USER_ADMIN`, `ALP_DASHBOARD_VIEWER`) and extra dataset researcher access are managed via the user-mgmt UI after the user signs in for the first time. They persist across sign-ins (the middleware mirrors the user's actual Logto roles back into user-mgmt — there's no IdP-side group sync to override them).

# Microsoft Entra External ID connector

This connector lets Data2Evidence sign users in with **Microsoft Entra External ID** (CIAM — Microsoft's customer-identity product, marketed as the successor to Azure AD B2C). It runs a standard OIDC authorization-code flow against the CIAM authority `https://<tenantSubdomain>.ciamlogin.com/<tenantId>/` and reads identity from the `id_token` claims (no Microsoft Graph call).

> The connector does not map any IdP groups/claims to Logto roles. The token's identity (`sub`, `email`, `name`) is the only thing the connector consumes; roles are managed in Logto (or via the `alp-usermgmt` UI) and persist independently of sign-in.

**What the connector does on each sign-in**

1. Exchanges the authorization code at `https://<tenantSubdomain>.ciamlogin.com/<tenantId>/oauth2/v2.0/token` for tokens.
2. Decodes the `id_token` and resolves:
   - `id` ← `sub`
   - `email` ← `email` claim, falling back to `emails[0]` (B2C-style array) or `preferred_username` if it looks like an email.
   - `name` ← `name`, falling back to `given_name + family_name`, then `preferred_username`.
3. **Provisions the Logto user if missing.** Looks up by `primaryEmail` via the Logto Management API; if no match exists, creates the user and links the social identity to `target = "entra-external-id-alp"` with `userId = sub`. Username is derived from `name` (sanitized to `[a-zA-Z0-9_]`) with a timestamp suffix on collision. This step requires the M2M environment variables listed below.

**Table of contents**
- [Set up the External tenant](#set-up-the-external-tenant)
- [App registration](#app-registration)
- [Required environment variables](#required-environment-variables)
- [Connector configuration](#connector-configuration)
- [Config types](#config-types)
- [References](#references)

## Set up the External tenant

1. Sign in to the [Microsoft Entra admin center](https://entra.microsoft.com/) and switch to your External tenant (or create one via **Identity → Overview → Manage tenants → Create → External**).
2. **Identity → External Identities → User flows** → create a "Sign-up and sign-in" user flow.
3. On that user flow's **Application claims** page, tick **Email Addresses** (and any other claims you want emitted into the id_token). Without this, the id_token will not contain `email`/`emails`, and provisioning will skip with a `No email in id_token` warning.
4. Identity providers (e.g., email one-time passcode, Google, Apple) are configured under the user flow → **Identity providers**.

## App registration

1. **Identity → Applications → App registrations → New registration** in the External tenant.
2. Choose **Accounts in this organizational directory only** (or whatever supported-account-type matches your scenario).
3. Set the redirect URI to your Logto callback: `${LOGTO_PUBLIC_URL}/callback/${connector_id}`, e.g. `https://foo.example.com/callback/9mf50ajua2ye7pydd2nxk`. Platform = **Web**.
4. **Authentication → Implicit grant and hybrid flows** → leave both unchecked (the authorization-code flow is used).
5. **Certificates & secrets → New client secret** → copy the *value* (only shown once).
6. Associate the registered app with the user flow (User flow → **Applications** → Add).
7. Capture from **Overview**:
   - **Application (client) ID** → `clientId` config field.
   - **Directory (tenant) ID** (GUID) → `tenantId` config field.
   - The tenant's primary domain prefix (e.g. `contoso` from `contoso.onmicrosoft.com`) → `tenantSubdomain` config field. The connector composes the CIAM host as `<tenantSubdomain>.ciamlogin.com`.

## Required environment variables

The connector calls the Logto Management API to provision users on first sign-in. The following must be set on the Logto container:

| Variable                       | Purpose                                                                |
| ------------------------------ | ---------------------------------------------------------------------- |
| `LOGTO_API_M2M_CLIENT_ID`      | M2M client ID for `client_credentials` grant against `/oidc/token`.    |
| `LOGTO_API_M2M_CLIENT_SECRET`  | Matching client secret.                                                |
| `PORT`                         | Logto core port — used to build the in-container Management-API URL.  |

If any are missing, provisioning logs `Failed to obtain M2M API token; skipping provisioning.` and the user will not be auto-created.

## Connector configuration

Configure either via the Logto Admin Console (Connectors → Social → Microsoft Entra External ID) or via `LOGTO__CONNECTOR_CONFIG` consumed by `services/alp-logto/post-init`:

```json
{
  "id": "9mf50ajua2ye7pydd2nxk",
  "connectorId": "entra-external-id-alp",
  "config": {
    "clientId": "<application-client-id>",
    "clientSecret": "<client-secret-value>",
    "tenantSubdomain": "contoso",
    "tenantId": "<directory-tenant-id-guid>",
    "scopes": "openid,profile,email,offline_access,User.Read"
  },
  "syncProfile": true
}
```

The connector composes:

```
authorize: https://<tenantSubdomain>.ciamlogin.com/<tenantId>/oauth2/v2.0/authorize
token:     https://<tenantSubdomain>.ciamlogin.com/<tenantId>/oauth2/v2.0/token
```

## Config types

| Name              | Type              | Required | Notes                                                        |
| ----------------- | ----------------- | -------- | ------------------------------------------------------------ |
| `clientId`        | string            | yes      | Application (client) ID from the External-tenant app reg.    |
| `clientSecret`    | string            | yes      | Client secret value (not the secret ID).                     |
| `tenantSubdomain` | string            | yes      | The `<name>` in `<name>.ciamlogin.com`.                       |
| `tenantId`        | string (GUID)     | yes      | Directory (tenant) ID.                                       |
| `scopes`          | string (optional) | no       | Comma-separated. Defaults to `openid,profile,email,offline_access,User.Read`. |

## References

- [Microsoft Entra External ID overview](https://learn.microsoft.com/en-us/entra/external-id/customers/overview-customers-ciam)
- [Register an app in an external tenant](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-register-ciam-app)
- [OAuth 2.0 authorization-code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
- [Add application claims to a user flow](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-user-flow-add-application-claim)
