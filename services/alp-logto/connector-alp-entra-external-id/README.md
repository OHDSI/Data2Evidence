# Microsoft Entra External ID connector

This connector lets Data2Evidence sign users in with Microsoft Entra External ID (CIAM, the customer-identity successor to Azure AD B2C). It performs a standard OIDC authorization-code flow against the CIAM authority `https://<tenant-subdomain>.ciamlogin.com/<tenant-id>/` and pulls profile data from the Microsoft Graph `/me` endpoint.

> Unlike the [`connector-alp-azuread`](../connector-alp-azuread/) workforce-tenant connector, this connector does **not** sync Azure groups to Logto roles. Roles must be managed inside Logto (or via a separate provisioning path).

**Table of contents**
- [Set up an app registration in your Entra External ID tenant](#set-up-an-app-registration-in-your-entra-external-id-tenant)
- [Fill in the configuration](#fill-in-the-configuration)
- [Configure your client secret](#configure-your-client-secret)
- [Config types](#config-types)
- [References](#references)

## Set up an app registration in your Entra External ID tenant

1. Sign in to the [Microsoft Entra admin center](https://entra.microsoft.com/) and switch to your External tenant.
2. Go to **Identity → Applications → App registrations** and click **New registration**.
3. Enter a name, choose the supported account type (typically **Accounts in this organizational directory only**), and add the redirect URI `${your_logto_endpoint}/callback/${connector_id}` — for example `https://foo.logto.app/callback/${connector_id}`. Use **Web** as the platform.
4. After creation, note the **Application (client) ID** and **Directory (tenant) ID** on the Overview page.

## Fill in the configuration

| Field             | Where to find it                                                                                       |
| ----------------- | ------------------------------------------------------------------------------------------------------ |
| `clientId`        | App registration → Overview → Application (client) ID                                                  |
| `clientSecret`    | App registration → Certificates & secrets → New client secret (see below)                              |
| `tenantSubdomain` | The host portion of your CIAM authority — e.g. `contoso` for `contoso.ciamlogin.com`                   |
| `tenantId`        | App registration → Overview → Directory (tenant) ID                                                    |
| `scopes`          | Optional. Comma-separated OAuth scopes; defaults to `openid,profile,email,offline_access` if omitted   |

The connector composes the authorize and token endpoints as:

```
https://<tenantSubdomain>.ciamlogin.com/<tenantId>/oauth2/v2.0/authorize
https://<tenantSubdomain>.ciamlogin.com/<tenantId>/oauth2/v2.0/token
```

## Configure your client secret

1. In the app registration, open **Certificates & secrets** and click **New client secret**.
2. Enter a description and choose an expiration.
3. Copy the secret **value** (only shown once) into the connector's `clientSecret` field and store it somewhere secure.

## Config types

| Name            | Type   |
| --------------- | ------ |
| clientId        | string |
| clientSecret    | string |
| tenantSubdomain | string |
| tenantId        | string |
| scopes          | string (optional) |

## References

* [Microsoft Entra External ID overview](https://learn.microsoft.com/en-us/entra/external-id/customers/overview-customers-ciam)
* [Register an app in an external tenant](https://learn.microsoft.com/en-us/entra/external-id/customers/how-to-register-ciam-app)
* [OAuth 2.0 authorization-code flow](https://learn.microsoft.com/en-us/entra/identity-platform/v2-oauth2-auth-code-flow)
