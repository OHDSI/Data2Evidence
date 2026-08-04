# Setting up PhysioNet as an Identity Provider

This guide walks through federating D2E logins to [PhysioNet](https://physionet.org)
as an OpenID Connect (OIDC) identity provider, so researchers sign in with their
PhysioNet accounts and their D2E dataset access (the `RESEARCHER` role) is
kept in sync with the datasets they are credentialed for on PhysioNet.

The integration has three moving parts:

1. **A Logto social connector** that federates to PhysioNet over OIDC *and* keeps
   the upstream PhysioNet access/refresh tokens around (stock `connector-oidc`
   discards them after verifying the id_token).
2. **A Logto JWT customizer** (`LOGTO__CUSTOM_JWT`) that copies those upstream
   tokens onto every D2E access token as the `physionet_access_token` /
   `physionet_refresh_token` claims.
3. **User management services** — `AutoProvisionService` (create a D2E user on first
   PhysioNet login) and `EntitlementsSyncService` (reconcile `RESEARCHER`
   membership against PhysioNet's dataset-access API on every request). When a
   request's token has no `physionet_access_token` (e.g. a silent SSO re-login,
   where the connector doesn't re-run), the sync redeems the
   `physionet_refresh_token` claim for a fresh access token server-side.

Because roles are read from the token (`USER_MGMT__ROLE_SOURCE=logto`), the token
issued on first login predates these grants and carries `roles:[]`. The portal's
silent-login container detects that and performs **one** top-level re-login
(a silent SSO round-trip) to obtain a token that includes the freshly granted
roles — no manual logout needed.

---

## How it fits together

```
Browser ──► Logto sign-in ──► PhysioNet /oauth/authorize  (user consents)
                │
                └─► Logto connector exchanges code at PhysioNet /oauth/token
                        │  keeps upstream access_token in globalThis.tokenMap
                        ▼
        Logto mints a D2E access token; LOGTO__CUSTOM_JWT injects
        physionet_access_token / physionet_refresh_token claims
                        │
                        ▼
        usermgmt grant-roles-by-scopes middleware, per request:
          • AutoProvisionService  → creates usermgmt.user + default group
                                     on first login (VIEWER)
          • EntitlementsSyncService → GET PhysioNet /oauth/dataset-access/
                                       grants/revokes RESEARCHER
```

The connector is `connector-physionet-oidc` (`connectorId: "physionet-oidc"`), a D2E
fork of Logto's OIDC connector that keeps the upstream PhysioNet access/refresh
tokens, writing them to `globalThis.tokenMap` for the JWT customizer to read. It
ships inside the `logto` image in every environment — no bind mount or extra
wiring, just set `LOGTO__CONNECTOR_CONFIG`.

> Because it is baked into the image, editing
> `services/alp-logto/connector-physionet-oidc/` changes nothing until the image is
> rebuilt.

---

## Prerequisites

- A running D2E stack (`npm run local -- start`, or `d2e -e start`). The
  `logto-post-init` container applies `LOGTO__CONNECTOR_CONFIG` and the
  sign-in experience on start; `usermgmt-init` seeds the default groups.
- Admin access to a PhysioNet instance where you can register an OAuth2/OIDC
  application — either the public `https://physionet.org` or a self-hosted
  `physionet-build` instance (see [Appendix A](#appendix-a-self-hosted-physionet-build-for-local-testing)).
- A **default tenant** whose `VIEWER` group already exists (seeded by
  `usermgmt-init`). Auto-provisioning assigns new users to this group, so its
  UUID is what you put in `USERMGMT__AUTO_PROVISION_DEFAULT_TENANT_ID`.

---

## Step 1 — Register a D2E OAuth2 application on PhysioNet

On the PhysioNet side, create an OAuth2 / OIDC application (PhysioNet admin →
OAuth Applications, or the equivalent in your `physionet-build` instance):

- **Client type:** Confidential
- **Grant type:** Authorization code
- **Algorithm:** `RS256` (PhysioNet signs the id_token with its OIDC RSA key)
- **Redirect URI:** `https://<your-d2e-host>/callback/physionet`
  - This must match the connector's `id` (`physionet`), **not** its `connectorId`.
    Logto builds the callback as `<logto-endpoint>/callback/<connector.id>`.
  - Local dev: `https://localhost:41100/callback/physionet`
- **Scopes:** `openid profile email` plus whatever scope PhysioNet requires to read
  credentialing/dataset access (e.g. `credentialing:read`).

Copy the generated **client ID** and **client secret** — you need them in Step 2.

Note the PhysioNet OIDC endpoints (paths are stable in `physionet-build`):

| Endpoint | Path |
|---|---|
| Authorization | `/oauth/authorize/` |
| Token | `/oauth/token/` |
| Userinfo | `/oauth/oidc/userinfo` |
| JWKS | `/oauth/jwks/` |
| Dataset access (used by entitlements sync) | `/oauth/dataset-access/?slug=<slug>&version=<version>` |
| Issuer | base URL, e.g. `https://physionet.org` |

---

## Step 2 — Configure the Logto connector (`LOGTO__CONNECTOR_CONFIG`)

Set `LOGTO__CONNECTOR_CONFIG` in your `.env` (or `.env.local`) to a single-line
JSON describing the PhysioNet connector. Example against a real PhysioNet host:

```jsonc
{
  "id": "physionet",
  "connectorId": "physionet-oidc",
  "config": {
    "clientId": "<physionet-client-id>",
    "clientSecret": "<physionet-client-secret>",
    "authorizationEndpoint": "https://physionet.org/oauth/authorize/",
    "tokenEndpoint": "https://physionet.org/oauth/token/",
    "userInfoEndpoint": "https://physionet.org/oauth/oidc/userinfo",
    "jwksEndpoint": "https://physionet.org/oauth/jwks/",
    "idTokenVerificationConfig": {
      "jwksUri": "https://physionet.org/oauth/jwks/",
      "issuer": "https://physionet.org"
    },
    "issuer": "https://physionet.org",
    "scope": "openid profile email credentialing:read",
    "responseType": "code",
    "tokenEndpointAuthMethod": "client_secret_post"
  },
  "syncProfile": true
}
```

Key points:

- `connectorId` is **`physionet-oidc`** (the D2E PhysioNet connector).
- `id` (`physionet`) is what the browser callback URI is keyed on:
  `<logto-endpoint>/callback/<id>`.
- `issuer` inside `idTokenVerificationConfig` must equal the `iss` PhysioNet stamps
  in its id_token, or verification fails.
- `syncProfile: true` copies name/email from PhysioNet into the Logto profile.

Also set on the `alp-logto` service (defaults shown; already in `docker-compose.yml`):

```dotenv
LOGTO__DISABLE_BASIC_AUTH=false          # true = hide username/password, force PhysioNet only
LOGTO__SOCIAL_SIGNIN_TARGETS=physionet   # CSV of connector targets to show on the sign-in screen
```

`alp-logto-post-init` reads `LOGTO__SOCIAL_SIGNIN_TARGETS` to decide which social
buttons appear. Set it explicitly, or the PhysioNet button won't render.

---

## Step 3 — Confirm the JWT customizer emits the PhysioNet token claims

`LOGTO__CUSTOM_JWT` (in `docker-compose.yml`, on the `alp-logto` service) already
returns the upstream tokens as claims:

```js
return {
  roles: scopes,
  physionet_access_token:  extra?.thirdPartyToken || null,
  physionet_refresh_token: extra?.thirdPartyRefreshToken || null,
};
```

The connector populates `extra.thirdPartyToken` via `globalThis.tokenMap`. No change
is needed unless you've overridden `LOGTO__CUSTOM_JWT` locally — if you have, make
sure it still emits `physionet_access_token` (the entitlements sync reads that
claim; the claim name is configurable via `USERMGMT__ENTITLEMENTS_TOKEN_CLAIM`).

---

## Step 4 — Enable auto-provisioning and entitlements sync (alp-usermgmt)

These are **off by default**. Set them on the `alp-usermgmt` service (via `.env` /
`.env.local`; the compose files already forward them):

```dotenv
# Create a D2E user row + default group on first PhysioNet login
USERMGMT__AUTO_PROVISION_ENABLED=true
USERMGMT__AUTO_PROVISION_CONNECTORS=physionet             # allowlist of connector targets (CSV)
USERMGMT__AUTO_PROVISION_DEFAULT_TENANT_ID=<tenant-uuid>  # falls back to APP__TENANT_ID

# Reconcile STUDY_RESEARCHER membership against PhysioNet on every request
USERMGMT__ENTITLEMENTS_SYNC_ENABLED=true
USERMGMT__ENTITLEMENTS_PHYSIONET_BASE_URL=https://physionet.org
USERMGMT__ENTITLEMENTS_TOKEN_CLAIM=physionet_access_token   # default
USERMGMT__ENTITLEMENTS_TIMEOUT_MS=10000                     # default

# Refresh-token fallback: when the token has no physionet_access_token, redeem
# physionet_refresh_token at PhysioNet's token endpoint. Use the SAME OAuth
# client as the connector (copy from LOGTO__CONNECTOR_CONFIG). The secret is
# required only for a confidential client (tokenEndpointAuthMethod=client_secret_*).
USERMGMT__ENTITLEMENTS_REFRESH_TOKEN_CLAIM=physionet_refresh_token  # default
USERMGMT__ENTITLEMENTS_PHYSIONET_CLIENT_ID=<physionet-client-id>
USERMGMT__ENTITLEMENTS_PHYSIONET_CLIENT_SECRET=<physionet-client-secret>
USERMGMT__ENTITLEMENTS_PHYSIONET_TOKEN_PATH=/oauth/token/   # default
```

> **Important:** alp-usermgmt runs as a function inside `trex`, which only forwards
> env vars listed in its `env` block in `plugins/functions/package.json`. Any new
> `USERMGMT__*` variable must be added there or the function won't see it (a
> `docker exec <trex> env` showing the value is **not** sufficient). The variables
> above are already listed; a bespoke one is not.

### What auto-provisioning does

On the first authenticated request for an unknown user, `AutoProvisionService`:

1. Checks the master switch (`USERMGMT__AUTO_PROVISION_ENABLED`).
2. Looks up the user's Logto social (then SSO) identities and requires at least
   one connector target to be in `USERMGMT__AUTO_PROVISION_CONNECTORS`.
   Username/password sign-ups have no identity and are skipped.
3. Creates the `usermgmt.user` row and assigns the `TENANT_VIEWER` group on the
   default tenant (the group must already exist — seeded by `alp-usermgmt-init`).
4. Runs the entitlements sync, then optionally calls the role hook (below).

A user who provisions but has no dataset entitlements yet lands with only
`TENANT_VIEWER` — enough to log in, but they'll see the **No Access** page until an
entitlement grants them a researcher role.

### Dataset mapping (entitlements sync)

For each D2E dataset the sync resolves a PhysioNet `slug/version`, then calls
`GET <base>/oauth/dataset-access/?slug=<slug>&version=<version>` with the user's
PhysioNet bearer token. `has_access: true` grants `STUDY_RESEARCHER` on that
dataset; `404` revokes it; any other error keeps current roles (fail-soft). Any
granted researcher role also implies `TENANT_VIEWER` on the configured tenant.

Configure the mapping with `USERMGMT__ENTITLEMENTS_DATASET_MAPPING` — a JSON object
keyed by the D2E `token_dataset_code`, valued with the PhysioNet `<slug>/<version>`:

```dotenv
USERMGMT__ENTITLEMENTS_DATASET_MAPPING={"demo":"demowave/1.0.0","mimic-iv":"mimiciv/2.2"}
```

If no mapping is configured the sync logs a warning and does nothing.

Datasets in this mapping are governed **only** by entitlements sync: the
token-scope researcher grant/revoke in `grant-roles-by-scopes` skips them, so it
can't revoke a PhysioNet-granted researcher role just because the (stale) token's
scopes don't list it. Non-mapped datasets keep the original token-scope behaviour.

### Optional external role hook

Auto-provision can call an external authority to enrich a new user's roles beyond
the `TENANT_VIEWER` default. Leave unset to skip:

```dotenv
USERMGMT__AUTO_PROVISION_ROLE_HOOK_URL=https://example.org/d2e/roles
USERMGMT__AUTO_PROVISION_ROLE_HOOK_SECRET=<bearer-token>
USERMGMT__AUTO_PROVISION_ROLE_HOOK_TIMEOUT_MS=5000
```

The hook receives `{ idpUserId, email, connectorId, accessToken }` and may return
`{ "roles": [...] }`; each returned role name is resolved to a tenant or system
group and added to the user. Hook failure is non-fatal (the user still keeps the
default role).

---

## Step 5 — Restart and apply

```bash
# Local dev
npm run local -- start

# or a standard stack
d2e -e start
```

On start, `alp-logto-post-init` re-applies the connector and sign-in experience.
Watch for a log line confirming the connector was registered:

```bash
docker logs alp-logto-post-init 2>&1 | grep -i "connector physionet"
# → "Social connector physionet created.." (first run) / "updated.." (subsequent runs)
```

---

## Step 6 — Verify

1. **Sign-in experience lists PhysioNet:**

   ```bash
   curl -sk https://localhost:41100/api/.well-known/sign-in-exp | grep -o 'physionet'
   ```

   PhysioNet should appear as a `socialConnector`.

2. **Login flow:** open the portal (`https://localhost:41100`), click the
   **PhysioNet** button, authenticate on PhysioNet, and confirm you land back in
   the portal. On first login `AutoProvisionService` creates the user row and the
   entitlements sync grants roles in Logto. Since the initial token predates those
   grants, the portal performs **one** automatic silent re-login (a top-level SSO
   round-trip via `/oidc/auth`) to fetch a token that includes them — a brief
   redirect on the very first login is expected, not an error.

3. **Entitlements:** for a dataset mapped to a PhysioNet `slug/version` that the
   user is credentialed for, confirm the `STUDY_RESEARCHER` role is granted. Check
   the `alp-usermgmt` logs for `[AutoProvision]` and `[Entitlements]` lines.

---

## Appendix A — Self-hosted `physionet-build` for local testing

To test the full flow without hitting `physionet.org`, run a local
[`physionet-build`](https://github.com/MIT-LCP/physionet-build) instance as the IdP.
Follow its own setup docs — the OIDC-provider and OAuth-application specifics are in
[`deploy/README.md`](https://github.com/MIT-LCP/physionet-build/blob/dev/deploy/README.md).
Highlights relevant to D2E:

- **Enable the OIDC provider** by generating the signing key and pointing the issuer
  at your local instance, in PhysioNet's `.env`:

  ```bash
  python manage.py generate_oidc_rsa_key --output oidc_key.pem
  ```

  ```dotenv
  OIDC_RSA_KEY_FILE=/path/to/oidc_key.pem
  OIDC_ISS_ENDPOINT=http://localhost:8000
  ```

  Set each OAuth application's algorithm to **RS256** and register the D2E app with
  redirect URI `https://localhost:41100/callback/physionet` (see Step 1).

- **Seed data** the datasets you want to test entitlements against (a credentialed
  project such as `demowave/1.0.0`), and map it in D2E via `portal.dataset` or the
  `USERMGMT__ENTITLEMENTS_DATASET_MAPPING` fallback.

When PhysioNet runs on the host while D2E runs in Docker, mind the **browser vs.
container** URL split. The browser resolves the *authorization* endpoint; the
containers resolve the *token/userinfo/jwks/dataset-access* endpoints. `alp-logto`
and `alp-usermgmt` in `docker-compose-local.yml` already map
`physionet-host:host-gateway` so containers can reach the host. Configure the
connector accordingly:

```jsonc
{
  "id": "physionet",
  "connectorId": "physionet-oidc",
  "config": {
    "clientId": "<local-client-id>",
    "clientSecret": "<local-client-secret>",
    "authorizationEndpoint": "http://localhost:8000/oauth/authorize/",
    "tokenEndpoint":        "http://physionet-host:8000/oauth/token/",
    "userInfoEndpoint":     "http://physionet-host:8000/oauth/oidc/userinfo",
    "jwksEndpoint":         "http://physionet-host:8000/oauth/jwks/",
    "idTokenVerificationConfig": {
      "jwksUri": "http://physionet-host:8000/oauth/jwks/",
      "issuer":  "http://localhost:8000"
    },
    "issuer": "http://localhost:8000",
    "scope": "openid profile email credentialing:read",
    "responseType": "code",
    "tokenEndpointAuthMethod": "client_secret_post"
  },
  "syncProfile": true
}
```

Point `USERMGMT__ENTITLEMENTS_PHYSIONET_BASE_URL` at a container-reachable address
too (`http://physionet-host:8000`). The `issuer` here (`http://localhost:8000`) must
match `OIDC_ISS_ENDPOINT` on the PhysioNet side, since that's the `iss` the browser
sees in the id_token.

---

## Environment variable reference

| Variable | Service | Purpose |
|---|---|---|
| `LOGTO__CONNECTOR_CONFIG` | alp-logto | PhysioNet social connector definition (JSON) |
| `LOGTO__SOCIAL_SIGNIN_TARGETS` | alp-logto | CSV of connector targets shown on sign-in |
| `LOGTO__DISABLE_BASIC_AUTH` | alp-logto | `true` hides username/password login |
| `LOGTO__CUSTOM_JWT` | alp-logto | Emits `physionet_access_token` / `_refresh_token` claims |
| `USERMGMT__AUTO_PROVISION_ENABLED` | alp-usermgmt | Create D2E user on first federated login |
| `USERMGMT__AUTO_PROVISION_CONNECTORS` | alp-usermgmt | Allowlisted connector targets (CSV) |
| `USERMGMT__AUTO_PROVISION_DEFAULT_TENANT_ID` | alp-usermgmt | Tenant for the default `TENANT_VIEWER` group (falls back to `APP__TENANT_ID`) |
| `USERMGMT__AUTO_PROVISION_ROLE_HOOK_URL` | alp-usermgmt | Optional external role-upgrade hook |
| `USERMGMT__AUTO_PROVISION_ROLE_HOOK_SECRET` | alp-usermgmt | Optional bearer token for the role hook |
| `USERMGMT__AUTO_PROVISION_ROLE_HOOK_TIMEOUT_MS` | alp-usermgmt | Role hook timeout (default `5000`) |
| `USERMGMT__ENTITLEMENTS_SYNC_ENABLED` | alp-usermgmt | Reconcile `STUDY_RESEARCHER` on each request |
| `USERMGMT__ENTITLEMENTS_PHYSIONET_BASE_URL` | alp-usermgmt | PhysioNet base URL for the entitlements API |
| `USERMGMT__ENTITLEMENTS_DATASET_MAPPING` | alp-usermgmt | JSON map `token_dataset_code → slug/version` |
| `USERMGMT__ENTITLEMENTS_TOKEN_CLAIM` | alp-usermgmt | JWT claim holding the upstream token (default `physionet_access_token`) |
| `USERMGMT__ENTITLEMENTS_REFRESH_TOKEN_CLAIM` | alp-usermgmt | JWT claim holding the upstream refresh token (default `physionet_refresh_token`) |
| `USERMGMT__ENTITLEMENTS_PHYSIONET_CLIENT_ID` | alp-usermgmt | OAuth client id for the refresh-token grant (same client as the connector) |
| `USERMGMT__ENTITLEMENTS_PHYSIONET_CLIENT_SECRET` | alp-usermgmt | OAuth client secret for the refresh-token grant (confidential clients only) |
| `USERMGMT__ENTITLEMENTS_PHYSIONET_TOKEN_PATH` | alp-usermgmt | PhysioNet token endpoint path for the refresh grant (default `/oauth/token/`) |
| `USERMGMT__ENTITLEMENTS_TIMEOUT_MS` | alp-usermgmt | Entitlements fetch timeout (default `10000`) |

See `env-vars.md` for the canonical list.
